import express from "express";
import dns from "dns";
import net from "net";
import http from "http";
import https from "https";
import { GoogleGenAI } from "@google/genai";

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Simple in-memory sliding-window limiter: max requests per IP within a time window.
// Good enough for a single-instance deployment; resets on redeploy/restart.
function createRateLimiter(maxRequests: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
    const now = Date.now();
    const timestamps = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    if (timestamps.length >= maxRequests) {
      return res.status(429).json({ error: "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút." });
    }
    timestamps.push(now);
    hits.set(ip, timestamps);
    next();
  };
}

const urlScanRateLimiter = createRateLimiter(10, 60_000);

export function createApiApp() {
  const app = express();

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI Quiz Parser from file content or raw text
  app.post("/api/ai/parse-quiz-file", async (req, res) => {
    try {
      const { rawText, fileName, images } = req.body;

      if (!rawText || typeof rawText !== "string") {
        return res.status(400).json({ error: "Nội dung tệp rỗng hoặc không hợp lệ" });
      }
      const imageList: string[] = Array.isArray(images) ? images.filter((i) => typeof i === "string") : [];

      // Prefer local rule-based parsing first — instant, free, no external API call.
      const localQuiz = parseRawQuizLocally(rawText, fileName, imageList);
      const isLowConfidence =
        localQuiz.questions.length === 0 ||
        (localQuiz.questions.length === 1 &&
          localQuiz.questions[0].explanation === "Được tạo tự động từ tài liệu đính kèm.");

      if (!isLowConfidence) {
        return res.json({ success: true, data: localQuiz, source: "local-parser" });
      }

      // Local parser couldn't find a clear "Câu N. / A. B. C. D." structure — try Gemini AI as a fallback.
      const ai = getGeminiClient();

      if (ai) {
        try {
          const prompt = `Bạn là một trợ lý ảo phân tích tài liệu đề thi chuyên nghiệp.
Hãy phân tích nội dung câu hỏi và đáp án từ tệp văn bản sau (tên tệp: "${fileName || "quiz_file.txt"}") và chuyển đổi thành cấu trúc JSON chuẩn cho đề thi trắc nghiệm công nghệ:

Nội dung thô:
\`\`\`
${rawText.replace(/〔IMG:\d+〕/g, "[hình ảnh]").slice(0, 15000)}
\`\`\`

Yêu cầu trả về đúng định dạng JSON như sau (không kèm markdown thừa):
{
  "title": "Tên đề thi phù hợp với nội dung",
  "description": "Mô tả ngắn gọn về đề thi",
  "category": "Danh mục (ví dụ: Trí tuệ Nhân tạo, An ninh Mạng, Lập trình Web, Điện toán Đám mây, Hệ thống)",
  "difficulty": "Cơ bản" | "Trung bình" | "Nâng cao" | "Chuyên gia",
  "durationMinutes": 15,
  "passScorePercent": 70,
  "questions": [
    {
      "id": "q1",
      "question": "Nội dung câu hỏi",
      "codeSnippet": "đoạn code nếu có (hoặc để trống)",
      "codeLanguage": "javascript/python/sql...",
      "options": [
        {"id": "A", "text": "Lựa chọn A"},
        {"id": "B", "text": "Lựa chọn B"},
        {"id": "C", "text": "Lựa chọn C"},
        {"id": "D", "text": "Lựa chọn D"}
      ],
      "correctOptionId": "A",
      "explanation": "Giải thích chi tiết vì sao đáp án này đúng"
    }
  ]
}`;

          const response = await ai.models.generateContent({
            model: "gemini-3.7-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
            },
          });

          const text = response.text || "{}";
          const parsed = JSON.parse(text);
          parsed.warning = detectMissingContentWarning(parsed.questions || []);
          return res.json({ success: true, data: parsed, source: "gemini" });
        } catch (geminiErr: any) {
          console.warn("Gemini fallback also failed, returning local best-effort result:", geminiErr?.message);
        }
      }

      // Neither local parser nor AI found real structure — return the local best-effort result anyway.
      return res.json({ success: true, data: localQuiz, source: "local-parser" });
    } catch (err: any) {
      console.error("Error in parse-quiz-file:", err);
      res.status(500).json({ error: "Không thể phân tích tệp đề thi", details: err?.message });
    }
  });

  // AI Quiz Generator by Topic
  app.post("/api/ai/generate-quiz", async (req, res) => {
    try {
      const { topic, count = 5, difficulty = "Trung bình" } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.status(400).json({
          error: "Chưa cấu hình GEMINI_API_KEY, vui lòng sử dụng tính năng tạo đề thủ công hoặc nhập từ tệp.",
        });
      }

      const prompt = `Tạo một bộ đề thi trắc nghiệm công nghệ chuyên nghiệp về chủ đề "${topic}".
Số lượng câu hỏi: ${count} câu.
Mức độ: ${difficulty}.
Yêu cầu: Câu hỏi thực tế, sắc bén, có code snippet nếu là chủ đề lập trình, có 4 lựa chọn A, B, C, D, chỉ rõ đáp án đúng và giải thích cặn kẽ tại sao đúng.

Định dạng JSON yêu cầu:
{
  "title": "Đề thi: ${topic}",
  "description": "Bộ câu hỏi kiểm tra kiến thức về ${topic}",
  "category": "Công nghệ số",
  "difficulty": "${difficulty}",
  "durationMinutes": ${Math.max(5, count * 2)},
  "passScorePercent": 70,
  "questions": [
    {
      "id": "q1",
      "question": "Nội dung câu hỏi",
      "codeSnippet": "mã nguồn nếu có",
      "codeLanguage": "typescript",
      "options": [
        {"id": "A", "text": "Lựa chọn A"},
        {"id": "B", "text": "Lựa chọn B"},
        {"id": "C", "text": "Lựa chọn C"},
        {"id": "D", "text": "Lựa chọn D"}
      ],
      "correctOptionId": "A",
      "explanation": "Giải thích chi tiết"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      const parsed = JSON.parse(text);
      return res.json({ success: true, data: parsed });
    } catch (err: any) {
      console.error("Error in generate-quiz:", err);
      res.status(500).json({ error: "Không thể tạo đề thi bằng AI", details: err?.message });
    }
  });

  // AI Article Summarizer & Key Insights
  app.post("/api/ai/summarize-article", async (req, res) => {
    try {
      const { title, content } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        // Fallback simple summary
        return res.json({
          success: true,
          data: {
            summary: "Bài viết cung cấp góc nhìn toàn diện về xu hướng công nghệ hiện đại, kiến trúc hệ thống và giải pháp triển khai thực tế.",
            keyPoints: [
              "Phân tích chuyên sâu về kiến trúc và nguyên lý vận hành cốt lõi.",
              "Đánh giá ưu nhược điểm so với các mô hình truyền thống.",
              "Khuyến nghị phương pháp áp dụng thực tiễn cho kỹ sư và nhà phát triển."
            ],
            techTerms: [
              { term: "Scalability", meaning: "Khả năng mở rộng hệ thống khi lượng tải tăng" },
              { term: "Latency", meaning: "Độ trễ phản hồi trong xử lý dữ liệu" }
            ]
          }
        });
      }

      const prompt = `Phân tích và tóm tắt bài viết công nghệ sau:
Tiêu đề: ${title}
Nội dung:
${content.slice(0, 10000)}

Hãy trả về JSON với cấu trúc:
{
  "summary": "Tóm tắt ngắn gọn 2-3 câu giá trị cốt lõi nhất",
  "keyPoints": ["Điểm cốt lõi 1", "Điểm cốt lõi 2", "Điểm cốt lõi 3", "Điểm cốt lõi 4"],
  "techTerms": [
    {"term": "Thuật ngữ 1", "meaning": "Ý nghĩa ngắn gọn"},
    {"term": "Thuật ngữ 2", "meaning": "Ý nghĩa ngắn gọn"}
  ],
  "actionableTakeaways": "Hành động thực tế gợi ý cho kỹ sư phần mềm"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      const parsed = JSON.parse(text);
      return res.json({ success: true, data: parsed });
    } catch (err: any) {
      console.error("Error in summarize-article:", err);
      res.status(500).json({ error: "Lỗi tóm tắt bài viết", details: err?.message });
    }
  });

  // URL Security Scanner — analyzes a user-supplied link for phishing/scam indicators.
  // This route makes real outbound network requests on the caller's behalf, so it gets
  // its own per-IP rate limit to stop it being abused as an anonymous scanning relay.
  app.post("/api/security/analyze-url", urlScanRateLimiter, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string" || !url.trim()) {
        return res.status(400).json({ error: "Vui lòng nhập địa chỉ URL cần kiểm tra." });
      }
      const result = await analyzeUrlSecurity(url.trim());
      return res.json({ success: true, data: result });
    } catch (err: any) {
      console.error("Error in analyze-url:", err);
      res.status(500).json({ error: "Không thể phân tích URL", details: err?.message });
    }
  });

  return app;
}

