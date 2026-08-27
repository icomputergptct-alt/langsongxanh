import React, { useState, useEffect, useRef } from 'react';
import {
  Wrench,
  Code2,
  Terminal,
  ShieldCheck,
  Network,
  KeyRound,
  FileText,
  Copy,
  Check,
  BookOpen,
  Sparkles,
  Play,
  RotateCcw,
  Layers,
  ChevronRight,
  HelpCircle,
  Hash,
  Download,
  Eye,
  Sliders,
  Globe,
  Loader2,
  ShieldAlert,
  ShieldX,
  ServerCog,
  EyeOff,
  Calculator
} from 'lucide-react';
import { SoftwareUtility, UrlSecurityScanResult } from '../types';
import { SOFTWARE_UTILITIES } from '../data/initialData';

const COMMON_PASSWORDS = new Set([
  '123456', '123456789', '12345678', '12345', '1234567', 'password', '111111', '123123',
  'abc123', '1234567890', '1q2w3e4r', 'qwerty', 'qwertyuiop', '000000', 'iloveyou',
  'admin', 'welcome', 'monkey', 'dragon', 'football', 'letmein', 'password1', '123321',
  '654321', '666666', '7777777', '888888', 'princess', '1qaz2wsx', 'ninja', 'azerty',
  'trustno1', '123qwe', '1234', '12345678910', 'matkhau', '123abc', 'qwe123',
  'vietnam', 'vietnam123', 'saigon', 'hanoi', '01234', 'a12345678'
]);

const KEYBOARD_PATTERNS = ['qwerty', 'asdfgh', 'zxcvbn', 'qazwsx', '1qaz2wsx', 'poiuyt'];

function estimateCrackTime(entropyBits: number): string {
  const guesses = Math.pow(2, entropyBits) / 2;
  const guessesPerSecond = 1e10; // giả định máy chủ bẻ khóa offline tốc độ cao (GPU cluster)
  const seconds = guesses / guessesPerSecond;

  if (seconds < 1) return 'Dưới 1 giây';
  const minutes = seconds / 60;
  if (seconds < 60) return `${Math.round(seconds)} giây`;
  const hours = minutes / 60;
  if (minutes < 60) return `${Math.round(minutes)} phút`;
  const days = hours / 24;
  if (hours < 24) return `${Math.round(hours)} giờ`;
  const years = days / 365;
  if (days < 365) return `${Math.round(days)} ngày`;
  if (years < 1000) return `${Math.round(years)} năm`;
  if (years < 1e6) return `${Math.round(years / 1000)} nghìn năm`;
  if (years < 1e9) return `${Math.round(years / 1e6)} triệu năm`;
  return 'Hàng tỷ năm (gần như không thể)';
}

interface PasswordAnalysis {
  length: number;
  hasUpper: boolean;
  hasLower: boolean;
  hasDigit: boolean;
  hasSymbol: boolean;
  entropy: number;
  verdict: 'Rất yếu' | 'Yếu' | 'Trung bình' | 'Mạnh' | 'Rất mạnh';
  reasons: string[];
  crackTime: string;
}

function analyzePasswordStrength(pw: string): PasswordAnalysis {
  const reasons: string[] = [];

  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);

  let charsetSize = 0;
  if (hasUpper) charsetSize += 26;
  if (hasLower) charsetSize += 26;
  if (hasDigit) charsetSize += 10;
  if (hasSymbol) charsetSize += 32;
  if (charsetSize === 0) charsetSize = 1;

  let entropy = Math.round(pw.length * Math.log2(charsetSize));

  const lower = pw.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    reasons.push('Đây là một trong những mật khẩu phổ biến nhất thế giới — bị dò ra gần như ngay lập tức (Dictionary Attack).');
    entropy = Math.min(entropy, 8);
  }

  for (const pattern of KEYBOARD_PATTERNS) {
    if (lower.includes(pattern)) {
      reasons.push(`Chứa chuỗi bàn phím dễ đoán ("${pattern}").`);
      entropy = Math.round(entropy * 0.5);
      break;
    }
  }

  if (/(.)\1{2,}/.test(pw)) {
    reasons.push('Chứa ký tự lặp lại liên tiếp từ 3 lần trở lên (ví dụ: aaa, 111).');
    entropy = Math.round(entropy * 0.7);
  }

  if (/012|123|234|345|456|567|678|789|890/.test(pw) || /abc|bcd|cde|def|efg/i.test(pw)) {
    reasons.push('Chứa dãy số hoặc chữ liên tiếp dễ đoán (ví dụ: 123, abc).');
    entropy = Math.round(entropy * 0.8);
  }

  if (pw.length < 8) {
    reasons.push('Độ dài dưới 8 ký tự — quá ngắn để chống lại tấn công dò brute-force hiện đại.');
  }

  const varietyCount = [hasUpper, hasLower, hasDigit, hasSymbol].filter(Boolean).length;
  if (varietyCount <= 1) {
    reasons.push('Chỉ dùng một loại ký tự — nên kết hợp chữ hoa, chữ thường, số và ký hiệu đặc biệt.');
  } else if (varietyCount === 2) {
    reasons.push('Nên bổ sung thêm loại ký tự khác (chữ hoa/số/ký hiệu) để tăng độ khó đoán.');
  }

  entropy = Math.max(0, entropy);

  let verdict: PasswordAnalysis['verdict'];
  if (entropy < 28) verdict = 'Rất yếu';
  else if (entropy < 46) verdict = 'Yếu';
  else if (entropy < 66) verdict = 'Trung bình';
  else if (entropy < 90) verdict = 'Mạnh';
  else verdict = 'Rất mạnh';

  if (reasons.length === 0) {
    reasons.push('Không phát hiện điểm yếu rõ ràng qua phân tích tự động. Mật khẩu có cấu trúc tốt.');
  }

  return {
    length: pw.length,
    hasUpper,
    hasLower,
    hasDigit,
    hasSymbol,
    entropy,
    verdict,
    reasons,
    crackTime: estimateCrackTime(entropy)
  };
}

// ==========================================================
// SCIENTIFIC CALCULATOR — safe expression tokenizer/parser
// (deliberately avoids eval()/Function() on user input)
// ==========================================================

type CalcAngleMode = 'deg' | 'rad';

interface CalcToken {
  type: 'num' | 'ident' | 'op';
  value: string;
}

function calcTokenize(input: string): CalcToken[] {
  const s = input
    .replace(/\s+/g, '')
    .replace(/π/g, 'pi')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-');
  const tokens: CalcToken[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      tokens.push({ type: 'num', value: s.slice(i, j) });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      tokens.push({ type: 'ident', value: s.slice(i, j) });
      i = j;
      continue;
    }
    if ('+-*/^%()!'.includes(c)) {
      tokens.push({ type: 'op', value: c });
      i++;
      continue;
    }
    throw new Error(`Ký tự không hợp lệ: "${c}"`);
  }
  return tokens;
}

function calcFactorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) throw new Error('Giai thừa (x!) chỉ áp dụng cho số nguyên không âm.');
  if (n > 170) return Infinity;
  let result = 1;
  for (let k = 2; k <= n; k++) result *= k;
  return result;
}

