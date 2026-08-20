import React, { useState, useRef } from 'react';
import { 
  PlusCircle, 
  Upload, 
  FileText, 
  Sparkles, 
  Trash2, 
  Check, 
  HelpCircle, 
  Clock, 
  Award, 
  Code, 
  Download, 
  FileCode,
  AlertCircle,
  X,
  Layers,
  FileCheck
} from 'lucide-react';
import { QuizExam, QuizQuestion, QuizOption } from '../types';
import { storageService } from '../services/storageService';

interface QuizCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExamCreated: (exam: QuizExam) => void;
}

const SAMPLE_QUIZ_TEXT = `1. Trong kiến trúc microservices hiện đại, pattern nào giúp duy trì tính nhất quán dữ liệu giữa các dịch vụ phân tán?
A. Singleton Pattern
B. Saga Pattern (Choreography hoặc Orchestration)
C. MVC Pattern
D. Prototype Pattern
Đáp án: B
Giải thích: Saga Pattern chia nhỏ một transaction lớn thành chuỗi các local transaction với các compensating transaction để rollback khi có lỗi.

2. Đoạn mã TypeScript sau dùng tính năng nào để kiểm tra kiểu lúc build-time?
function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}
A. Exhaustive Type Checking
B. Runtime Reflection
C. Dynamic Duck Typing
D. Memory Allocation
Đáp án: A
Giải thích: Kiểu 'never' đảm bảo rằng toàn bộ các trường hợp của union type đã được xử lý đầy đủ trong khối switch/if.

3. Thuật toán ML-KEM (Kyber) được thiết kế nhằm mục đích bảo mật nào?
A. Nén dung lượng video 4K
B. Đóng gói khóa an toàn trước máy tính lượng tử (Post-Quantum Cryptography)
C. Tăng tốc độ truy vấn cơ sở dữ liệu NoSQL
D. Quản lý bộ nhớ RAM ảo
Đáp án: B
Giải thích: ML-KEM là chuẩn mật mã hậu lượng tử thay thế ECDH theo tiêu chuẩn FIPS 203 của NIST.`;