// ==========================================================
// URL SECURITY SCANNER — heuristic phishing/scam analysis
// ==========================================================

const URL_SHORTENER_DOMAINS = new Set([
  "bit.ly", "tinyurl.com", "is.gd", "t.co", "ow.ly", "buff.ly", "shorturl.at",
  "cutt.ly", "rebrand.ly", "v.gd", "s.id", "rb.gy", "shrtco.de", "tiny.cc",
]);

const SUSPICIOUS_TLDS = new Set([
  "tk", "ml", "ga", "cf", "gq", "xyz", "top", "work", "click", "link", "buzz", "icu", "info", "loan",
]);

// brand keyword -> list of its legitimate registrable domains
const OFFICIAL_BRAND_DOMAINS: Record<string, string[]> = {
  vietcombank: ["vietcombank.com.vn"],
  techcombank: ["techcombank.com.vn", "techcombank.com"],
  bidv: ["bidv.com.vn"],
  agribank: ["agribank.com.vn"],
  vpbank: ["vpbank.com.vn"],
  sacombank: ["sacombank.com.vn"],
  mbbank: ["mbbank.com.vn"],
  vietinbank: ["vietinbank.vn"],
  momo: ["momo.vn"],
  zalopay: ["zalopay.vn"],
  zalo: ["zalo.me"],
  shopee: ["shopee.vn"],
  tiki: ["tiki.vn"],
  lazada: ["lazada.vn"],
  facebook: ["facebook.com", "fb.com"],
  paypal: ["paypal.com"],
  apple: ["apple.com"],
  microsoft: ["microsoft.com", "live.com", "outlook.com"],
  google: ["google.com", "gmail.com"],
  amazon: ["amazon.com"],
  netflix: ["netflix.com"],
  vnpay: ["vnpay.vn"],
};