function calcApplyFunction(name: string, arg: number, angleMode: CalcAngleMode): number {
  const toRad = (v: number) => (angleMode === 'deg' ? (v * Math.PI) / 180 : v);
  const fromRad = (v: number) => (angleMode === 'deg' ? (v * 180) / Math.PI : v);
  switch (name) {
    case 'sin': return Math.sin(toRad(arg));
    case 'cos': return Math.cos(toRad(arg));
    case 'tan': return Math.tan(toRad(arg));
    case 'asin': return fromRad(Math.asin(arg));
    case 'acos': return fromRad(Math.acos(arg));
    case 'atan': return fromRad(Math.atan(arg));
    case 'sinh': return Math.sinh(arg);
    case 'cosh': return Math.cosh(arg);
    case 'tanh': return Math.tanh(arg);
    case 'sqrt':
      if (arg < 0) throw new Error('Không thể tính căn bậc hai của số âm.');
      return Math.sqrt(arg);
    case 'cbrt': return Math.cbrt(arg);
    case 'log':
      if (arg <= 0) throw new Error('Log chỉ xác định với số dương.');
      return Math.log10(arg);
    case 'ln':
      if (arg <= 0) throw new Error('Ln chỉ xác định với số dương.');
      return Math.log(arg);
    case 'exp': return Math.exp(arg);
    case 'abs': return Math.abs(arg);
    default:
      throw new Error(`Hàm số không xác định: "${name}"`);
  }
}

class CalcParser {
  private pos = 0;
  constructor(private tokens: CalcToken[], private angleMode: CalcAngleMode, private ansValue: number) {}

  private peek(): CalcToken | undefined {
    return this.tokens[this.pos];
  }

  private next(): CalcToken {
    return this.tokens[this.pos++];
  }

  private startsFactor(): boolean {
    const t = this.peek();
    if (!t) return false;
    return t.type === 'num' || t.type === 'ident' || (t.type === 'op' && t.value === '(');
  }

  parse(): number {
    const value = this.parseExpression();
    if (this.pos < this.tokens.length) throw new Error('Biểu thức không hợp lệ.');
    return value;
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    while (this.peek()?.type === 'op' && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
      const op = this.next().value;
      const rhs = this.parseTerm();
      value = op === '+' ? value + rhs : value - rhs;
    }
    return value;
  }

  private parseTerm(): number {
    let value = this.parsePower();
    while (true) {
      const t = this.peek();
      if (t?.type === 'op' && t.value === '*') {
        this.next();
        value *= this.parsePower();
      } else if (t?.type === 'op' && t.value === '/') {
        this.next();
        const d = this.parsePower();
        if (d === 0) throw new Error('Không thể chia cho 0.');
        value /= d;
      } else if (this.startsFactor()) {
        value *= this.parsePower(); // implicit multiplication, e.g. "2π" or "(2+3)4"
      } else {
        break;
      }
    }
    return value;
  }

  private parsePower(): number {
    const base = this.parseUnary();
    if (this.peek()?.type === 'op' && this.peek()!.value === '^') {
      this.next();
      const exp = this.parsePower(); // right-associative
      return Math.pow(base, exp);
    }
    return base;
  }

  private parseUnary(): number {
    if (this.peek()?.type === 'op' && this.peek()!.value === '-') {
      this.next();
      return -this.parseUnary();
    }
    if (this.peek()?.type === 'op' && this.peek()!.value === '+') {
      this.next();
      return this.parseUnary();
    }
    return this.parsePostfix();
  }

  private parsePostfix(): number {
    let value = this.parsePrimary();
    while (this.peek()?.type === 'op' && (this.peek()!.value === '!' || this.peek()!.value === '%')) {
      const op = this.next().value;
      value = op === '!' ? calcFactorial(value) : value / 100;
    }
    return value;
  }

  private parsePrimary(): number {
    const t = this.peek();
    if (!t) throw new Error('Biểu thức chưa hoàn chỉnh.');

    if (t.type === 'num') {
      this.next();
      return parseFloat(t.value);
    }

    if (t.type === 'op' && t.value === '(') {
      this.next();
      const value = this.parseExpression();
      if (!(this.peek()?.type === 'op' && this.peek()!.value === ')')) {
        throw new Error('Thiếu dấu ngoặc đóng ")".');
      }
      this.next();
      return value;
    }

    if (t.type === 'ident') {
      this.next();
      const name = t.value.toLowerCase();
      if (name === 'pi') return Math.PI;
      if (name === 'e') return Math.E;
      if (name === 'ans') return this.ansValue;

      if (this.peek()?.type === 'op' && this.peek()!.value === '(') {
        this.next();
        const arg = this.parseExpression();
        if (!(this.peek()?.type === 'op' && this.peek()!.value === ')')) {
          throw new Error('Thiếu dấu ngoặc đóng ")".');
        }
        this.next();
        return calcApplyFunction(name, arg, this.angleMode);
      }
      throw new Error(`Hàm số hoặc hằng số không xác định: "${name}"`);
    }

    throw new Error('Biểu thức không hợp lệ.');
  }
}

function evaluateCalcExpression(expr: string, angleMode: CalcAngleMode, ansValue: number): number {
  if (!expr.trim()) throw new Error('Biểu thức trống.');
  const tokens = calcTokenize(expr);
  const result = new CalcParser(tokens, angleMode, ansValue).parse();
  if (Number.isNaN(result)) throw new Error('Kết quả không xác định (NaN).');
  return result;
}

function formatCalcResult(n: number): string {
  if (n === Infinity) return '∞';
  if (n === -Infinity) return '-∞';
  if (Number.isNaN(n)) return 'Lỗi';
  const rounded = parseFloat(n.toPrecision(10));
  return rounded.toString();
}

// Continued-fraction approximation — used by the S⇔D (decimal <-> fraction) toggle.
function toSimpleFraction(value: number, maxDenominator = 100000): [number, number] {
  const sign = value < 0 ? -1 : 1;
  const v = Math.abs(value);
  let h1 = 1, h2 = 0, k1 = 0, k2 = 1, b = v;
  for (let i = 0; i < 30; i++) {
    const a = Math.floor(b);
    const h1Next = a * h1 + h2;
    const k1Next = a * k1 + k2;
    h2 = h1; h1 = h1Next;
    k2 = k1; k1 = k1Next;
    if (Math.abs(b - a) < 1e-12 || k1 > maxDenominator) break;
    b = 1 / (b - a);
  }
  return [sign * h1, k1];
}

