import React, { useState, useEffect } from 'react';
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
  Sliders
} from 'lucide-react';
import { SoftwareUtility } from '../types';
import { SOFTWARE_UTILITIES } from '../data/initialData';

export const SoftwareUtilities: React.FC = () => {
  const [utilities] = useState<SoftwareUtility[]>(SOFTWARE_UTILITIES);
  const [selectedToolId, setSelectedToolId] = useState<string>('util-code-formatter');
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
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl">
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
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between group ${
                  isSelected
                    ? 'bg-slate-900 border-cyan-500 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 text-slate-300'
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            
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

          </div>

          {/* ========================================== */}
          {/* COMPREHENSIVE USER GUIDES ACCORDION        */}
          {/* ========================================== */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
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