function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    if (p[0] === 10) return true;
    if (p[0] === 127) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true; // CGNAT 100.64.0.0/10
    if (p[0] >= 224) return true; // multicast/reserved
    if (p[0] === 0) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("fe80")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local fc00::/7
    if (lower.startsWith("::ffff:")) {
      const v4 = lower.split(":").pop() || "";
      if (net.isIPv4(v4)) return isPrivateOrReservedIp(v4);
    }
    return false;
  }
  return false;
}

// Node's WHATWG URL keeps brackets around IPv6 literals in `hostname` (e.g. "[::1]") —
// strip them so net.isIP()/dns lookups see the bare address instead of silently mismatching.
function stripIpv6Brackets(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

async function resolveHostIps(hostname: string): Promise<string[]> {
  const bare = stripIpv6Brackets(hostname);
  if (net.isIP(bare)) return [bare];
  const records = await dns.promises.lookup(bare, { all: true, verbatim: true });
  return records.map((r) => r.address);
}

// Public suffixes with two significant labels — a naive "last 2 labels" split would
// otherwise collapse e.g. "vietcombank.com.vn" and "evil-clone.com.vn" to the same
// "com.vn" root and miss a redirect between two different real sites.
const COMPOUND_SUFFIXES = new Set([
  "com.vn", "net.vn", "org.vn", "edu.vn", "gov.vn", "biz.vn", "info.vn", "name.vn",
  "co.uk", "org.uk", "gov.uk", "ac.uk",
  "com.au", "net.au", "org.au",
  "co.jp", "co.kr", "com.sg", "com.br", "co.in",
]);

function rootDomainOf(hostname: string): string {
  const labels = stripIpv6Brackets(hostname).split(".").filter(Boolean);
  if (labels.length <= 2) return labels.join(".");
  const lastTwo = labels.slice(-2).join(".");
  if (COMPOUND_SUFFIXES.has(lastTwo)) return labels.slice(-3).join(".");
  return lastTwo;
}

interface ProbeResult {
  status: number;
  location: string | null;
  cert: {
    issuer: string | null;
    subject: string | null;
    validFrom: string | null;
    validTo: string | null;
    authorized: boolean | null;
  } | null;
}

function probeUrlOnce(targetUrl: string, timeoutMs: number): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl);
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: (u.pathname || "/") + (u.search || ""),
        method: "HEAD",
        timeout: timeoutMs,
        rejectUnauthorized: false,
        headers: { "User-Agent": "LongHoaSo-SecurityScanner/1.0" },
      },
      (r) => {
        const socket: any = r.socket;
        const rawCert = u.protocol === "https:" && socket?.getPeerCertificate ? socket.getPeerCertificate() : null;
        const cert =
          rawCert && Object.keys(rawCert).length > 0
            ? {
                issuer: rawCert.issuer?.O || rawCert.issuer?.CN || null,
                subject: rawCert.subject?.CN || null,
                validFrom: rawCert.valid_from || null,
                validTo: rawCert.valid_to || null,
                authorized: typeof socket.authorized === "boolean" ? socket.authorized : null,
              }
            : null;
        resolve({ status: r.statusCode || 0, location: (r.headers.location as string) || null, cert });
        r.resume();
      }
    );
    req.on("timeout", () => req.destroy(new Error("Kết nối tới máy chủ quá thời gian chờ (timeout).")));
    req.on("error", reject);
    req.end();
  });
}