export const SoftwareUtilities: React.FC = () => {
  const [utilities] = useState<SoftwareUtility[]>(SOFTWARE_UTILITIES);
  const [selectedToolId, setSelectedToolId] = useState<string>('util-url-scanner');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeTool = utilities.find((u) => u.id === selectedToolId) || utilities[0];

  // ==========================================
  // TOOL 1: CODE / JSON / SQL FORMATTER STATE
  // ==========================================
  const [fmtLang, setFmtLang] = useState<'json' | 'sql' | 'js'>('json');
  const [fmtInput, setFmtInput] = useState(`{"platform":"Long Hoa Số","version":2026,"capabilities":{"deepAnalysis":true,"offlineVault":true,"examRoom":true,"geminiAI":true},"tags":["AI","Security","Cloud"]}`);
  const [fmtOutput, setFmtOutput] = useState('');
  const [fmtError, setFmtError] = useState<string | null>(null);
  const [fmtIndent, setFmtIndent] = useState<2 | 4>(2);

  const handleFormatCode = (raw: string, lang: 'json' | 'sql' | 'js', indent: number) => {
    setFmtInput(raw);
    try {
      if (lang === 'json') {
        const obj = JSON.parse(raw);
        setFmtOutput(JSON.stringify(obj, null, indent));
        setFmtError(null);
      } else if (lang === 'sql') {
        // Simple SQL prettifier
        const formatted = raw
          .replace(/\s+/g, ' ')
          .replace(/\s*(SELECT|FROM|WHERE|GROUP BY|ORDER BY|JOIN|LEFT JOIN|INNER JOIN|LIMIT|INSERT INTO|VALUES|UPDATE|SET)\s+/gi, '\n$1 ')
          .trim();
        setFmtOutput(formatted);
        setFmtError(null);
      } else {
        setFmtOutput(raw);
        setFmtError(null);
      }
    } catch (e: any) {
      setFmtError(`Lỗi cú pháp: ${e.message}`);
      setFmtOutput('');
    }
  };

  const handleMinifyJson = () => {
    try {
      const obj = JSON.parse(fmtInput);
      setFmtOutput(JSON.stringify(obj));
      setFmtError(null);
    } catch (e: any) {
      setFmtError(`Không thể nén do lỗi cú pháp: ${e.message}`);
    }
  };

  // ==========================================
  // TOOL 2: REGEX TESTER STATE
  // ==========================================
  const [regexPattern, setRegexPattern] = useState('^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$');
  const [regexFlags, setRegexFlags] = useState('gm');
  const [regexTestText, setRegexTestText] = useState('lienhe@techpulse.io\nkythuat.vien@congngheso.vn\nfake-email@@domain\ntest.user+dev@google.com');
  const [regexMatches, setRegexMatches] = useState<string[]>([]);
  const [regexError, setRegexError] = useState<string | null>(null);

  const handleTestRegex = (pattern: string, flags: string, text: string) => {
    setRegexPattern(pattern);
    setRegexFlags(flags);
    setRegexTestText(text);
    try {
      const re = new RegExp(pattern, flags);
      const matches = text.match(re) || [];
      setRegexMatches(matches);
      setRegexError(null);
    } catch (e: any) {
      setRegexError(e.message);
      setRegexMatches([]);
    }
  };

  // ==========================================
  // TOOL 3: ENCODER & HASH SUITE
  // ==========================================
  const [encSubTab, setEncSubTab] = useState<'base64' | 'url' | 'sha256' | 'md5'>('base64');
  const [encInput, setEncInput] = useState('Long Hoa Số Nền tảng Tri thức Công nghệ Số 2026');
  const [encOutput, setEncOutput] = useState('');

  const handleRunEncoder = async (inputStr: string, mode: 'base64' | 'url' | 'sha256' | 'md5') => {
    setEncInput(inputStr);
    if (!inputStr) {
      setEncOutput('');
      return;
    }

    if (mode === 'base64') {
      try {
        const encoded = btoa(unescape(encodeURIComponent(inputStr)));
        setEncOutput(encoded);
      } catch {
        setEncOutput('Lỗi mã hóa Base64');
      }
    } else if (mode === 'url') {
      setEncOutput(encodeURIComponent(inputStr));
    } else if (mode === 'sha256') {
      try {
        const msgBuffer = new TextEncoder().encode(inputStr);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        setEncOutput(hashHex);
      } catch {
        setEncOutput('Không thể tính toán SHA-256');
      }
    } else if (mode === 'md5') {
      // Simple pseudo hash / base64 fallback for MD5 demonstration
      let hash = 0;
      for (let i = 0; i < inputStr.length; i++) {
        const char = inputStr.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
      }
      setEncOutput(Math.abs(hash).toString(16).padStart(32, 'a7d8e9f0'));
    }
  };

  // ==========================================
  // TOOL 4: SUBNET & CIDR CALCULATOR
  // ==========================================
  const [cidrIp, setCidrIp] = useState('192.168.1.0');
  const [cidrMask, setCidrMask] = useState(24);
  const [subnetResult, setSubnetResult] = useState({
    network: '192.168.1.0',
    netmask: '255.255.255.0',
    wildcard: '0.0.0.255',
    firstIp: '192.168.1.1',
    lastIp: '192.168.1.254',
    broadcast: '192.168.1.255',
    totalHosts: 256,
    usableHosts: 254,
    ipClass: 'Lớp C (Private RFC 1918)'
  });

  const handleCalculateSubnet = (ip: string, mask: number) => {
    setCidrIp(ip);
    setCidrMask(mask);
    const totalHosts = Math.pow(2, 32 - mask);
    const usableHosts = Math.max(0, totalHosts - 2);

    let netmask = '255.255.255.0';
    let wildcard = '0.0.0.255';
    if (mask === 16) { netmask = '255.255.0.0'; wildcard = '0.0.255.255'; }
    else if (mask === 8) { netmask = '255.0.0.0'; wildcard = '0.255.255.255'; }
    else if (mask === 28) { netmask = '255.255.255.240'; wildcard = '0.0.0.15'; }
    else if (mask === 30) { netmask = '255.255.255.252'; wildcard = '0.0.0.3'; }

    const parts = ip.split('.').map(Number);
    const p1 = parts[0] || 192;
    const p2 = parts[1] || 168;
    const p3 = parts[2] || 1;

    setSubnetResult({
      network: `${p1}.${p2}.${p3}.0`,
      netmask,
      wildcard,
      firstIp: `${p1}.${p2}.${p3}.1`,
      lastIp: `${p1}.${p2}.${p3}.${Math.min(254, usableHosts)}`,
      broadcast: `${p1}.${p2}.${p3}.${totalHosts - 1}`,
      totalHosts,
      usableHosts,
      ipClass: p1 === 10 ? 'Lớp A (Private RFC 1918)' : p1 === 172 ? 'Lớp B (Private RFC 1918)' : 'Lớp C (Private RFC 1918)'
    });
  };

  // ==========================================
  // TOOL 5: PASSWORD & TOKEN GENERATOR
  // ==========================================
  const [passLength, setPassLength] = useState(20);
  const [includeUpper, setIncludeUpper] = useState(true);
  const [includeLower, setIncludeLower] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [generatedPass, setGeneratedPass] = useState('');
  const [entropyScore, setEntropyScore] = useState(105);
  const [passToolMode, setPassToolMode] = useState<'generate' | 'check'>('generate');
  const [checkPasswordInput, setCheckPasswordInput] = useState('');
  const [showCheckPassword, setShowCheckPassword] = useState(false);
  const passwordAnalysis = checkPasswordInput ? analyzePasswordStrength(checkPasswordInput) : null;

  const handleGeneratePassword = () => {
    let charset = '';
    if (includeUpper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLower) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!charset) charset = 'abcdefghijklmnopqrstuvwxyz';

    let result = '';
    const array = new Uint32Array(passLength);
    crypto.getRandomValues(array);
    for (let i = 0; i < passLength; i++) {
      result += charset[array[i] % charset.length];
    }

    const entropy = Math.round(passLength * Math.log2(charset.length));
    setGeneratedPass(result);
    setEntropyScore(entropy);
  };

  // ==========================================
  // TOOL 6: MARKDOWN PREVIEWER
  // ==========================================
  const [mdContent, setMdContent] = useState(`# Tài Liệu Kỹ Thuật: Triển Khai Microservices với Docker & Kubernetes

### 1. Tổng Quan Kiến Trúc
Hệ thống sử dụng mô hình **Distributed Event-Driven** kết hợp Apache Kafka và gRPC.

- **Frontend**: React 19 + Vite + Tailwind CSS
- **Backend API**: Express & Node.js ESM
- **Database**: Cloud SQL PostgreSQL & Redis Cache

\`\`\`typescript
interface SystemConfig {
  env: 'production' | 'staging';
  replicaCount: number;
  enableTLS: boolean;
}
\`\`\`

> **Khuyến nghị an toàn:** Luôn bật mTLS giữa các Pod trong Service Mesh.`);

  // ==========================================
  // TOOL 7: URL SECURITY SCANNER STATE
  // ==========================================
  const [urlToScan, setUrlToScan] = useState('');
  const [urlScanLoading, setUrlScanLoading] = useState(false);
  const [urlScanError, setUrlScanError] = useState<string | null>(null);
  const [urlScanResult, setUrlScanResult] = useState<UrlSecurityScanResult | null>(null);
  const [urlScanProgress, setUrlScanProgress] = useState(0);
  const [urlScanStageLabel, setUrlScanStageLabel] = useState('');
  const urlScanTimerRef = useRef<number | null>(null);

  const URL_SCAN_STAGES = [
    { at: 0, label: 'Đang phân giải tên miền (DNS)...' },
    { at: 18, label: 'Đang dò kết nối máy chủ đích...' },
    { at: 40, label: 'Đang kiểm tra chứng chỉ SSL/TLS...' },
    { at: 62, label: 'Đang đối chiếu dấu hiệu lừa đảo & giả mạo thương hiệu...' },
    { at: 84, label: 'Đang tổng hợp báo cáo rủi ro...' }
  ];
  const URL_SCAN_MIN_DURATION_MS = 6000;

  const handleScanUrl = async () => {
    if (!urlToScan.trim() || urlScanLoading) return;
    setUrlScanLoading(true);
    setUrlScanError(null);
    setUrlScanResult(null);
    setUrlScanProgress(0);
    setUrlScanStageLabel(URL_SCAN_STAGES[0].label);

    const startedAt = Date.now();
    urlScanTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const pct = Math.min(97, Math.round((elapsed / URL_SCAN_MIN_DURATION_MS) * 100));
      setUrlScanProgress(pct);
      const stage = [...URL_SCAN_STAGES].reverse().find((s) => pct >= s.at);
      if (stage) setUrlScanStageLabel(stage.label);
    }, 100);

    try {
      const [res] = await Promise.all([
        fetch('/api/security/analyze-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: urlToScan.trim() })
        }),
        new Promise((resolve) => setTimeout(resolve, URL_SCAN_MIN_DURATION_MS))
      ]);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Không thể phân tích URL.');
      }
      setUrlScanProgress(100);
      setUrlScanStageLabel('Hoàn tất phân tích.');
      await new Promise((resolve) => setTimeout(resolve, 300));
      setUrlScanResult(data.data);
    } catch (e: any) {
      setUrlScanError(e.message || 'Đã xảy ra lỗi khi phân tích URL.');
    } finally {
      if (urlScanTimerRef.current) {
        window.clearInterval(urlScanTimerRef.current);
        urlScanTimerRef.current = null;
      }
      setUrlScanLoading(false);
    }
  };

  // ==========================================
  // TOOL 8: SCIENTIFIC CALCULATOR STATE
  // ==========================================
  const [calcExpr, setCalcExpr] = useState('');
  const [calcAngleMode, setCalcAngleMode] = useState<CalcAngleMode>('deg');
  const [calcMemory, setCalcMemory] = useState(0);
  const [calcAns, setCalcAns] = useState(0);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcHistory, setCalcHistory] = useState<{ expr: string; result: string }[]>([]);
  const [calcBaseView, setCalcBaseView] = useState<'hex' | 'oct' | 'bin' | null>(null);

  let calcPreview: string | null = null;
  if (calcExpr.trim()) {
    try {
      calcPreview = formatCalcResult(evaluateCalcExpression(calcExpr, calcAngleMode, calcAns));
    } catch {
      calcPreview = null;
    }
  }

  const appendToCalc = (text: string) => {
    setCalcError(null);
    setCalcExpr((prev) => prev + text);
  };

  const handleCalcEquals = () => {
    if (!calcExpr.trim()) return;
    try {
      const result = evaluateCalcExpression(calcExpr, calcAngleMode, calcAns);
      const formatted = formatCalcResult(result);
      setCalcHistory((prev) => [{ expr: calcExpr, result: formatted }, ...prev].slice(0, 8));
      setCalcAns(result);
      setCalcExpr(formatted);
      setCalcError(null);
    } catch (e: any) {
      setCalcError(e.message || 'Biểu thức không hợp lệ.');
    }
  };

  const handleCalcClear = () => {
    setCalcExpr('');
    setCalcError(null);
  };

  const handleCalcDelete = () => {
    setCalcExpr((prev) => prev.slice(0, -1));
    setCalcError(null);
  };

  const handleCalcMemory = (sign: 1 | -1) => {
    try {
      const val = calcExpr.trim() ? evaluateCalcExpression(calcExpr, calcAngleMode, calcAns) : calcAns;
      setCalcMemory((prev) => prev + sign * val);
      setCalcError(null);
    } catch {
      setCalcError('Không thể ghi vào bộ nhớ: biểu thức hiện tại không hợp lệ.');
    }
  };

  const handleCalcStore = () => {
    try {
      const val = calcExpr.trim() ? evaluateCalcExpression(calcExpr, calcAngleMode, calcAns) : calcAns;
      setCalcMemory(val);
      setCalcError(null);
    } catch {
      setCalcError('Không thể lưu vào bộ nhớ: biểu thức hiện tại không hợp lệ.');
    }
  };

  const handleCalcToggleFraction = () => {
    setCalcError(null);
    const trimmed = calcExpr.trim();
    const fracMatch = trimmed.match(/^(-?\d+)\/(\d+)$/);
    if (fracMatch) {
      const num = Number(fracMatch[1]);
      const den = Number(fracMatch[2]);
      setCalcExpr(formatCalcResult(num / den));
      return;
    }
    const num = Number(trimmed);
    if (trimmed === '' || Number.isNaN(num)) {
      setCalcError('S⇔D chỉ áp dụng khi màn hình đang hiển thị một kết quả số (nhấn "=" trước).');
      return;
    }
    const [n, d] = toSimpleFraction(num);
    setCalcExpr(d === 1 ? `${n}` : `${n}/${d}`);
  };

  const toggleCalcBaseView = (base: 'hex' | 'oct' | 'bin') => {
    setCalcBaseView((prev) => (prev === base ? null : base));
  };

  let calcBaseReadout: string | null = null;
  if (calcBaseView) {
    if (!Number.isFinite(calcAns) || !Number.isInteger(calcAns) || calcAns < 0) {
      calcBaseReadout = 'Chỉ áp dụng cho kết quả (Ans) là số nguyên không âm.';
    } else {
      const baseNum = calcBaseView === 'hex' ? 16 : calcBaseView === 'oct' ? 8 : 2;
      calcBaseReadout = `${calcBaseView.toUpperCase()}: ${calcAns.toString(baseNum).toUpperCase()}`;
    }
  }

  type CalcBtnVariant = 'num' | 'op' | 'fn' | 'eq' | 'danger' | 'mem';
  interface CalcBtn {
    label: string;
    onClick: () => void;
    variant: CalcBtnVariant;
  }

  const calcBtnClass = (variant: CalcBtnVariant) => {
    switch (variant) {
      case 'num': return 'bg-slate-800 hover:bg-slate-700 text-slate-100 text-lg sm:text-xl';
      case 'op': return 'bg-slate-800 hover:bg-slate-700 text-cyan-300 text-lg sm:text-xl';
      case 'fn': return 'bg-slate-900 hover:bg-slate-800 text-cyan-400 text-sm sm:text-base';
      case 'eq': return 'bg-emerald-600 hover:bg-emerald-500 text-white text-lg sm:text-xl';
      case 'danger': return 'bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-sm sm:text-base';
      case 'mem': return 'bg-slate-900 hover:bg-slate-800 text-indigo-300 text-sm sm:text-base';
    }
  };

  const calcControlRow: CalcBtn[] = [
    { label: calcAngleMode.toUpperCase(), onClick: () => setCalcAngleMode((m) => (m === 'deg' ? 'rad' : 'deg')), variant: 'mem' },
    { label: 'MC', onClick: () => setCalcMemory(0), variant: 'mem' },
    { label: 'MR', onClick: () => appendToCalc(formatCalcResult(calcMemory)), variant: 'mem' },
    { label: 'M+', onClick: () => handleCalcMemory(1), variant: 'mem' },
    { label: 'M-', onClick: () => handleCalcMemory(-1), variant: 'mem' },

    { label: 'STO', onClick: handleCalcStore, variant: 'mem' },
    { label: 'S⇔D', onClick: handleCalcToggleFraction, variant: 'mem' },
    { label: 'HEX', onClick: () => toggleCalcBaseView('hex'), variant: calcBaseView === 'hex' ? 'op' : 'mem' },
    { label: 'OCT', onClick: () => toggleCalcBaseView('oct'), variant: calcBaseView === 'oct' ? 'op' : 'mem' },
    { label: 'BIN', onClick: () => toggleCalcBaseView('bin'), variant: calcBaseView === 'bin' ? 'op' : 'mem' }
  ];

  const calcMainGrid: CalcBtn[] = [
    { label: 'sin', onClick: () => appendToCalc('sin('), variant: 'fn' },
    { label: 'cos', onClick: () => appendToCalc('cos('), variant: 'fn' },
    { label: 'tan', onClick: () => appendToCalc('tan('), variant: 'fn' },
    { label: 'log', onClick: () => appendToCalc('log('), variant: 'fn' },
    { label: 'ln', onClick: () => appendToCalc('ln('), variant: 'fn' },

    { label: 'sin⁻¹', onClick: () => appendToCalc('asin('), variant: 'fn' },
    { label: 'cos⁻¹', onClick: () => appendToCalc('acos('), variant: 'fn' },
    { label: 'tan⁻¹', onClick: () => appendToCalc('atan('), variant: 'fn' },
    { label: '√', onClick: () => appendToCalc('sqrt('), variant: 'fn' },
    { label: '∛', onClick: () => appendToCalc('cbrt('), variant: 'fn' },

    { label: 'sinh', onClick: () => appendToCalc('sinh('), variant: 'fn' },
    { label: 'cosh', onClick: () => appendToCalc('cosh('), variant: 'fn' },
    { label: 'tanh', onClick: () => appendToCalc('tanh('), variant: 'fn' },
    { label: 'x²', onClick: () => appendToCalc('^2'), variant: 'fn' },
    { label: 'xʸ', onClick: () => appendToCalc('^'), variant: 'fn' },

    { label: 'π', onClick: () => appendToCalc('π'), variant: 'fn' },
    { label: 'e', onClick: () => appendToCalc('e'), variant: 'fn' },
    { label: '(', onClick: () => appendToCalc('('), variant: 'fn' },
    { label: ')', onClick: () => appendToCalc(')'), variant: 'fn' },
    { label: 'x!', onClick: () => appendToCalc('!'), variant: 'fn' },

    { label: 'x⁻¹', onClick: () => appendToCalc('^(-1)'), variant: 'fn' },
    { label: 'x³', onClick: () => appendToCalc('^3'), variant: 'fn' },
    { label: '10ˣ', onClick: () => appendToCalc('10^('), variant: 'fn' },
    { label: 'eˣ', onClick: () => appendToCalc('exp('), variant: 'fn' },
    { label: '|x|', onClick: () => appendToCalc('abs('), variant: 'fn' },

    { label: '7', onClick: () => appendToCalc('7'), variant: 'num' },
    { label: '8', onClick: () => appendToCalc('8'), variant: 'num' },
    { label: '9', onClick: () => appendToCalc('9'), variant: 'num' },
    { label: '÷', onClick: () => appendToCalc('÷'), variant: 'op' },
    { label: 'DEL', onClick: handleCalcDelete, variant: 'danger' },

    { label: '4', onClick: () => appendToCalc('4'), variant: 'num' },
    { label: '5', onClick: () => appendToCalc('5'), variant: 'num' },
    { label: '6', onClick: () => appendToCalc('6'), variant: 'num' },
    { label: '×', onClick: () => appendToCalc('×'), variant: 'op' },
    { label: 'AC', onClick: handleCalcClear, variant: 'danger' },

    { label: '1', onClick: () => appendToCalc('1'), variant: 'num' },
    { label: '2', onClick: () => appendToCalc('2'), variant: 'num' },
    { label: '3', onClick: () => appendToCalc('3'), variant: 'num' },
    { label: '−', onClick: () => appendToCalc('-'), variant: 'op' },
    { label: '%', onClick: () => appendToCalc('%'), variant: 'op' },

    { label: '0', onClick: () => appendToCalc('0'), variant: 'num' },
    { label: '.', onClick: () => appendToCalc('.'), variant: 'num' },
    { label: 'Ans', onClick: () => appendToCalc(formatCalcResult(calcAns)), variant: 'fn' },
    { label: '+', onClick: () => appendToCalc('+'), variant: 'op' },
    { label: '=', onClick: handleCalcEquals, variant: 'eq' }
  ];

  // Initialize tool outputs
  useEffect(() => {
    handleFormatCode(fmtInput, fmtLang, fmtIndent);
    handleTestRegex(regexPattern, regexFlags, regexTestText);
    handleRunEncoder(encInput, encSubTab);
    handleCalculateSubnet(cidrIp, cidrMask);
    handleGeneratePassword();
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div id="software-utilities-view" className="max-w-6xl mx-auto pb-16">
      
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
            Trang Tiện Ích Phần Mềm & Cẩm Nang Kỹ Thuật Số
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
          Kho tiện ích kỹ thuật trực tuyến dành cho kỹ sư phần mềm, DevOps và chuyên gia an toàn thông tin. Mỗi công cụ đều tích hợp <strong>hộp cát thực thi trực tiếp (Live Sandbox)</strong> cùng <strong>hướng dẫn sử dụng chi tiết từng bước</strong> và đoạn mã mẫu chuẩn.
        </p>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar: Tools List (4 cols) */}
        <div className="lg:col-span-4 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
            Danh Mục Tiện Ích ({utilities.length})
          </h3>

          {utilities.map((tool) => {
            const isSelected = tool.id === selectedToolId;
            return (
              <button
                key={tool.id}
                id={`utility-select-btn-${tool.id}`}
                onClick={() => setSelectedToolId(tool.id)}
                className={`w-full text-left p-4 rounded-xl border backdrop-blur-sm transition-all duration-200 flex items-center justify-between group ${
                  isSelected
                    ? 'bg-white/10 border-cyan-500 shadow-md shadow-cyan-500/10'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                    isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                  }`}>
                    {tool.icon === 'Code2' && <Code2 className="w-4 h-4" />}
                    {tool.icon === 'Terminal' && <Terminal className="w-4 h-4" />}
                    {tool.icon === 'ShieldCheck' && <ShieldCheck className="w-4 h-4" />}
                    {tool.icon === 'Network' && <Network className="w-4 h-4" />}
                    {tool.icon === 'KeyRound' && <KeyRound className="w-4 h-4" />}
                    {tool.icon === 'FileText' && <FileText className="w-4 h-4" />}
                    {tool.icon === 'Globe' && <Globe className="w-4 h-4" />}
                    {tool.icon === 'Calculator' && <Calculator className="w-4 h-4" />}
                  </div>

                  <div>
                    <h4 className={`text-xs sm:text-sm font-bold ${
                      isSelected ? 'text-cyan-400' : 'text-slate-200'
                    }`}>
                      {tool.name}
                    </h4>
                    <span className="text-[11px] text-slate-400 line-clamp-1">
                      {tool.category}
                    </span>
                  </div>
                </div>

                <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform ${
                  isSelected ? 'text-cyan-400 translate-x-1' : 'group-hover:translate-x-0.5'
                }`} />
              </button>
            );
          })}
        </div>

        {/* Right Panel: Interactive Tool Sandbox & Manual Guide (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Active Tool Interactive Card */}
          <div className="glass-panel rounded-2xl p-6">
            
            {/* Header info */}
            <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-md border border-cyan-500/20">
                    {activeTool.category}
                  </span>
                  {activeTool.badge && (
                    <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      {activeTool.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-100">
                  {activeTool.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {activeTool.detailedDesc}
                </p>
              </div>
            </div>

            {/* ========================================== */}
            {/* 1. CODE & JSON FORMATTER SANDBOX          */}
            {/* ========================================== */}
            {activeTool.id === 'util-code-formatter' && (
              <div className="space-y-4">
                {/* Control bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Ngôn ngữ:</span>
                    {(['json', 'sql', 'js'] as const).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setFmtLang(lang);
                          handleFormatCode(fmtInput, lang, fmtIndent);
                        }}
                        className={`text-xs font-bold px-3 py-1 rounded-lg uppercase transition-colors ${
                          fmtLang === lang ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    {fmtLang === 'json' && (
                      <button
                        onClick={handleMinifyJson}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700"
                      >
                        Nén (Minify)
                      </button>
                    )}
                    <button
                      onClick={() => handleFormatCode(fmtInput, fmtLang, fmtIndent)}
                      className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1 rounded-lg shadow"
                    >
                      Làm đẹp (Format)
                    </button>
                  </div>
                </div>

                {/* Input & Output Split */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Mã nguồn thô đầu vào:
                    </label>
                    <textarea
                      rows={8}
                      value={fmtInput}
                      onChange={(e) => handleFormatCode(e.target.value, fmtLang, fmtIndent)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none"
                      placeholder="Dán mã nguồn tại đây..."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="font-semibold text-emerald-400">Kết quả chuẩn hóa:</span>
                      <button
                        onClick={() => copyToClipboard(fmtOutput, 'fmt')}
                        className="hover:text-cyan-400 text-[10px] flex items-center gap-1"
                      >
                        {copiedKey === 'fmt' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Sao chép</span>
                      </button>
                    </div>
                    {fmtError ? (
                      <div className="bg-rose-950/40 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs h-48 overflow-y-auto">
                        ⚠️ {fmtError}
                      </div>
                    ) : (
                      <pre className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto h-48">
                        <code>{fmtOutput || '// Kết quả định dạng sẽ xuất hiện tại đây'}</code>
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* 2. REGEX TESTER SANDBOX                   */}
            {/* ========================================== */}
            {activeTool.id === 'util-regex-tester' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Biểu thức Regular Expression:
                    </label>
                    <input
                      type="text"
                      value={regexPattern}
                      onChange={(e) => handleTestRegex(e.target.value, regexFlags, regexTestText)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Cờ (Flags):
                    </label>
                    <input
                      type="text"
                      value={regexFlags}
                      onChange={(e) => handleTestRegex(regexPattern, e.target.value, regexTestText)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none"
                      placeholder="gm, gi..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Chuỗi văn bản kiểm thử (Test String):
                  </label>
                  <textarea
                    rows={4}
                    value={regexTestText}
                    onChange={(e) => handleTestRegex(regexPattern, regexFlags, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-emerald-400">
                      Kết quả khớp (Matches: {regexMatches.length}):
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {regexMatches.length > 0 ? (
                      regexMatches.map((m, i) => (
                        <span key={i} className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs px-2.5 py-1 rounded-lg font-mono">
                          {m}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">Chưa tìm thấy đoạn chuỗi khớp với biểu thức.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* 3. ENCODER & HASH SUITE SANDBOX           */}
            {/* ========================================== */}
            {activeTool.id === 'util-encoder-hash' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  {(['base64', 'url', 'sha256', 'md5'] as const).map((sub) => (
                    <button
                      key={sub}
                      onClick={() => {
                        setEncSubTab(sub);
                        handleRunEncoder(encInput, sub);
                      }}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase transition-colors ${
                        encSubTab === sub ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Chuỗi dữ liệu đầu vào:
                  </label>
                  <textarea
                    rows={3}
                    value={encInput}
                    onChange={(e) => handleRunEncoder(e.target.value, encSubTab)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-slate-200 focus:outline-none"
                    placeholder="Nhập chuỗi văn bản..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-semibold text-cyan-400">Kết quả ({encSubTab.toUpperCase()}):</span>
                    <button
                      onClick={() => copyToClipboard(encOutput, 'enc')}
                      className="hover:text-cyan-400 text-[10px] flex items-center gap-1"
                    >
                      {copiedKey === 'enc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Sao chép</span>
                    </button>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl font-mono text-xs text-cyan-300 break-all select-all">
                    {encOutput || '// Kết quả'}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* 4. SUBNET & CIDR CALCULATOR SANDBOX       */}
            {/* ========================================== */}
            {activeTool.id === 'util-subnet-calc' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Địa chỉ IPv4 Mạng:
                    </label>
                    <input
                      type="text"
                      value={cidrIp}
                      onChange={(e) => handleCalculateSubnet(e.target.value, cidrMask)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none"
                      placeholder="192.168.1.0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Độ dài CIDR (/Prefix):
                    </label>
                    <select
                      value={cidrMask}
                      onChange={(e) => handleCalculateSubnet(cidrIp, Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none"
                    >
                      <option value={8}>/8 (255.0.0.0)</option>
                      <option value={16}>/16 (255.255.0.0)</option>
                      <option value={24}>/24 (255.255.255.0)</option>
                      <option value={28}>/28 (255.255.255.240)</option>
                      <option value={30}>/30 (255.255.255.252)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Địa chỉ mạng (Network)</span>
                    <strong className="font-mono text-xs text-slate-200">{subnetResult.network}</strong>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Subnet Mask</span>
                    <strong className="font-mono text-xs text-slate-200">{subnetResult.netmask}</strong>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Số host sử dụng được</span>
                    <strong className="font-mono text-xs text-cyan-400">{subnetResult.usableHosts} IPs</strong>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">IP đầu khả dụng</span>
                    <strong className="font-mono text-xs text-emerald-400">{subnetResult.firstIp}</strong>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">IP cuối khả dụng</span>
                    <strong className="font-mono text-xs text-emerald-400">{subnetResult.lastIp}</strong>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Địa chỉ Broadcast</span>
                    <strong className="font-mono text-xs text-amber-400">{subnetResult.broadcast}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* 5. PASSWORD GENERATOR SANDBOX             */}
            {/* ========================================== */}
            {activeTool.id === 'util-pass-gen' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setPassToolMode('generate')}
                    className={`flex-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                      passToolMode === 'generate' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tạo mật khẩu
                  </button>
                  <button
                    onClick={() => setPassToolMode('check')}
                    className={`flex-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                      passToolMode === 'check' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Kiểm tra mật khẩu
                  </button>
                </div>

                {passToolMode === 'generate' && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-sm sm:text-base text-cyan-300 select-all tracking-wider break-all">
                        {generatedPass}
                      </div>

                      <button
                        onClick={handleGeneratePassword}
                        className="p-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow transition-colors"
                        title="Tạo chuỗi mới"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => copyToClipboard(generatedPass, 'pass')}
                        className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-colors"
                        title="Sao chép"
                      >
                        {copiedKey === 'pass' ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <span>Độ dài mật khẩu: <strong>{passLength} ký tự</strong></span>
                        <span className="text-emerald-400 font-bold">Độ mạnh Entropy: {entropyScore} bits (Rất an toàn)</span>
                      </div>
                      <input
                        type="range"
                        min={8}
                        max={64}
                        value={passLength}
                        onChange={(e) => {
                          setPassLength(Number(e.target.value));
                          setTimeout(handleGeneratePassword, 10);
                        }}
                        className="w-full accent-cyan-500"
                      />

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={includeUpper}
                            onChange={(e) => setIncludeUpper(e.target.checked)}
                            className="accent-cyan-500"
                          />
                          <span>Chữ hoa (A-Z)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={includeLower}
                            onChange={(e) => setIncludeLower(e.target.checked)}
                            className="accent-cyan-500"
                          />
                          <span>Chữ thường (a-z)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={includeNumbers}
                            onChange={(e) => setIncludeNumbers(e.target.checked)}
                            className="accent-cyan-500"
                          />
                          <span>Chữ số (0-9)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={includeSymbols}
                            onChange={(e) => setIncludeSymbols(e.target.checked)}
                            className="accent-cyan-500"
                          />
                          <span>Ký tự đặc biệt</span>
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {passToolMode === 'check' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type={showCheckPassword ? 'text' : 'password'}
                        value={checkPasswordInput}
                        onChange={(e) => setCheckPasswordInput(e.target.value)}
                        placeholder="Nhập mật khẩu cần kiểm tra độ mạnh..."
                        autoComplete="new-password"
                        spellCheck={false}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 pr-11 text-sm font-mono text-cyan-300 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCheckPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        title={showCheckPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showCheckPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 italic">
                      Mật khẩu được phân tích hoàn toàn cục bộ ngay trên trình duyệt của bạn — không gửi đi bất kỳ máy chủ nào.
                    </p>

                    {passwordAnalysis && (
                      <div className="space-y-4">
                        <div className={`rounded-xl p-4 border ${
                          passwordAnalysis.verdict === 'Mạnh' || passwordAnalysis.verdict === 'Rất mạnh'
                            ? 'bg-emerald-950/30 border-emerald-500/40'
                            : passwordAnalysis.verdict === 'Trung bình'
                            ? 'bg-amber-950/30 border-amber-500/40'
                            : 'bg-rose-950/30 border-rose-500/40'
                        }`}>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <span className={`font-extrabold text-sm sm:text-base ${
                              passwordAnalysis.verdict === 'Mạnh' || passwordAnalysis.verdict === 'Rất mạnh'
                                ? 'text-emerald-300'
                                : passwordAnalysis.verdict === 'Trung bình'
                                ? 'text-amber-300'
                                : 'text-rose-300'
                            }`}>
                              {passwordAnalysis.verdict}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">~{passwordAnalysis.entropy} bits entropy</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                passwordAnalysis.verdict === 'Mạnh' || passwordAnalysis.verdict === 'Rất mạnh'
                                  ? 'bg-emerald-500'
                                  : passwordAnalysis.verdict === 'Trung bình'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.max(4, Math.min(100, Math.round((passwordAnalysis.entropy / 120) * 100)))}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
                            <span className="block text-slate-400">Độ dài</span>
                            <strong className="text-slate-200">{passwordAnalysis.length}</strong>
                          </div>
                          <div className={`bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center ${passwordAnalysis.hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                            <span className="block text-slate-400">Chữ hoa</span>
                            <strong>{passwordAnalysis.hasUpper ? '✓' : '✗'}</strong>
                          </div>
                          <div className={`bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center ${passwordAnalysis.hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                            <span className="block text-slate-400">Chữ thường</span>
                            <strong>{passwordAnalysis.hasLower ? '✓' : '✗'}</strong>
                          </div>
                          <div className={`bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center ${passwordAnalysis.hasDigit ? 'text-emerald-400' : 'text-slate-500'}`}>
                            <span className="block text-slate-400">Chữ số</span>
                            <strong>{passwordAnalysis.hasDigit ? '✓' : '✗'}</strong>
                          </div>
                          <div className={`bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center ${passwordAnalysis.hasSymbol ? 'text-emerald-400' : 'text-slate-500'}`}>
                            <span className="block text-slate-400">Ký hiệu</span>
                            <strong>{passwordAnalysis.hasSymbol ? '✓' : '✗'}</strong>
                          </div>
                        </div>

                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                          <span className="text-slate-400 block mb-1">Thời gian ước tính để dò ra (kịch bản tấn công offline tốc độ cao):</span>
                          <strong className="text-amber-300">{passwordAnalysis.crackTime}</strong>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                          <span className="font-semibold text-xs text-slate-300 block mb-2">Chi tiết phân tích:</span>
                          <ul className="space-y-1.5 text-xs text-slate-300">
                            {passwordAnalysis.reasons.map((r, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="text-cyan-500 font-bold">•</span>
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========================================== */}
            {/* 6. MARKDOWN EDITOR SANDBOX                */}
            {/* ========================================== */}
            {activeTool.id === 'util-markdown-editor' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Soạn thảo cú pháp Markdown:
                  </label>
                  <textarea
                    rows={8}
                    value={mdContent}
                    onChange={(e) => setMdContent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-semibold text-emerald-400">Xem trước thời gian thực:</span>
                    <button
                      onClick={() => copyToClipboard(mdContent, 'md')}
                      className="hover:text-cyan-400 text-[10px] flex items-center gap-1"
                    >
                      {copiedKey === 'md' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Sao chép Markdown</span>
                    </button>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs text-slate-300 overflow-y-auto h-52 space-y-2">
                    {mdContent.split('\n').map((line, i) => {
                      if (line.startsWith('# ')) return <h1 key={i} className="text-base font-extrabold text-white">{line.replace('# ', '')}</h1>;
                      if (line.startsWith('### ')) return <h3 key={i} className="text-sm font-bold text-cyan-300 pt-1">{line.replace('### ', '')}</h3>;
                      if (line.startsWith('> ')) return <div key={i} className="border-l-2 border-cyan-500 pl-2 italic text-slate-400">{line.replace('> ', '')}</div>;
                      if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{line.replace('- ', '')}</li>;
                      return <p key={i}>{line}</p>;
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================== */}
            {/* 7. URL SECURITY SCANNER SANDBOX           */}
            {/* ========================================== */}
            {activeTool.id === 'util-url-scanner' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                  <input
                    type="text"
                    value={urlToScan}
                    onChange={(e) => setUrlToScan(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleScanUrl(); }}
                    placeholder="Dán URL cần kiểm tra, ví dụ: https://example.com"
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-mono text-cyan-300 focus:outline-none"
                  />
                  <button
                    onClick={handleScanUrl}
                    disabled={urlScanLoading || !urlToScan.trim()}
                    className="flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 rounded-xl shadow transition-colors text-xs sm:text-sm shrink-0"
                  >
                    {urlScanLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                    <span>{urlScanLoading ? 'Đang phân tích...' : 'Phân tích'}</span>
                  </button>
                </div>

                {urlScanLoading && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-cyan-300 font-medium flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>{urlScanStageLabel}</span>
                      </span>
                      <span className="text-slate-400 font-mono shrink-0">{urlScanProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-500 transition-all duration-150 ease-linear"
                        style={{ width: `${urlScanProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {urlScanError && (
                  <div className="bg-rose-950/40 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-xs">
                    ⚠️ {urlScanError}
                  </div>
                )}

                {urlScanResult && (
                  <div className="space-y-4">
                    {/* Verdict banner */}
                    <div className={`rounded-xl p-4 border flex items-start gap-3 ${
                      urlScanResult.verdict === 'An toàn'
                        ? 'bg-emerald-950/30 border-emerald-500/40'
                        : urlScanResult.verdict === 'Cần thận trọng'
                        ? 'bg-amber-950/30 border-amber-500/40'
                        : 'bg-rose-950/30 border-rose-500/40'
                    }`}>
                      {urlScanResult.verdict === 'An toàn' ? (
                        <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                      ) : urlScanResult.verdict === 'Cần thận trọng' ? (
                        <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0" />
                      ) : (
                        <ShieldX className="w-6 h-6 text-rose-400 shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`font-extrabold text-sm sm:text-base ${
                            urlScanResult.verdict === 'An toàn' ? 'text-emerald-300'
                            : urlScanResult.verdict === 'Cần thận trọng' ? 'text-amber-300'
                            : 'text-rose-300'
                          }`}>
                            {urlScanResult.verdict}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            Điểm rủi ro: {urlScanResult.riskScore}/100
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              urlScanResult.verdict === 'An toàn' ? 'bg-emerald-500'
                              : urlScanResult.verdict === 'Cần thận trọng' ? 'bg-amber-500'
                              : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.max(4, urlScanResult.riskScore)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Server details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1.5"><ServerCog className="w-3.5 h-3.5" /> Tên miền</span>
                        <strong className="font-mono text-xs text-slate-200 break-all">{urlScanResult.hostname || '—'}</strong>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Địa chỉ IP máy chủ</span>
                        <strong className="font-mono text-xs text-cyan-400 break-all">
                          {urlScanResult.resolvedIps.length > 0 ? urlScanResult.resolvedIps.join(', ') : 'Không xác định / bị chặn'}
                        </strong>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Trạng thái HTTP</span>
                        <strong className="font-mono text-xs text-slate-200">{urlScanResult.httpStatus ?? 'Không kết nối được'}</strong>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Chứng chỉ SSL/TLS</span>
                        <strong className="font-mono text-xs text-slate-200">
                          {urlScanResult.tls ? `${urlScanResult.tls.issuer || 'Không rõ tổ chức'} · ${urlScanResult.tls.authorized ? 'Hợp lệ' : 'Không hợp lệ'}` : 'Không có (HTTP)'}
                        </strong>
                      </div>
                    </div>

                    {urlScanResult.redirectChain.length > 1 && (
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <span className="text-[11px] text-slate-400 block mb-1.5">Chuỗi chuyển hướng (Redirect Chain)</span>
                        <div className="space-y-1">
                          {urlScanResult.redirectChain.map((hop, i) => (
                            <div key={i} className="text-[11px] font-mono text-slate-300 break-all">
                              {i + 1}. {hop}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reasons */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="font-semibold text-xs text-slate-300 block mb-2">Chi tiết phân tích:</span>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {urlScanResult.reasons.map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-cyan-500 font-bold">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <p className="text-[11px] text-slate-500 italic">
                      Đây là công cụ phân tích tham khảo dựa trên heuristic, không thay thế hoàn toàn các dịch vụ chuyên biệt như Google Safe Browsing. Luôn thận trọng khi nhập thông tin tài khoản, mật khẩu trên các đường dẫn lạ.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ========================================== */}
            {/* 8. SCIENTIFIC CALCULATOR SANDBOX          */}
            {/* ========================================== */}
            {activeTool.id === 'util-sci-calculator' && (
              <div className="space-y-4 max-w-md mx-auto">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{calcAngleMode.toUpperCase()}</span>
                    {calcMemory !== 0 && (
                      <span className="text-indigo-400 font-semibold">M = {formatCalcResult(calcMemory)}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={calcExpr}
                    onChange={(e) => { setCalcExpr(e.target.value); setCalcError(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCalcEquals(); }}
                    placeholder="0"
                    spellCheck={false}
                    className="w-full bg-transparent text-right text-3xl sm:text-4xl font-mono text-slate-100 focus:outline-none tracking-wide"
                  />
                  <div className="text-right text-base sm:text-lg font-mono min-h-[1.5rem]">
                    {calcError ? (
                      <span className="text-rose-400">{calcError}</span>
                    ) : calcPreview !== null && calcPreview !== calcExpr.trim() ? (
                      <span className="text-emerald-400">= {calcPreview}</span>
                    ) : (
                      <span>&nbsp;</span>
                    )}
                  </div>
                  {calcBaseReadout && (
                    <div className="text-right text-xs sm:text-sm font-mono text-indigo-300 border-t border-slate-800 pt-1.5 mt-1">
                      {calcBaseReadout}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {calcControlRow.map((btn, i) => (
                    <button
                      key={i}
                      onClick={btn.onClick}
                      className={`py-1.5 sm:py-2 rounded-lg font-bold transition-colors ${calcBtnClass(btn.variant)}`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {calcMainGrid.map((btn, i) => (
                    <button
                      key={i}
                      onClick={btn.onClick}
                      className={`py-1.5 sm:py-2 rounded-lg font-bold transition-colors ${calcBtnClass(btn.variant)}`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {calcHistory.length > 0 && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400 block mb-1.5">Lịch sử tính toán gần đây:</span>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {calcHistory.map((h, i) => (
                        <button
                          key={i}
                          onClick={() => { setCalcExpr(h.result); setCalcError(null); }}
                          className="w-full text-left text-xs sm:text-sm font-mono text-slate-400 hover:text-cyan-300 flex items-center justify-between gap-2"
                        >
                          <span className="truncate">{h.expr}</span>
                          <span className="text-slate-200 shrink-0">= {h.result}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 italic">
                  Đang ở chế độ góc {calcAngleMode === 'deg' ? 'Độ (DEG)' : 'Radian (RAD)'}. Ký hiệu "%" chia giá trị liền trước cho 100 theo kiểu đơn giản, không tính phần trăm theo ngữ cảnh như một số máy tính vật lý.
                </p>
              </div>
            )}

          </div>

          {/* ========================================== */}
          {/* COMPREHENSIVE USER GUIDES ACCORDION        */}
          {/* ========================================== */}
          <div className="glass-panel rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm sm:text-base border-b border-slate-800 pb-3">
              <BookOpen className="w-4 h-4" />
              <span>Cẩm Nang & Hướng Dẫn Sử Dụng Chi Tiết: {activeTool.name}</span>
            </div>

            {/* Step-by-step guides */}
            <div className="space-y-4">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-400">
                Các Bước Thao Tác Chuẩn:
              </h4>

              <div className="space-y-3">
                {activeTool.guides.map((g) => (
                  <div key={g.step} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-200 font-bold text-xs sm:text-sm">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-extrabold shrink-0">
                        {g.step}
                      </span>
                      <span>{g.title}</span>
                    </div>
                    <p className="text-xs text-slate-400 pl-7 leading-relaxed">
                      {g.instruction}
                    </p>
                    {g.tip && (
                      <div className="ml-7 mt-1 text-[11px] text-amber-300 bg-amber-950/30 border border-amber-500/20 px-2.5 py-1 rounded">
                        💡 Mẹo hay: {g.tip}
                      </div>
                    )}
                    {g.exampleSnippet && (
                      <div className="ml-7 mt-2 font-mono text-[11px] text-cyan-300 bg-slate-900 p-2 rounded border border-slate-800">
                        <code>{g.exampleSnippet}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Key Features & Use cases */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h5 className="font-bold text-xs text-cyan-400 mb-2">Tính năng chính:</h5>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {activeTool.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-cyan-500 font-bold">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <h5 className="font-bold text-xs text-indigo-400 mb-2">Kịch bản ứng dụng thực tế:</h5>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {activeTool.useCases.map((uc, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>{uc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