export const QuizCreatorModal: React.FC<QuizCreatorModalProps> = ({
  isOpen,
  onClose,
  onExamCreated,
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'ai-prompt' | 'manual'>('upload');
  
  // Exam metadata
  const [title, setTitle] = useState('Đề Khảo Sát Kỹ Thuật Số Mới 2026');
  const [description, setDescription] = useState('Bộ đề thi trắc nghiệm chuyên sâu kiểm tra kiến thức công nghệ.');
  const [category, setCategory] = useState('Trí tuệ Nhân tạo');
  const [difficulty, setDifficulty] = useState<'Cơ bản' | 'Trung bình' | 'Nâng cao' | 'Chuyên gia'>('Trung bình');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [passScorePercent, setPassScorePercent] = useState(70);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawFileText, setRawFileText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Prompt generation state
  const [aiTopic, setAiTopic] = useState('Kiến trúc Đám mây AWS & Kubernetes');
  const [aiQuestionCount, setAiQuestionCount] = useState(5);

  // Questions list editor
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      id: 'q1',
      question: 'Câu hỏi mẫu: Đâu là lợi ích lớn nhất của việc áp dụng Microservices?',
      options: [
        { id: 'A', text: 'Khả năng phát triển, kiểm thử và mở rộng độc lập từng dịch vụ' },
        { id: 'B', text: 'Giảm số lượng máy chủ cần thuê' },
        { id: 'C', text: 'Loại bỏ hoàn toàn nhu cầu viết Unit Test' },
        { id: 'D', text: 'Mã nguồn chạy nhanh hơn 100 lần' },
      ],
      correctOptionId: 'A',
      explanation: 'Microservices cho phép các team độc lập tự chủ triển khai và scale riêng biệt từng module nghiệp vụ.',
      difficulty: 'Dễ',
      topic: 'Kiến trúc'
    }
  ]);

  if (!isOpen) return null;

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawFileText(content || '');
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawFileText(content || '');
    };
    reader.readAsText(file);
  };

  // Load sample template text
  const handleLoadSampleText = () => {
    setRawFileText(SAMPLE_QUIZ_TEXT);
    setUploadedFile(new File([SAMPLE_QUIZ_TEXT], 'de_thi_mau_cong_nghe.txt', { type: 'text/plain' }));
  };

  // Process and parse the uploaded file / text
  const handleParseQuizFile = async () => {
    if (!rawFileText.trim()) {
      alert('Vui lòng tải lên tệp hoặc dán nội dung câu hỏi và đáp án trước khi phân tích.');
      return;
    }

    setIsProcessing(true);
    setParseMessage('Đang phân tích cấu trúc câu hỏi và đáp án...');

    try {
      // First try JSON parse if it's already a JSON file
      try {
        const directJson = JSON.parse(rawFileText);
        if (directJson.questions && Array.isArray(directJson.questions)) {
          setTitle(directJson.title || title);
          setDescription(directJson.description || description);
          setCategory(directJson.category || category);
          setDurationMinutes(directJson.durationMinutes || durationMinutes);
          setQuestions(directJson.questions);
          setParseMessage(`Đã trích xuất thành công ${directJson.questions.length} câu hỏi từ tệp JSON!`);
          setIsProcessing(false);
          return;
        }
      } catch {
        // Not a direct JSON, continue to AI/Local text parser
      }

      const res = await fetch('/api/ai/parse-quiz-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: rawFileText,
          fileName: uploadedFile?.name || 'quiz_file.txt',
        }),
      });

      const result = await res.json();
      if (result && result.data && result.data.questions) {
        setTitle(result.data.title || `Đề thi từ ${uploadedFile?.name || 'tệp đính kèm'}`);
        setDescription(result.data.description || description);
        if (result.data.category) setCategory(result.data.category);
        if (result.data.durationMinutes) setDurationMinutes(result.data.durationMinutes);
        setQuestions(result.data.questions);
        setParseMessage(`Trích xuất thành công ${result.data.questions.length} câu hỏi (${result.source === 'gemini' ? 'Gemini AI thông minh' : 'Bộ phân tích cấu trúc'})!`);
      } else {
        throw new Error('Dữ liệu trả về không đúng cấu trúc đề thi');
      }
    } catch (err: any) {
      console.warn('Parser fallback:', err);
      setParseMessage('Đã chuyển sang chế độ tự động điền câu hỏi.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate quiz with Gemini AI by Topic
  const handleGenerateAiQuiz = async () => {
    if (!aiTopic.trim()) return;

    setIsProcessing(true);
    setParseMessage(`Gemini AI đang biên soạn bộ ${aiQuestionCount} câu hỏi về "${aiTopic}"...`);

    try {
      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic,
          count: aiQuestionCount,
          difficulty: difficulty,
        }),
      });

      const result = await res.json();
      if (result && result.data && result.data.questions) {
        setTitle(result.data.title || `Đề thi: ${aiTopic}`);
        setDescription(result.data.description || `Bộ câu hỏi kiểm tra kiến thức về ${aiTopic}`);
        setQuestions(result.data.questions);
        setDurationMinutes(result.data.durationMinutes || aiQuestionCount * 2);
        setParseMessage(`Đã khởi tạo thành công ${result.data.questions.length} câu hỏi trắc nghiệm chất lượng cao!`);
      } else {
        throw new Error('Không nhận được câu hỏi từ AI');
      }
    } catch (err: any) {
      alert('Không thể kết nối AI, vui lòng thử lại hoặc sử dụng tính năng tải tệp câu hỏi.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Question editing handlers
  const handleAddQuestion = () => {
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}`,
      question: 'Nhập nội dung câu hỏi mới ở đây...',
      options: [
        { id: 'A', text: 'Phương án A' },
        { id: 'B', text: 'Phương án B' },
        { id: 'C', text: 'Phương án C' },
        { id: 'D', text: 'Phương án D' },
      ],
      correctOptionId: 'A',
      explanation: 'Giải thích lý do phương án A là chính xác...',
      difficulty: 'Trung bình',
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) {
      alert('Đề thi phải có tối thiểu 1 câu hỏi.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleUpdateQuestion = (idx: number, field: keyof QuizQuestion, value: any) => {
    const updated = [...questions];
    updated[idx] = { ...updated[idx], [field]: value };
    setQuestions(updated);
  };

  const handleUpdateOption = (qIdx: number, optId: string, newText: string) => {
    const updated = [...questions];
    updated[qIdx].options = updated[qIdx].options.map((opt) =>
      opt.id === optId ? { ...opt, text: newText } : opt
    );
    setQuestions(updated);
  };

  // Final submit & save exam
  const handleSaveExam = () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên đề thi.');
      return;
    }
    if (questions.length === 0) {
      alert('Đề thi cần có ít nhất 1 câu hỏi.');
      return;
    }

    const newExam: QuizExam = {
      id: `exam-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category: category,
      difficulty: difficulty,
      durationMinutes: Number(durationMinutes) || 15,
      passScorePercent: Number(passScorePercent) || 70,
      questions: questions,
      createdAt: new Date().toISOString(),
      authorName: 'Quản trị viên / Giảng viên',
      participantsCount: 0,
      averageScore: 0,
      sourceFile: uploadedFile?.name,
      isFeatured: true,
    };

    storageService.saveExam(newExam);
    onExamCreated(newExam);
    onClose();
  };

  return (
    <div id="quiz-creator-modal-overlay" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Tạo Đề Thi & Phòng Thi Trắc Nghiệm
              </h2>
              <p className="text-xs text-slate-400">
                Nhập từ tệp văn bản đính kèm (.txt, .json, .csv) hoặc biên tập trực tiếp
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Tabs */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* Creation Mode Switcher */}
          <div className="flex items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl max-w-lg">
            <button
              onClick={() => setActiveMode('upload')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeMode === 'upload' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>1. Tải Tệp Đính Kèm</span>
            </button>

            <button
              onClick={() => setActiveMode('ai-prompt')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeMode === 'ai-prompt' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>2. Tạo Bằng AI</span>
            </button>

            <button
              onClick={() => setActiveMode('manual')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeMode === 'manual' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>3. Chỉnh Sửa ({questions.length})</span>
            </button>
          </div>

          {/* MODE 1: File Upload & Smart Parser */}
          {activeMode === 'upload' && (
            <div className="space-y-4">
              
              {/* Drag and drop box */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-cyan-500/80 bg-slate-950/60 hover:bg-slate-950 rounded-2xl p-8 text-center cursor-pointer transition-all group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".txt,.json,.csv,.doc,.docx"
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 text-cyan-400 group-hover:scale-110 flex items-center justify-center mx-auto mb-3 transition-transform shadow-md">
                  <Upload className="w-6 h-6" />
                </div>

                <h3 className="font-bold text-sm sm:text-base text-slate-200 mb-1">
                  {uploadedFile ? `Tệp đã chọn: ${uploadedFile.name}` : 'Kéo thả tệp đề thi hoặc nhấp để chọn'}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-3">
                  Hỗ trợ tệp văn bản <strong>.TXT, .JSON, .CSV</strong> chứa danh sách câu hỏi trắc nghiệm A, B, C, D kèm đáp án.
                </p>

                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadSampleText();
                    }}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                  >
                    Dán mẫu tệp đề thi chuẩn (.TXT)
                  </button>
                </div>
              </div>

              {/* Raw Text Preview & Direct Edit */}
              {rawFileText && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Nội dung văn bản nhận diện từ tệp:</span>
                    </span>
                    <span>{rawFileText.length} ký tự</span>
                  </div>

                  <textarea
                    rows={6}
                    value={rawFileText}
                    onChange={(e) => setRawFileText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
                    placeholder="Nội dung tệp câu hỏi..."
                  />

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-400">
                      Hệ thống tự động phát hiện số thứ tự câu hỏi, các lựa chọn A, B, C, D và dòng "Đáp án: X".
                    </span>

                    <button
                      onClick={handleParseQuizFile}
                      disabled={isProcessing}
                      className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isProcessing ? 'Đang trích xuất...' : 'Trích xuất đề thi tự động'}</span>
                    </button>
                  </div>
                </div>
              )}

              {parseMessage && (
                <div className="bg-cyan-950/50 border border-cyan-500/30 text-cyan-200 text-xs p-3 rounded-xl flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{parseMessage}</span>
                </div>
              )}

            </div>
          )}

          {/* MODE 2: AI Prompt Generation */}
          {activeMode === 'ai-prompt' && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Biên Soạn Đề Thi Tự Động bằng Gemini AI</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Chủ đề bài thi công nghệ</label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="VD: Bảo mật Zero-Trust, Docker & K8s, React 19, TypeScript..."
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Số lượng câu hỏi</label>
                  <select
                    value={aiQuestionCount}
                    onChange={(e) => setAiQuestionCount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none"
                  >
                    <option value={3}>3 câu hỏi ngắn</option>
                    <option value={5}>5 câu hỏi tiêu chuẩn</option>
                    <option value={10}>10 câu hỏi chuyên sâu</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleGenerateAiQuiz}
                  disabled={isProcessing}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isProcessing ? 'Đang tạo câu hỏi...' : 'Tạo Đề Thi Ngay Bằng AI'}</span>
                </button>
              </div>
            </div>
          )}

          {/* General Metadata Config */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Thông Tin Tổng Quan Đề Thi
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Tên Đề Thi</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Danh mục chuyên môn</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none"
                >
                  <option value="Trí tuệ Nhân tạo">Trí tuệ Nhân tạo</option>
                  <option value="An ninh Mạng">An ninh Mạng</option>
                  <option value="Điện toán Đám mây & DevOps">Điện toán Đám mây & DevOps</option>
                  <option value="Kiến trúc Phần mềm">Kiến trúc Phần mềm</option>
                  <option value="Phần cứng & Bán dẫn">Phần cứng & Bán dẫn</option>
                  <option value="Blockchain & Web3">Blockchain & Web3</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Mô tả ngắn</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Độ khó</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Cơ bản">Cơ bản</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Nâng cao">Nâng cao</option>
                    <option value="Chuyên gia">Chuyên gia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Thời gian (phút)</label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Điểm đạt (%)</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={passScorePercent}
                    onChange={(e) => setPassScorePercent(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Questions Visual Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Danh Sách Câu Hỏi ({questions.length})</span>
                <span className="text-xs text-slate-400 font-normal">
                  (Nhấp vào nút radio để chỉ định đáp án đúng)
                </span>
              </h4>

              <button
                type="button"
                onClick={handleAddQuestion}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Thêm câu hỏi</span>
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, qIndex) => (
                <div
                  key={q.id || qIndex}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-cyan-400 mb-1">
                        Câu hỏi {qIndex + 1}:
                      </label>
                      <textarea
                        rows={2}
                        value={q.question}
                        onChange={(e) => handleUpdateQuestion(qIndex, 'question', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                        placeholder="Nội dung câu hỏi..."
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      title="Xóa câu hỏi này"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors mt-4"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Code snippet optional */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Mã nguồn mẫu / Code Snippet (nếu có):
                    </label>
                    <textarea
                      rows={2}
                      value={q.codeSnippet || ''}
                      onChange={(e) => handleUpdateQuestion(qIndex, 'codeSnippet', e.target.value)}
                      placeholder="// Đoạn code cần phân tích trong câu hỏi..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-xs text-cyan-300 focus:outline-none"
                    />
                  </div>

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {q.options.map((opt) => {
                      const isCorrect = q.correctOptionId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                            isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleUpdateQuestion(qIndex, 'correctOptionId', opt.id)}
                            title={isCorrect ? 'Đáp án đúng' : 'Nhấp để chọn làm đáp án đúng'}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {opt.id}
                          </button>

                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => handleUpdateOption(qIndex, opt.id, e.target.value)}
                            placeholder={`Lựa chọn ${opt.id}...`}
                            className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Giải thích đáp án chi tiết:
                    </label>
                    <input
                      type="text"
                      value={q.explanation}
                      onChange={(e) => handleUpdateQuestion(qIndex, 'explanation', e.target.value)}
                      placeholder="Giải thích vì sao đáp án đúng..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                    />
                  </div>

                </div>
              ))}
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 font-semibold px-4 py-2"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleSaveExam}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-cyan-600/20 transition-all hover:scale-[1.02]"
          >
            <Check className="w-4 h-4" />
            <span>Phát Hành & Mở Phòng Thi ({questions.length} câu)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