async function analyzeUrlSecurity(rawInput: string) {
  const reasons: string[] = [];
  let score = 0;

  let normalized = rawInput.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(normalized)) {
    normalized = "https://" + normalized;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return {
      inputUrl: rawInput,
      normalizedUrl: normalized,
      hostname: "",
      resolvedIps: [],
      finalUrl: "",
      redirectChain: [],
      httpStatus: null,
      tls: null,
      riskScore: 100,
      verdict: "Không xác định" as const,
      reasons: ["Địa chỉ URL không đúng định dạng."],
      checkedAt: new Date().toISOString(),
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      inputUrl: rawInput,
      normalizedUrl: normalized,
      hostname: parsed.hostname,
      resolvedIps: [],
      finalUrl: parsed.toString(),
      redirectChain: [],
      httpStatus: null,
      tls: null,
      riskScore: 100,
      verdict: "Không xác định" as const,
      reasons: [`Chỉ hỗ trợ phân tích giao thức HTTP/HTTPS (nhận được "${parsed.protocol}").`],
      checkedAt: new Date().toISOString(),
    };
  }

  if (/^https?:\/\/[^/?#]*@/i.test(normalized)) {
    reasons.push('URL chứa ký tự "@" trong phần địa chỉ — kỹ thuật ngụy trang đường dẫn phổ biến trong lừa đảo.');
    score += 20;
  }

  const originalHostname = parsed.hostname;
  const redirectChain: string[] = [];
  let current = parsed;
  let resolvedIps: string[] = [];
  let finalStatus: number | null = null;
  let finalCert: ProbeResult["cert"] = null;
  let blockedPrivateIp = false;

  for (let hop = 0; hop < 5; hop++) {
    redirectChain.push(current.toString());

    let ips: string[];
    try {
      ips = await resolveHostIps(current.hostname);
    } catch {
      reasons.push(`Không thể phân giải DNS cho tên miền "${current.hostname}" (có thể không tồn tại hoặc đã ngưng hoạt động).`);
      score += 30;
      break;
    }
    if (hop === 0) resolvedIps = ips;

    if (ips.some(isPrivateOrReservedIp)) {
      blockedPrivateIp = true;
      reasons.push(`Tên miền "${current.hostname}" trỏ đến địa chỉ IP nội bộ/riêng tư — hệ thống từ chối kết nối vì lý do an toàn.`);
      score += 40;
      break;
    }

    const port = current.port ? Number(current.port) : current.protocol === "https:" ? 443 : 80;
    if (port !== 80 && port !== 443) {
      reasons.push(`Cổng kết nối "${port}" không phải cổng tiêu chuẩn (80/443) — hệ thống không thực hiện kết nối thử tới cổng này, nhưng đây cũng là một dấu hiệu bất thường.`);
      score += 15;
      break;
    }

    try {
      const probe = await probeUrlOnce(current.toString(), 4000);
      finalStatus = probe.status;
      finalCert = probe.cert;
      if (probe.status >= 300 && probe.status < 400 && probe.location) {
        current = new URL(probe.location, current);
        continue;
      }
      break;
    } catch (e: any) {
      reasons.push(`Không thể kết nối tới máy chủ đích: ${e.message || "lỗi không xác định"}.`);
      score += 15;
      break;
    }
  }

  if (net.isIP(originalHostname)) {
    reasons.push("URL sử dụng địa chỉ IP trực tiếp thay vì tên miền — dấu hiệu thường gặp trong các đường dẫn lừa đảo.");
    score += 25;
  }

  if (originalHostname.includes("xn--")) {
    reasons.push("Tên miền ở dạng mã hóa Punycode/IDN — có thể là ký tự giả mạo trông giống tên miền thật (Homograph Attack).");
    score += 30;
  }

  const rootHost = rootDomainOf(originalHostname).replace(/^www\./, "");
  if (URL_SHORTENER_DOMAINS.has(rootHost)) {
    reasons.push("Sử dụng dịch vụ rút gọn liên kết — không thể biết trước địa chỉ đích thực sự trước khi bấm vào.");
    score += 15;
  }

  const tld = originalHostname.split(".").pop() || "";
  if (SUSPICIOUS_TLDS.has(tld.toLowerCase())) {
    reasons.push(`Tên miền cấp cao nhất ".${tld}" là loại miễn phí/giá rẻ thường bị lạm dụng cho mục đích lừa đảo.`);
    score += 15;
  }

  for (const [brand, officialDomains] of Object.entries(OFFICIAL_BRAND_DOMAINS)) {
    if (!originalHostname.toLowerCase().includes(brand)) continue;
    const isOfficial = officialDomains.some(
      (d) => originalHostname === d || originalHostname.endsWith("." + d)
    );
    if (!isOfficial) {
      reasons.push(`Tên miền chứa từ khóa thương hiệu "${brand}" nhưng không khớp với tên miền chính thức — nghi ngờ cao là giả mạo (Phishing).`);
      score += 40;
    }
    break;
  }

  const hyphenCount = (originalHostname.match(/-/g) || []).length;
  if (hyphenCount >= 3) {
    reasons.push("Tên miền chứa nhiều dấu gạch ngang bất thường — thường thấy ở các tên miền được tạo hàng loạt cho mục đích lừa đảo.");
    score += 10;
  }

  const labelCount = originalHostname.split(".").filter(Boolean).length;
  if (labelCount >= 5) {
    reasons.push("Tên miền có cấu trúc subdomain quá sâu, thường dùng để đánh lừa người dùng về danh tính thực sự.");
    score += 10;
  }

  if (parsed.protocol === "http:") {
    reasons.push("Không sử dụng kết nối HTTPS mã hóa — dữ liệu trao đổi có thể bị nghe lén hoặc đánh cắp trên đường truyền.");
    score += 15;
  }

  if (finalCert) {
    if (finalCert.authorized === false) {
      reasons.push("Chứng chỉ SSL/TLS của máy chủ không hợp lệ hoặc không được một tổ chức uy tín xác thực.");
      score += 25;
    }
    if (finalCert.validTo) {
      const expiry = new Date(finalCert.validTo).getTime();
      if (!Number.isNaN(expiry) && expiry < Date.now()) {
        reasons.push("Chứng chỉ SSL của máy chủ đã hết hạn.");
        score += 20;
      }
    }
  }

  const lastHop = redirectChain[redirectChain.length - 1];
  if (redirectChain.length > 1 && lastHop) {
    try {
      const lastHost = new URL(lastHop).hostname;
      if (rootDomainOf(lastHost) !== rootDomainOf(originalHostname)) {
        reasons.push(`Đường dẫn tự động chuyển hướng (redirect) sang một tên miền khác: "${lastHost}".`);
        score += 20;
      }
    } catch {
      /* ignore malformed hop */
    }
  }

  if (reasons.length === 0) {
    reasons.push("Không phát hiện dấu hiệu bất thường rõ ràng qua phân tích tự động. Vẫn nên thận trọng và tự xác minh trước khi nhập thông tin nhạy cảm.");
  }

  score = Math.min(100, score);
  const verdict: "An toàn" | "Cần thận trọng" | "Nguy hiểm" =
    score >= 55 ? "Nguy hiểm" : score >= 25 ? "Cần thận trọng" : "An toàn";

  return {
    inputUrl: rawInput,
    normalizedUrl: normalized,
    hostname: originalHostname,
    resolvedIps: blockedPrivateIp ? [] : resolvedIps,
    finalUrl: redirectChain[redirectChain.length - 1] || normalized,
    redirectChain,
    httpStatus: finalStatus,
    tls: finalCert,
    riskScore: score,
    verdict,
    reasons,
    checkedAt: new Date().toISOString(),
  };
}

