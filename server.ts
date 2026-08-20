import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Helper to get GoogleGenAI client if key is configured
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

  // --- API Routes ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI Quiz Parser from file content or raw text
  app.post("/api/ai/parse-quiz-file", async (req, res) => {
    try {
      const { rawText, fileName } = req.body;

      if (!rawText || typeof rawText !== "string") {
        return res.status(400).json({ error: "Nội dung tệp rỗng hoặc không hợp lệ" });
      }

      const ai = getGeminiClient();

      if (ai) {
        try {
          const prompt = `Bạn là một trợ lý ảo phân tích tài liệu đề thi chuyên nghiệp.
Hãy phân tích nội dung câu hỏi và đáp án từ tệp văn bản sau (tên tệp: "${fileName || "quiz_file.txt"}") và chuyển đổi thành cấu trúc JSON chuẩn cho đề thi trắc nghiệm công nghệ:

Nội dung thô:
\`\`\`
${rawText.slice(0, 15000)}
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
          return res.json({ success: true, data: parsed, source: "gemini" });
        } catch (geminiErr: any) {
          console.warn("Gemini parse failed, fallback to local rule-based parser:", geminiErr?.message);
        }
      }

      // Fallback rule-based parser for text
      const fallbackQuiz = parseRawQuizLocally(rawText, fileName);
      return res.json({ success: true, data: fallbackQuiz, source: "local-parser" });
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

  // Vite middleware for development vs static for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TechPulse server running on http://0.0.0.0:${PORT}`);
  });
}

// Local smart parser for quiz raw text (when user uploads a file format like Question 1:... A. B. C. D. Answer: A)
function parseRawQuizLocally(text: string, fileName?: string) {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const questions: any[] = [];
  let currentQ: any = null;
  let qCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line starts a question (e.g. "1.", "Câu 1:", "Question 1:", "Q1:")
    const qMatch = line.match(/^(?:câu|question|q)?\s*(\d+)[\.:\)\-]\s*(.*)/i);
    const isExplicitOption = /^[A-Da-d][\.:\)\-]\s*(.*)/.test(line);
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
    const optMatch = line.match(/^([A-Da-d])[\.:\)\-]\s*(.*)/);
    if (optMatch) {
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
    const ansMatch = line.match(/^(?:đáp án|câu trả lời đúng|answer|correct answer|key)[\s:]+\s*([A-Da-d])/i);
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
    title: fileName ? `Đề thi từ tệp: ${fileName.replace(/\.[^/.]+$/, "")}` : "Đề thi trắc nghiệm tùy chỉnh",
    description: `Đề thi được tạo tự động từ tệp văn bản đính kèm với ${questions.length} câu hỏi.`,
    category: "Công nghệ số & Hệ thống",
    difficulty: "Trung bình",
    durationMinutes: Math.max(10, questions.length * 2),
    passScorePercent: 70,
    questions,
  };
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