// Detects a standalone answer-key section — a line that is JUST a header like
// "ĐÁP ÁN" / "Answer Key" (as opposed to an inline per-question line such as
// "Đáp án: A", which has more text after it and must NOT split the document
// here) — and parses the compact "1. A  2. B  3. D" list that follows it into
// a { questionNumber: letter } map. This is the common case for Vietnamese
// exam documents that list every answer together at the end instead of
// marking each question inline, which the line-by-line parser below has no
// way to associate back to individual questions on its own.
function extractAnswerKeySection(text: string): { body: string; answerMap: Record<number, string> } {
  // Allow an arbitrary prefix before the header phrase (e.g. "II. Đáp án", "PHẦN 2 - Đáp án")
  // as long as nothing meaningful follows it on the same line — that's what distinguishes a
  // section header from an inline per-question line like "Đáp án: A".
  // Note: uses [\p{L}\p{N}] boundaries instead of \b — plain \b only recognizes
  // ASCII word characters, so it silently fails to bound Vietnamese diacritic
  // letters like "Đ"/"á" and the header would never match.
  const headerRegex = /^[ \t]*[^\n]*?(?<![\p{L}\p{N}])(?:đáp\s*án(?:\s*(?:đúng|chi\s*tiết))?|bảng\s*đáp\s*án|answer\s*key|answers?)(?![\p{L}\p{N}])[ \t]*[:\-]?[ \t]*$/imu;
  const match = headerRegex.exec(text);
  if (!match) {
    return { body: text, answerMap: {} };
  }

  const body = text.slice(0, match.index);
  const keySection = text.slice(match.index + match[0].length);

  const answerMap: Record<number, string> = {};

  // Strategy 1: adjacent "N. X" / "N-X" / "N: X" pairs, e.g. "1. A  2. B  3. D". The
  // letter isn't restricted to A-D so a stray out-of-range option (e.g. a 5th "E."
  // choice) doesn't stop this from picking up every other question's real answer —
  // the caller already ignores any letter that isn't one of that question's option ids.
  const pairRegex = /(?:câu\s*)?(\d{1,3})[ \t]*[.):\-]?[ \t]*([A-Za-z])\b/gi;
  let pair: RegExpExecArray | null;
  while ((pair = pairRegex.exec(keySection)) !== null) {
    const num = parseInt(pair[1], 10);
    if (!(num in answerMap)) {
      answerMap[num] = pair[2].toUpperCase();
    }
  }

  // Strategy 2: table-style layout. A .docx table read via mammoth's extractRawText
  // linearizes row-by-row, so a "Câu 1 | Câu 2 | ... " header row and its "B | D | ..."
  // answer row end up as two separate blocks of lines — never adjacent like strategy 1
  // expects. Only used when strategy 1 found nothing, since it's less precise (it just
  // pairs the Nth number with the Nth letter, so any stray one elsewhere would misalign
  // everything after it).
  if (Object.keys(answerMap).length === 0) {
    const numbers = [...keySection.matchAll(/(?:câu\s*)?(\d{1,3})\b/gi)].map((m) => parseInt(m[1], 10));
    // A "standalone" A-D letter: not immediately touching another letter (Unicode-aware,
    // so the "C" in "Câu" doesn't count — it's followed by "â").
    const letters = [...keySection.matchAll(/(?<!\p{L})([A-Da-d])(?!\p{L})/gu)].map((m) => m[1].toUpperCase());
    if (numbers.length > 0 && numbers.length === letters.length) {
      numbers.forEach((num, i) => {
        answerMap[num] = letters[i];
      });
    }
  }

  return { body, answerMap };
}

// Strategy 3: bare answer table with no per-question "Đáp án" line at all — some
// documents (see public/huongdantaodethi.docx) place a 2-row table right after the
// questions, e.g. "Câu 1 | Câu 2 | ... | Câu 10" over "B | D | ... | C". Mammoth's
// extractRawText renders each table cell as its own paragraph/line, so this shows up
// as a run of lines that are ONLY "Câu <n>" (n increasing from 1) immediately followed
// by an equal-length run of lines that are ONLY a single letter. Requiring each line to
// contain nothing but the cell's content is what keeps this from ever matching a real
// question/option line, which always has more text after its marker.
//
// The letter itself is matched as any single A-Z letter, not just A-D: a source exam
// can have a stray 5th option (e.g. "E. Cả A, C, D đều đúng") that the app's 4-option
// model doesn't support, and if the whole run had to be A-D this one out-of-range
// answer would abort matching for ALL 10 questions instead of just that one — the
// caller already ignores any letter that isn't one of the question's real option ids.
//
// A common variant instead puts the row's own label in its own leading cell — "Câu"
// then bare "1", "2", ...; "Đáp án" then bare "A", "E", ... — so a label cell for the
// answer row sits directly between the number run and the letter run, breaking strict
// adjacency. Tolerate a small run of such non-number/non-letter lines there (also
// covers a label like "Đáp án" that mammoth happens to split across two lines).
function extractBareAnswerTable(text: string): { body: string; answerMap: Record<number, string> } {
  const rawLines = text.split(/\r?\n/);
  const numberLineRe = /^(?:câu\s*)?(\d{1,3})$/i;
  const letterLineRe = /^([A-Za-z])$/;
  const MAX_LABEL_GAP_LINES = 3;

  for (let i = 0; i < rawLines.length; i++) {
    if (rawLines[i].trim() === "") continue;
    const m = numberLineRe.exec(rawLines[i].trim());
    if (!m || parseInt(m[1], 10) !== 1) continue;

    let expected = 1;
    const numberLineIdx: number[] = [];
    let j = i;
    while (j < rawLines.length) {
      const trimmed = rawLines[j].trim();
      if (trimmed === "") {
        j++;
        continue;
      }
      const mm = numberLineRe.exec(trimmed);
      if (!mm || parseInt(mm[1], 10) !== expected) break;
      numberLineIdx.push(j);
      expected++;
      j++;
    }
    const count = numberLineIdx.length;
    if (count < 2) continue;

    // Skip a short run of stray lines (blank, or a row-label like "Đáp án") between
    // the number run and its letters, without wandering off into unrelated content.
    const labelLineIdx: number[] = [];
    let labelSkips = 0;
    while (j < rawLines.length && labelSkips < MAX_LABEL_GAP_LINES) {
      const trimmed = rawLines[j].trim();
      if (trimmed === "") {
        j++;
        continue;
      }
      if (numberLineRe.test(trimmed) || letterLineRe.test(trimmed)) break;
      labelLineIdx.push(j);
      j++;
      labelSkips++;
    }

    const letterLineIdx: number[] = [];
    while (j < rawLines.length && letterLineIdx.length < count) {
      const trimmed = rawLines[j].trim();
      if (trimmed === "") {
        j++;
        continue;
      }
      const lm = letterLineRe.exec(trimmed);
      if (!lm) break;
      letterLineIdx.push(j);
      j++;
    }
    if (letterLineIdx.length !== count) continue;

    const answerMap: Record<number, string> = {};
    for (let k = 0; k < count; k++) {
      answerMap[k + 1] = rawLines[letterLineIdx[k]].trim().toUpperCase();
    }

    const removeIdx = new Set([...numberLineIdx, ...labelLineIdx, ...letterLineIdx]);
    const body = rawLines.filter((_, idx) => !removeIdx.has(idx)).join("\n");
    return { body, answerMap };
  }

  return { body: text, answerMap: {} };
}

// Marks where a real (non-equation) inserted picture used to be — see IMG_TOKEN_RE
// in QuizCreatorModal.tsx, which is what actually emits these tokens; this file only
// ever reads them back out. Kept in sync by hand since the two live in different
// runtimes (this file never ships to the browser, so it can't just import the client
// module's copy of the pattern).
const IMG_TOKEN_RE = /〔IMG:(\d+)〕/;
const IMG_TOKEN_RE_G = /〔IMG:(\d+)〕/g;

// Pulls the first image token out of a question/option's text (if any) and resolves
// it against the images array the client sent alongside rawText. Only the first
// token becomes the attached image — the data model has room for one per question/
// option — but every token is still stripped from the text either way so a second,
// unusable one doesn't show up as raw 〔IMG:N〕 junk in the imported exam.
function extractFirstImageToken(str: string, images: string[]): { text: string; image?: string } {
  const s = str || "";
  const m = IMG_TOKEN_RE.exec(s);
  const text = s.replace(IMG_TOKEN_RE_G, " ").replace(/\s+/g, " ").trim();
  if (!m) return { text };
  const image = images[parseInt(m[1], 10)];
  return { text, image };
}

// Local smart parser for quiz raw text (when user uploads a file format like Question 1:... A. B. C. D. Answer: A)
function parseRawQuizLocally(text: string, fileName?: string, images: string[] = []) {
  // Try the strict bare-table shape first, on the untouched text: a "Đáp án" row-label
  // cell in that table layout would otherwise get matched by extractAnswerKeySection's
  // header regex below, which cuts the text at that point and, since the answer row's
  // numbers sit in the *header* row rather than next to its own letters, ends up
  // discarding the letters into a keySection that has no numbers left to pair them
  // with — losing the whole answer key. Running the table-shape parser first avoids
  // that split ever happening for this layout.
  let { body, answerMap } = extractBareAnswerTable(text);
  if (Object.keys(answerMap).length === 0) {
    const keyed = extractAnswerKeySection(text);
    body = keyed.body;
    answerMap = keyed.answerMap;
  }

  // Some sources (e.g. text extracted from .docx via soft line-breaks, or copy-pasted
  // content) run the question and its options together on one line with no real
  // newline between them. Force a line break before each recognizable marker so the
  // line-by-line parser below can still find them.
  // The lookbehind below excludes any position right after a letter/digit so a
  // marker-shaped substring glued to the end of a normal word (e.g. the "c." in
  // "khác." or "được.") is never mistaken for a real "C." option marker.
  // The option marker's punctuation is `+` (one or more) rather than exactly one —
  // a source doc can have a typo like "B.." (real example: a math exam where an
  // Equation Editor image left a stray extra period behind it) and a single-char
  // class would fail to split there at all, silently merging that option's text
  // into the previous one and losing it (and, if it happened to be the answer key's
  // pick for that question, silently misgrading every attempt at that question too).
  const normalized = body
    .replace(/(?<!^)(?<!\n)(?<![\p{L}\p{N}])\s*(?=(?:câu|question|q)\s*\d+\s*[\.:\)\-])/giu, "\n")
    .replace(/(?<!^)(?<!\n)(?<![\p{L}\p{N}])\s*(?=[A-Da-d][\.:\)\-]+\s)/gu, "\n")
    .replace(/(?<!^)(?<!\n)(?<![\p{L}\p{N}])\s*(?=(?:đáp án|câu trả lời đúng|answer|correct answer|key)[\s:])/giu, "\n")
    .replace(/(?<!^)(?<!\n)(?<![\p{L}\p{N}])\s*(?=(?:giải thích|lý do|explanation)[\s:])/giu, "\n");

  const lines = normalized.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const questions: any[] = [];
  let currentQ: any = null;
  let qCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line starts a question (e.g. "1.", "Câu 1:", "Question 1:", "Q1:")
    const qMatch = line.match(/^(?:câu|question|q)?\s*(\d+)[\.:\)\-]\s*(.*)/i);
    const isExplicitOption = /^[A-Da-d][\.:\)\-]+\s*(.*)/.test(line);
    const isAnswerLine = /^(?:đáp án|câu trả lời đúng|answer|correct answer|key)[\s:]+\s*([A-Da-d])/i.test(line);

    if (qMatch && !isExplicitOption) {
      if (currentQ && currentQ.options.length >= 2) {
        if (!currentQ.correctOptionId) {
          currentQ.correctOptionId = currentQ.options[0].id;
        }
        questions.push(currentQ);
      }

      currentQ = {
        id: `q${qCounter++}`,
        question: qMatch[2] || `Câu hỏi ${qCounter - 1}`,
        options: [],
        correctOptionId: "",
        explanation: "Đáp án chuẩn theo tài liệu đính kèm.",
      };
      continue;
    }

    if (!currentQ) {
      currentQ = {
        id: `q${qCounter++}`,
        question: line,
        options: [],
        correctOptionId: "",
        explanation: "Đáp án chuẩn theo tài liệu đính kèm.",
      };
      continue;
    }

    // Check option A, B, C, D
    const optMatch = line.match(/^([A-Da-d])[\.:\)\-]+\s*(.*)/);
    // Skip if this letter was already captured for the current question — a later
    // line like "Đáp án đúng là: C. ..." can otherwise get mistaken for a 2nd option C.
    if (optMatch && !currentQ.options.some((o: any) => o.id === optMatch[1].toUpperCase())) {
      const optId = optMatch[1].toUpperCase();
      const optText = optMatch[2] || "";
      // Check if option line has marked (* or [x])
      const isCorrectMarked = line.includes("*") || line.includes("[x]") || line.includes("(đúng)");
      currentQ.options.push({
        id: optId,
        text: optText.replace(/\*|\[x\]|\(đúng\)/gi, "").trim(),
      });
      if (isCorrectMarked) {
        currentQ.correctOptionId = optId;
      }
      continue;
    }

    // Check Answer line
    const ansMatch = line.match(/^(?:đáp án|câu trả lời đúng|answer|correct answer|key)[\s:]+\s*([A-Za-z])/i);
    if (ansMatch) {
      currentQ.correctOptionId = ansMatch[1].toUpperCase();
      continue;
    }

    // Check explanation line
    const expMatch = line.match(/^(?:giải thích|lý do|explanation)[\s:]+\s*(.*)/i);
    if (expMatch) {
      currentQ.explanation = expMatch[1];
      continue;
    }

    // Otherwise append to question if options are empty
    if (currentQ.options.length === 0) {
      currentQ.question += " " + line;
    }
  }

  if (currentQ && currentQ.options.length >= 2) {
    if (!currentQ.correctOptionId) {
      currentQ.correctOptionId = currentQ.options[0].id;
    }
    questions.push(currentQ);
  }

  // Apply the separately-parsed answer-key section (if any) — this overrides the
  // "default to first option" fallback above with the real answer for each question,
  // matched by its position/number in the document.
  for (const [numStr, letter] of Object.entries(answerMap)) {
    const q = questions[parseInt(numStr, 10) - 1];
    if (q && q.options.some((o: any) => o.id === letter)) {
      q.correctOptionId = letter;
    }
  }

  // Resolve any 〔IMG:N〕 tokens left in question/option text (see htmlToNumberedText
  // in QuizCreatorModal.tsx) into questionImage / option.image, now that every
  // question/option's final text is settled.
  for (const q of questions) {
    const qImg = extractFirstImageToken(q.question, images);
    q.question = qImg.text;
    if (qImg.image) q.questionImage = qImg.image;
    for (const opt of q.options) {
      const optImg = extractFirstImageToken(opt.text, images);
      opt.text = optImg.text;
      if (optImg.image) opt.image = optImg.image;
    }
  }

  // If failed to parse structured questions, create sample questions from text
  if (questions.length === 0) {
    questions.push({
      id: "q1",
      question: "Câu hỏi mẫu trích xuất từ tệp: " + (text.slice(0, 100) || "Đề thi mẫu"),
      options: [
        { id: "A", text: "Phương án A" },
        { id: "B", text: "Phương án B" },
        { id: "C", text: "Phương án C" },
        { id: "D", text: "Phương án D" },
      ],
      correctOptionId: "A",
      explanation: "Được tạo tự động từ tài liệu đính kèm.",
    });
  }

  return {
    title: fileName ? fileName.replace(/\.[^/.]+$/, "") : "Đề thi trắc nghiệm tùy chỉnh",
    description: `Đề thi được tạo tự động từ tệp văn bản đính kèm với ${questions.length} câu hỏi.`,
    category: "Công nghệ số & Hệ thống",
    difficulty: "Trung bình",
    durationMinutes: Math.max(10, questions.length * 2),
    passScorePercent: 70,
    questions,
    warning: detectMissingContentWarning(questions),
  };
}

// A source .docx that embeds fractions/formulas as old-style "Microsoft Equation 3.0"
// objects (OLE objects rendered as WMF images, rather than real OMML/text) has no
// textual content at all for those spots — no text extractor (this one included) can
// recover "2/3" from what is, underneath, just a picture. That leaves gaps exactly
// where a question/option's text should be, e.g. "A. .	B. .	C. .	D. .". Rather than
// silently importing an exam full of blank options, flag it so the teacher notices and
// fills the gaps in manually instead of publishing a broken room by accident.
function detectMissingContentWarning(questions: any[]): string | null {
  const isEmptyish = (s: string) => /^[\s.,:;\-–—]*$/.test(s || "");

  let total = 0;
  let empty = 0;
  for (const q of questions) {
    total++;
    // A pasted screenshot (as opposed to an Equation Editor object) resolves to a
    // real questionImage/option.image — that's the content, an empty text field
    // alongside it isn't a sign anything went missing.
    if (isEmptyish(q.question) && !q.questionImage) empty++;
    for (const opt of q.options || []) {
      total++;
      if (isEmptyish(opt.text) && !opt.image) empty++;
    }
  }

  if (total === 0 || empty === 0) return null;
  if (empty / total < 0.15) return null;

  return (
    `Phát hiện ${empty} câu hỏi/đáp án bị thiếu nội dung sau khi trích xuất. ` +
    `Nguyên nhân thường gặp: đề gốc chứa công thức toán/phân số được chèn dưới dạng ảnh ` +
    `(Equation Editor cũ) mà hệ thống không đọc được thành chữ. Vui lòng rà soát và bổ sung ` +
    `thủ công các câu/đáp án còn trống trước khi lưu đề.`
  );
}
