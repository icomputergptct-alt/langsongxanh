import React, { useState, useRef, useEffect } from 'react';
import mammoth from 'mammoth';
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
  AlertTriangle,
  X,
  Layers,
  FileCheck,
  ImagePlus,
  ImageOff,
  Save,
  FileType,
  Loader2,
  Printer,
  Library
} from 'lucide-react';
import { QuizExam, QuizQuestion, QuizOption, ExamDocument } from '../types';
import { storageService } from '../services/storageService';
import { generateExamWordBlob, generateExamPdfBlob } from '../services/examPdf';

interface QuizCreatorModalProps {
  initialMode?: 'upload' | 'ai-prompt' | 'manual';
  onClose: () => void;
  onExamCreated: (exam: QuizExam) => void;
  authorId?: string;
  authorName?: string;
  schoolName?: string;
  editingExam?: QuizExam | null;
}

// <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" in local time, not a full ISO string.
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

// mammoth.extractRawText() silently drops Word's *auto-numbered* list numbering
// (e.g. a question list where "1.", "2.", "3." are rendered by the list style, not
// typed as literal text) — it only extracts the paragraph text, not the number the
// browser/Word would render. A question doc using that style then has no "Câu N."
// marker anywhere in the extracted text at all, so the server-side line parser
// (which looks for exactly that marker to know where one question ends and the next
// begins) merges everything after the first question into it and silently drops the
// rest — the editor ends up with far fewer questions than the file actually has.
//
// convertToHtml (unlike extractRawText) keeps each auto-numbered item as a real
// <li>, so we can restore an explicit "Câu N." ourselves from list position instead.
// Block elements are flattened to one line each (matching extractRawText's shape, so
// the existing table/answer-key line-based detectors keep working); a <li> whose own
// text already starts with a single letter marker (e.g. "A. ...") is left alone since
// that's almost certainly an auto-lettered *option* list, not a question list.
const BLOCK_TAGS = new Set(['P', 'LI', 'TR', 'TD', 'TH', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

// A real inserted picture (as opposed to an OLE/Equation Editor object — see the
// warning above) extracts fine as a normal displayable data: URI. Rather than drop
// it like the equation images, emit a placeholder token holding its index into a
// side `images` array — the server-side parser (api/_app.ts) looks for this exact
// token to attach the picture as a question's questionImage or an option's image
// instead of leaving that spot blank. IMG_TOKEN_RE must stay in sync with the same
// pattern there.
const IMG_TOKEN_RE = /〔IMG:(\d+)〕/;

function htmlToNumberedText(root: Element): { text: string; images: string[] } {
  let out = '';
  let questionCounter = 0;
  const images: string[] = [];

  const walk = (node: ChildNode) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent || '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    const tag = el.tagName;
    if (tag === 'IMG') {
      const src = el.getAttribute('src') || '';
      // Only formats a browser can actually display — excludes the WMF/EMF images
      // mammoth also emits for old "Equation Editor" objects (see the warning
      // above); those have no usable content, capturing them would just paste a
      // broken image icon into the exam instead of leaving an honest blank.
      if (/^data:image\/(png|jpe?g|gif|webp|bmp);/i.test(src)) {
        out += `〔IMG:${images.length}〕`;
        images.push(src);
      }
      return;
    }
    if (tag === 'BR') {
      out += '\n';
      return;
    }

    if (tag === 'LI' && el.parentElement?.tagName === 'OL' && !/^[A-Da-d][.):\-]/.test((el.textContent || '').trim())) {
      questionCounter += 1;
      out += `Câu ${questionCounter}. `;
    }

    el.childNodes.forEach(walk);

    if (BLOCK_TAGS.has(tag)) out += '\n\n';
  };

  root.childNodes.forEach(walk);
  return { text: out, images };
}

// AI/parser output occasionally repeats an option (e.g. an explanation line like
// "Đáp án: C. Lười biếng" gets re-detected as another "C" option). Keep only the
// first occurrence of each option id, capped at A-D, so the editor never shows
// duplicate radio buttons for the same letter.
function normalizeQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  return questions.map((q) => {
    const seen = new Set<string>();
    const options = (q.options || []).filter((opt) => {
      const id = opt.id?.toUpperCase();
      if (!id || !['A', 'B', 'C', 'D'].includes(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return { ...q, options };
  });
}

export const QuizCreatorModal: React.FC<QuizCreatorModalProps> = ({
  initialMode = 'upload',
  onClose,
  onExamCreated,
  authorId,
  authorName,
  schoolName,
  editingExam,
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'ai-prompt' | 'manual'>(editingExam ? 'manual' : initialMode);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Exam metadata
  const [title, setTitle] = useState(editingExam?.title || '');
  const [description, setDescription] = useState(editingExam?.description || 'Bộ đề thi trắc nghiệm chuyên sâu kiểm tra kiến thức công nghệ.');
  const [category, setCategory] = useState(editingExam?.category || '');
  const [difficulty, setDifficulty] = useState<'Cơ bản' | 'Trung bình' | 'Nâng cao' | 'Chuyên gia'>(editingExam?.difficulty || 'Trung bình');
  const [durationMinutes, setDurationMinutes] = useState(editingExam?.durationMinutes ?? 15);
  const [passScorePercent, setPassScorePercent] = useState(editingExam?.passScorePercent ?? 70);
  const [className, setClassName] = useState(editingExam?.className || '');
  const [roomPassword, setRoomPassword] = useState(editingExam?.roomPassword || '');
  const [grade, setGrade] = useState(editingExam?.grade ? String(editingExam.grade) : '');
  const [schoolYear, setSchoolYear] = useState(editingExam?.schoolYear || '');

  // Rebuilds the exam title's trailing suffixes whenever the teacher picks a
  // duration or a school year, e.g. "ĐỀ THI ..." -> "ĐỀ THI ... - 45 PHÚT NH: 2026 - 2027".
  // Always strips both known suffixes off the current title first and re-appends
  // them from the latest values so switching either one replaces it in place
  // instead of stacking duplicates. Skipped while the title is still empty since
  // there's nothing meaningful to attach a suffix to yet.
  const syncTitleSuffixes = (mins: number, year: string) => {
    setTitle((prev) => {
      const base = prev
        .replace(/\s*NH:\s*.*$/i, '')
        .replace(/\s*-\s*\d+\s*phút\s*$/i, '')
        .trimEnd();
      if (!base) return prev;
      let next = base;
      if (mins > 0) next += ` - ${mins} PHÚT`;
      const trimmedYear = year.trim();
      if (trimmedYear) next += ` NH: ${trimmedYear}`;
      return next;
    });
  };
  const [deadlineAt, setDeadlineAt] = useState(editingExam?.deadlineAt ? toDatetimeLocalValue(editingExam.deadlineAt) : '');

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawFileText, setRawFileText] = useState('');
  const [rawFileImages, setRawFileImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [contentWarning, setContentWarning] = useState<string | null>(null);
  const [processProgress, setProcessProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Prompt generation state
  const [aiTopic, setAiTopic] = useState('Kiến trúc Đám mây AWS & Kubernetes');
  const [aiQuestionCount, setAiQuestionCount] = useState(5);

  // Questions list editor — starts empty (or pre-filled when editing a draft);
  // otherwise populated once a file/AI/manual source provides real questions
  const [questions, setQuestions] = useState<QuizQuestion[]>(editingExam?.questions || []);

  // Dirty-state tracking for the "Lưu Đề Thi" button when editing an existing exam —
  // it starts hidden and only lights up once the form actually differs from what was
  // loaded, so a teacher who just opened the editor to look isn't nagged to save.
  // The baseline snapshot is captured once (via useState's lazy initializer, which
  // only ever runs on mount) from these same fields' initial values.
  const buildEditableSnapshot = () =>
    JSON.stringify({
      title, description, category, difficulty, durationMinutes, passScorePercent,
      className, roomPassword, grade, schoolYear, deadlineAt, questions,
    });
  const [initialSnapshot] = useState(buildEditableSnapshot);
  const isDirty = !!editingExam && buildEditableSnapshot() !== initialSnapshot;

  // Auto-scroll to the newly added question card so teachers don't have to hunt for it
  const lastQuestionRef = useRef<HTMLDivElement | null>(null);
  const prevQuestionCountRef = useRef(0);
  useEffect(() => {
    if (questions.length > prevQuestionCountRef.current) {
      lastQuestionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevQuestionCountRef.current = questions.length;
  }, [questions.length]);

  // Genuinely binary formats we still can't read (old-style .doc, PDF, images...)
  // — reading these with FileReader.readAsText() produces garbled control-character
  // junk, not real text. Detect that so we can warn instead of silently corrupting
  // the AI parse and the Supabase save.
  const isLikelyBinary = (text: string) => {
    const sample = text.slice(0, 2000);
    if (!sample) return false;
    let controlCount = 0;
    for (let i = 0; i < sample.length; i++) {
      const code = sample.charCodeAt(i);
      if (code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13)) controlCount++;
    }
    return controlCount / sample.length > 0.03;
  };

  const loadFileAsText = async (file: File) => {
    setFileError(null);
    setContentWarning(null);

    // The native file picker's "All Files" option (and drag-and-drop) can bypass
    // the input's accept filter, so enforce the .doc/.docx restriction here too.
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.doc') && !lowerName.endsWith('.docx')) {
      setFileError('Bạn vừa chọn file không được hệ thống hỗ trợ. Chỉ hỗ trợ tệp Word (.doc, .docx).');
      return;
    }

    setUploadedFile(file);

    // .docx is a zipped XML format — extract its real text with mammoth instead of
    // reading the raw bytes as "text". Converted to HTML rather than plain text so
    // auto-numbered question lists keep a recoverable "Câu N." marker — see
    // htmlToNumberedText above.
    if (file.name.toLowerCase().endsWith('.docx')) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const parsedHtml = new DOMParser().parseFromString(result.value || '', 'text/html');
        const { text, images } = htmlToNumberedText(parsedHtml.body);
        setRawFileText(text);
        setRawFileImages(images);
      } catch (err) {
        console.error('Failed to extract .docx text:', err);
        setFileError(`Không thể đọc nội dung tệp "${file.name}". Vui lòng copy nội dung câu hỏi rồi dán trực tiếp vào ô bên dưới.`);
        setUploadedFile(null);
        setRawFileText('');
        setRawFileImages([]);
      }
      return;
    }

    setRawFileImages([]);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || '';
      if (isLikelyBinary(content)) {
        setFileError(
          `Tệp "${file.name}" có định dạng Word 97-2003 (.doc) cũ mà trình duyệt không đọc trực tiếp được. Vui lòng mở tệp bằng Word rồi lưu lại (Save As) dưới dạng .docx, hoặc copy nội dung câu hỏi rồi dán trực tiếp vào ô bên dưới.`
        );
        setUploadedFile(null);
        setRawFileText('');
        return;
      }
      setRawFileText(content);
    };
    reader.readAsText(file);
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadFileAsText(file);
  };

  // Drag and drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    loadFileAsText(file);
  };

  // Load sample template text
  const handleLoadSampleText = () => {
    setRawFileText(SAMPLE_QUIZ_TEXT);
    setRawFileImages([]);
    setUploadedFile(new File([SAMPLE_QUIZ_TEXT], 'de_thi_mau_cong_nghe.txt', { type: 'text/plain' }));
  };

  // Simulated progress bar: the actual request is a single fetch with no real
  // progress events, so we animate toward 90% while waiting and snap to 100% on finish.
  const startFakeProgress = () => {
    setProcessProgress(8);
    return setInterval(() => {
      setProcessProgress((prev) => {
        if (prev >= 90) return prev;
        const step = prev < 50 ? 6 : prev < 75 ? 3 : 1;
        return Math.min(90, prev + step);
      });
    }, 300);
  };

  const finishFakeProgress = (intervalId: ReturnType<typeof setInterval>) => {
    clearInterval(intervalId);
    setProcessProgress(100);
    setTimeout(() => setProcessProgress(0), 500);
  };

  // Process and parse the uploaded file / text
  const handleParseQuizFile = async () => {
    if (!rawFileText.trim()) {
      alert('Vui lòng tải lên tệp hoặc dán nội dung câu hỏi và đáp án trước khi phân tích.');
      return;
    }

    setIsProcessing(true);
    setParseMessage('Đang phân tích cấu trúc câu hỏi và đáp án...');
    setContentWarning(null);
    const progressInterval = startFakeProgress();

    try {
      // First try JSON parse if it's already a JSON file
      try {
        const directJson = JSON.parse(rawFileText);
        if (directJson.questions && Array.isArray(directJson.questions)) {
          setTitle(directJson.title || title);
          setDescription(directJson.description || description);
          setCategory(directJson.category || category);
          setDurationMinutes(directJson.durationMinutes || durationMinutes);
          setQuestions(normalizeQuestions(directJson.questions));
          setParseMessage(`Đã trích xuất thành công ${directJson.questions.length} câu hỏi từ tệp JSON!`);
          setIsProcessing(false);
          finishFakeProgress(progressInterval);
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
          images: rawFileImages,
        }),
      });

      const result = await res.json();
      if (result && result.data && result.data.questions) {
        setTitle(result.data.title || (uploadedFile?.name || 'tệp đính kèm').replace(/\.[^/.]+$/, ''));
        setDescription(result.data.description || description);
        if (result.data.category) setCategory(result.data.category);
        if (result.data.durationMinutes) setDurationMinutes(result.data.durationMinutes);
        setQuestions(normalizeQuestions(result.data.questions));
        setParseMessage(`Trích xuất thành công ${result.data.questions.length} câu hỏi (${result.source === 'gemini' ? 'Gemini AI thông minh' : 'Bộ phân tích cấu trúc'})!`);
        setContentWarning(result.data.warning || null);
      } else {
        throw new Error('Dữ liệu trả về không đúng cấu trúc đề thi');
      }
    } catch (err: any) {
      console.warn('Parser fallback:', err);
      setParseMessage('Đã chuyển sang chế độ tự động điền câu hỏi.');
    } finally {
      setIsProcessing(false);
      finishFakeProgress(progressInterval);
    }
  };

  // Generate quiz with Gemini AI by Topic
  const handleGenerateAiQuiz = async () => {
    if (!aiTopic.trim()) return;

    setIsProcessing(true);
    setParseMessage(`Gemini AI đang biên soạn bộ ${aiQuestionCount} câu hỏi về "${aiTopic}"...`);
    const progressInterval = startFakeProgress();

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
        setQuestions(normalizeQuestions(result.data.questions));
        setDurationMinutes(result.data.durationMinutes || aiQuestionCount * 2);
        setParseMessage(`Đã khởi tạo thành công ${result.data.questions.length} câu hỏi trắc nghiệm chất lượng cao!`);
      } else {
        throw new Error('Không nhận được câu hỏi từ AI');
      }
    } catch (err: any) {
      alert('Không thể kết nối AI, vui lòng thử lại hoặc sử dụng tính năng tải tệp câu hỏi.');
    } finally {
      setIsProcessing(false);
      finishFakeProgress(progressInterval);
    }
  };

  // Question editing handlers
  const handleAddQuestion = () => {
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}`,
      question: '',
      options: [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
      ],
      correctOptionId: 'A',
      explanation: '',
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

  // Question image: teachers can attach a screenshot/photo either by pasting from the
  // clipboard (e.g. right after using the Windows/Mac screenshot tool) or by picking a file.
  const MAX_QUESTION_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB — keeps the Supabase JSON row reasonable

  const applyQuestionImageFile = (qIndex: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_QUESTION_IMAGE_BYTES) {
      alert('Ảnh quá lớn (tối đa 4MB). Vui lòng chọn ảnh nhỏ hơn hoặc chụp lại với độ phân giải thấp hơn.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      handleUpdateQuestion(qIndex, 'questionImage', (event.target?.result as string) || '');
    };
    reader.readAsDataURL(file);
  };

  const handleQuestionImageFileChange = (qIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyQuestionImageFile(qIndex, file);
    e.target.value = '';
  };

  const handleQuestionTextPaste = (qIndex: number, e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    let imageItem: DataTransferItem | null = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        imageItem = items[i];
        break;
      }
    }
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    e.preventDefault();
    applyQuestionImageFile(qIndex, file);
  };

  const handleRemoveQuestionImage = (qIndex: number) => {
    handleUpdateQuestion(qIndex, 'questionImage', undefined);
  };

  // Option image — same idea as the question image above, but per A/B/C/D choice
  // (e.g. a fraction that's easier to screenshot than to retype for each option).
  const handleUpdateOptionImage = (qIdx: number, optId: string, image: string | undefined) => {
    const updated = [...questions];
    updated[qIdx].options = updated[qIdx].options.map((opt) =>
      opt.id === optId ? { ...opt, image } : opt
    );
    setQuestions(updated);
  };

  const applyOptionImageFile = (qIdx: number, optId: string, file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_QUESTION_IMAGE_BYTES) {
      alert('Ảnh quá lớn (tối đa 4MB). Vui lòng chọn ảnh nhỏ hơn hoặc chụp lại với độ phân giải thấp hơn.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      handleUpdateOptionImage(qIdx, optId, (event.target?.result as string) || '');
    };
    reader.readAsDataURL(file);
  };

  const handleOptionImageFileChange = (qIdx: number, optId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyOptionImageFile(qIdx, optId, file);
    e.target.value = '';
  };

  const handleOptionTextPaste = (qIdx: number, optId: string, e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    let imageItem: DataTransferItem | null = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        imageItem = items[i];
        break;
      }
    }
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    e.preventDefault();
    applyOptionImageFile(qIdx, optId, file);
  };

  const handleRemoveOptionImage = (qIdx: number, optId: string) => {
    handleUpdateOptionImage(qIdx, optId, undefined);
  };

  // Shared exam-object builder for both the actual save and the "Lưu Thành File"
  // export below, so a Word/PDF export always reflects exactly what's on screen —
  // including edits not saved to the room yet. publish only ever forces isDraft to
  // false (an explicit "Phát Hành" click); otherwise editing an existing exam keeps
  // whatever draft/published status it already had — the "Lưu Đề Thi" button (see
  // handleSaveExam below) must not silently unpublish a live room just because it
  // reuses the same isDraft:true default a brand new draft gets.
  const buildExamObject = (publish: boolean): QuizExam => ({
    id: editingExam?.id || `exam-${Date.now()}`,
    title: title.trim(),
    description: description.trim(),
    category: category.trim() || 'Chưa phân loại',
    difficulty: difficulty,
    durationMinutes: Number(durationMinutes) || 15,
    passScorePercent: Number(passScorePercent) || 70,
    questions: questions,
    createdAt: editingExam?.createdAt || new Date().toISOString(),
    authorName: authorName || 'Quản trị viên / Giảng viên',
    schoolName: schoolName || undefined,
    className: className.trim() || undefined,
    roomPassword: roomPassword.trim() || undefined,
    hasPassword: !!roomPassword.trim(),
    grade: grade ? Number(grade) : undefined,
    schoolYear: schoolYear.trim() || undefined,
    deadlineAt: deadlineAt ? new Date(deadlineAt).toISOString() : undefined,
    isDraft: publish ? false : editingExam ? editingExam.isDraft : true,
    participantsCount: editingExam?.participantsCount ?? 0,
    averageScore: editingExam?.averageScore ?? 0,
    sourceFile: uploadedFile?.name || editingExam?.sourceFile,
    isFeatured: true,
    createdBy: authorId,
  });

  // Final submit & save exam. publish=false saves as a draft (not shown in the
  // student-facing Quiz Room list) so the teacher can finish it later from
  // their profile and publish when ready.
  const handleSaveExam = async (publish: boolean) => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên đề thi.');
      return;
    }
    if (questions.length === 0) {
      alert('Đề thi cần có ít nhất 1 câu hỏi.');
      return;
    }
    if (publish && deadlineAt && new Date(deadlineAt).getTime() <= Date.now()) {
      alert('Hạn Kết Thúc Phòng Thi đang ở quá khứ, nên phòng sẽ tự động bị lưu trữ lại ngay sau khi phát hành. Vui lòng đặt hạn mới hoặc để trống nếu phòng thi không có hạn.');
      return;
    }

    const savedExam = buildExamObject(publish);

    try {
      await storageService.saveExam(savedExam, !editingExam);
      storageService
        .logActivity(
          editingExam ? 'Cập nhật phòng thi' : publish ? 'Tạo & phát hành phòng thi' : 'Lưu nháp phòng thi',
          { detail: savedExam.title }
        )
        .catch(() => {});
      if (publish) {
        onExamCreated(savedExam);
      }
      onClose();
    } catch (err) {
      console.error('Không lưu được đề thi:', err);
      const detail = err instanceof Error ? err.message : JSON.stringify(err);
      alert(`Không thể lưu đề thi lên Supabase.\n\nChi tiết lỗi: ${detail}`);
    }
  };

  // "Lưu Thành File" — exports whatever is currently on screen (including edits not
  // saved to the room yet) to a real .docx/.pdf, without touching the saved exam.
  const [isSaveFormatModalOpen, setIsSaveFormatModalOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'word' | 'pdf' | null>(null);

  const handleExportExam = async (format: 'word' | 'pdf') => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên đề thi trước khi lưu thành file.');
      return;
    }
    if (questions.length === 0) {
      alert('Đề thi cần có ít nhất 1 câu hỏi trước khi lưu thành file.');
      return;
    }
    setExportingFormat(format);
    try {
      const exam = buildExamObject(false);
      const blob = format === 'word' ? await generateExamWordBlob(exam) : await generateExamPdfBlob(exam);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${exam.title}.${format === 'word' ? 'docx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsSaveFormatModalOpen(false);
    } catch (err) {
      console.error(`Không thể xuất tệp ${format === 'word' ? 'Word' : 'PDF'}:`, err);
      alert(`Không thể tạo tệp ${format === 'word' ? 'Word' : 'PDF'}. Vui lòng thử lại.`);
    } finally {
      setExportingFormat(null);
    }
  };

  // "Lưu vào Kho Đề Thi, Kiểm Tra" — exports the same Word file as above, but instead
  // of downloading it, uploads it straight into the exam_documents library (the same
  // one ExamLibrary/"Kho Đề Thi" browses), carrying over this exam's own grade/lớp/năm
  // học/môn học so it lands in the right group there without re-entering anything.
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);

  const handleSaveToLibrary = async () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên đề thi trước khi lưu vào kho đề thi.');
      return;
    }
    if (questions.length === 0) {
      alert('Đề thi cần có ít nhất 1 câu hỏi trước khi lưu vào kho đề thi.');
      return;
    }
    setIsSavingToLibrary(true);
    try {
      const existing = await storageService.findExamDocumentByTitle(title);
      if (existing) {
        alert(`Đề thi "${title.trim()}" đã có trong Kho Đề Thi rồi, không thể lưu trùng. Hãy đổi tên đề thi nếu bạn muốn lưu thêm một bản khác.`);
        return;
      }

      const exam = buildExamObject(false);
      const blob = await generateExamWordBlob(exam);
      const { fileUrl } = await storageService.uploadExamFileBlob(blob, 'docx');
      const doc: ExamDocument = {
        id: `doc-${Date.now()}`,
        title: exam.title,
        grade: exam.grade,
        className: exam.className,
        schoolYear: exam.schoolYear,
        category: exam.category,
        description: exam.description || undefined,
        fileUrl,
        fileName: `${exam.title}.docx`,
        fileType: 'docx',
        views: 0,
        uploadedAt: new Date().toISOString(),
      };
      await storageService.saveExamDocument(doc);
      storageService.logActivity('Lưu đề thi vào kho đề thi', { detail: doc.title }).catch(() => {});
      setIsSaveFormatModalOpen(false);
      alert('Đã lưu đề thi vào Kho Đề Thi.');
    } catch (err) {
      console.error('Không thể lưu vào kho đề thi:', err);
      alert('Không thể lưu đề thi vào kho đề thi. Vui lòng thử lại.');
    } finally {
      setIsSavingToLibrary(false);
    }
  };

  // "In Đề" — generates the same PDF as the Word/PDF export above and prints THAT
  // (in a hidden iframe, no popup) instead of the live modal DOM, so what comes out
  // of the printer matches the actual exam layout/pagination rather than whatever
  // this editor's glass-panel UI happens to look like on paper.
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrintExam = async () => {
    if (!title.trim()) {
      alert('Vui lòng nhập tên đề thi trước khi in.');
      return;
    }
    if (questions.length === 0) {
      alert('Đề thi cần có ít nhất 1 câu hỏi trước khi in.');
      return;
    }
    setIsPrinting(true);
    try {
      const exam = buildExamObject(false);
      const blob = await generateExamPdfBlob(exam);
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      };
      document.body.appendChild(iframe);
      // Leave the iframe (and its blob URL) around long enough for the OS print
      // dialog to actually finish, then clean up.
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 60000);
    } catch (err) {
      console.error('Không thể tạo tệp để in:', err);
      alert('Không thể chuẩn bị đề thi để in. Vui lòng thử lại.');
    } finally {
      setIsPrinting(false);
    }
  };

  // "Xoá Đề Thi" — moved here from the exam list (Hồ Sơ Giáo Viên) so deleting is a
  // deliberate action taken from inside the exam you're actually looking at, not a
  // stray trash icon next to every row in the list.
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteExam = async () => {
    if (!editingExam) return;
    if (!window.confirm(`Xóa đề thi "${editingExam.title}"? Hành động này không thể hoàn tác.`)) return;
    setIsDeleting(true);
    try {
      await storageService.deleteExam(editingExam.id);
      storageService.logActivity('Xóa phòng thi', { detail: editingExam.title }).catch(() => {});
      onClose();
    } catch (err) {
      console.error('Không xóa được đề thi:', err);
      alert('Không thể xóa đề thi. Vui lòng thử lại.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div id="quiz-creator-modal-overlay" className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="glass-panel w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {editingExam ? `Chỉnh Sửa Đề Thi${editingExam.isDraft ? ' (Bản Nháp)' : ''}` : 'Tạo Đề Thi & Phòng Thi Trắc Nghiệm'}
              </h2>
              <p className="text-xs text-slate-400">
                {editingExam
                  ? editingExam.isDraft
                    ? 'Chỉnh sửa nội dung rồi lưu nháp tiếp hoặc phát hành để mở phòng thi'
                    : 'Chỉnh sửa nội dung rồi bấm Lưu Đề Thi để cập nhật phòng thi đang mở'
                  : 'Nhập từ tệp Word đính kèm (.doc, .docx) hoặc biên tập trực tiếp'}
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

            {/* Temporarily hidden — resume later */}
            {false && (
              <button
                onClick={() => setActiveMode('ai-prompt')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeMode === 'ai-prompt' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>2. Tạo Bằng AI</span>
              </button>
            )}

            <button
              onClick={() => setActiveMode('manual')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeMode === 'manual' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>2. Nhập Thủ Công</span>
            </button>

            <button
              onClick={() => setShowGuideModal(true)}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-slate-400 hover:text-cyan-300 hover:bg-white/5"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Xem file hướng dẫn</span>
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
                className="border-2 border-dashed border-slate-700 hover:border-cyan-500/80 bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center cursor-pointer transition-all group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".doc,.docx"
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 text-cyan-400 group-hover:scale-110 flex items-center justify-center mx-auto mb-3 transition-transform shadow-md">
                  <Upload className="w-6 h-6" />
                </div>

                <h3 className="font-bold text-sm sm:text-base text-slate-200 mb-1">
                  {uploadedFile ? `Tệp đã chọn: ${uploadedFile.name}` : 'Kéo thả tệp đề thi hoặc nhấp để chọn'}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-3">
                  Hỗ trợ tệp Word <strong>.DOC, .DOCX</strong> chứa danh sách câu hỏi trắc nghiệm A, B, C, D kèm đáp án.
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
                    Dán mẫu đề thi chuẩn
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

                  {isProcessing && (
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${processProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {fileError && (
                <div className="bg-rose-950/50 border border-rose-500/30 text-rose-200 text-xs p-3 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{fileError}</span>
                </div>
              )}

              {parseMessage && (
                <div className="bg-cyan-950/50 border border-cyan-500/30 text-cyan-200 text-xs p-3 rounded-xl flex items-center gap-2">
                  {isProcessing ? (
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <FileCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  )}
                  <span>{parseMessage}</span>
                </div>
              )}

              {!isProcessing && contentWarning && (
                <div className="bg-amber-950/50 border border-amber-500/30 text-amber-200 text-xs p-3 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{contentWarning}</span>
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

              {isProcessing && (
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${processProgress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* MODE 3: Manual Question Entry */}
          {activeMode === 'manual' && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <FileCode className="w-4 h-4" />
                <span>Nhập Câu Hỏi Thủ Công</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nhấn "Thêm câu hỏi" bên dưới để tạo từng câu. Mỗi câu hỏi có thể kèm hình ảnh minh họa hay
                nhấn tổ hợp phím (Windows+Shift+S) để chọn vùng cần chụp sau đó nhấn (Ctrl+V) vào ô nội dung
                câu hỏi, hoặc bấm "Thêm ảnh" để chọn tệp ảnh có sẵn.
              </p>
            </div>
          )}

          {/* General Metadata Config */}
          <div className="bg-slate-700/70 border border-slate-600 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Thông Tin Tổng Quan Đề Thi
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">Tên Đề Thi</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập tên đề thi..."
                  className="w-full bg-slate-800 border border-slate-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-200 mb-1">Thời gian (phút)</label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    onBlur={() => syncTitleSuffixes(Number(durationMinutes) || 0, schoolYear)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-200 mb-1">Điểm đạt (%)</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={passScorePercent}
                    onChange={(e) => setPassScorePercent(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">Môn Học / Danh Mục</label>
                <input
                  type="text"
                  list="quiz-category-suggestions"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="VD: Ngữ Văn, GDCD, Toán học..."
                  className="w-full bg-slate-800 border border-slate-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
                />
                <datalist id="quiz-category-suggestions">
                  <option value="Ngữ Văn" />
                  <option value="Toán học" />
                  <option value="Tiếng Anh" />
                  <option value="GDCD" />
                  <option value="Tin học" />
                  <option value="Vật Lý" />
                  <option value="Hóa Học" />
                  <option value="Sinh Học" />
                  <option value="Lịch Sử" />
                  <option value="Địa Lý" />
                  <option value="Công Nghệ" />
                  <option value="Trí tuệ Nhân tạo" />
                  <option value="An ninh Mạng" />
                  <option value="Kiến trúc Phần mềm" />
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">Khối Lớp</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none"
                >
                  <option value="">Không chọn</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g}>Lớp {g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">Lớp</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="VD: 9A1..."
                  className="w-full bg-slate-800 border border-slate-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">Mật Mã Phòng Thi</label>
                <input
                  type="text"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  placeholder="Để trống nếu không cần mật mã"
                  className="w-full bg-slate-800 border border-slate-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">Năm Học</label>
                <input
                  type="text"
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  onBlur={() => syncTitleSuffixes(Number(durationMinutes) || 0, schoolYear)}
                  placeholder="VD: 2025-2026"
                  className="w-full bg-slate-800 border border-slate-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-200 mb-1">
                Hạn Kết Thúc Phòng Thi
              </label>
              <input
                type="datetime-local"
                value={deadlineAt}
                onChange={(e) => setDeadlineAt(e.target.value)}
                onClick={(e) => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
                className="w-full sm:w-64 bg-slate-800 border border-slate-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Để trống nếu phòng thi không có hạn. Sau thời điểm này, đề thi sẽ tự động chuyển thành tệp PDF và lưu vào Kho đề thi kiểm tra, đồng thời ẩn khỏi Phòng Thi Trắc Nghiệm.
              </p>
            </div>
          </div>

          {/* Questions Visual Editor — shown in manual mode, and on the upload tab once a
              parse has actually run there (so extracting a file still shows its results
              inline). Keeps manually-entered questions from leaking into a fresh upload tab. */}
          {(activeMode === 'manual' || (activeMode === 'upload' && !!parseMessage)) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Danh Sách Câu Hỏi ({questions.length})</span>
                <span className="text-xs text-slate-400 font-normal">
                  (Nhấp vào nút radio để chỉ định đáp án đúng)
                </span>
              </h4>
            </div>

            <div className="space-y-4">
              {questions.map((q, qIndex) => (
                <div
                  key={q.id || qIndex}
                  ref={qIndex === questions.length - 1 ? lastQuestionRef : undefined}
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
                        onPaste={(e) => handleQuestionTextPaste(qIndex, e)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                        placeholder="Nội dung câu hỏi... (có thể dán ảnh chụp màn hình trực tiếp vào đây)"
                      />

                      {/* Question image attachment */}
                      {q.questionImage ? (
                        <div className="relative mt-2 inline-block">
                          <img
                            src={q.questionImage}
                            alt={`Ảnh minh họa câu hỏi ${qIndex + 1}`}
                            className="max-h-40 rounded-lg border border-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestionImage(qIndex)}
                            title="Xóa ảnh"
                            className="absolute -top-2 -right-2 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md transition-colors"
                          >
                            <ImageOff className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">
                          <ImagePlus className="w-3.5 h-3.5" />
                          <span>Thêm ảnh</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleQuestionImageFileChange(qIndex, e)}
                          />
                        </label>
                      )}
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

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {q.options.map((opt) => {
                      const isCorrect = q.correctOptionId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`flex flex-col gap-1.5 p-2 rounded-lg border transition-colors ${
                            isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
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
                              onPaste={(e) => handleOptionTextPaste(qIndex, opt.id, e)}
                              placeholder={`Lựa chọn ${opt.id}... (có thể dán ảnh chụp công thức)`}
                              className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
                            />
                          </div>

                          {/* Option image attachment — e.g. a screenshotted fraction/formula */}
                          {opt.image ? (
                            <div className="relative ml-8 inline-block">
                              <img
                                src={opt.image}
                                alt={`Ảnh minh họa đáp án ${opt.id}`}
                                className="max-h-20 rounded-lg border border-slate-800"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveOptionImage(qIndex, opt.id)}
                                title="Xóa ảnh"
                                className="absolute -top-2 -right-2 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-md transition-colors"
                              >
                                <ImageOff className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="ml-8 inline-flex items-center gap-1.5 self-start text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 px-2 py-1 rounded-lg cursor-pointer transition-colors">
                              <ImagePlus className="w-3.5 h-3.5" />
                              <span>Thêm ảnh</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleOptionImageFileChange(qIndex, opt.id, e)}
                              />
                            </label>
                          )}
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

            <button
              type="button"
              onClick={handleAddQuestion}
              className="flex items-center justify-center gap-1.5 w-full bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold px-3 py-2.5 rounded-lg border border-dashed border-slate-700 hover:border-cyan-500/60 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Thêm câu hỏi</span>
            </button>

          </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-200 font-semibold px-4 py-2"
            >
              Hủy bỏ
            </button>

            {editingExam && (
              <button
                type="button"
                onClick={handleDeleteExam}
                disabled={isDeleting}
                title="Xóa đề thi này"
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 disabled:opacity-50 font-semibold px-3 py-2 rounded-lg hover:bg-rose-500/10 transition-colors"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Xóa Đề Thi</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {editingExam ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsSaveFormatModalOpen(true)}
                  title="Xuất đề thi hiện tại (kể cả thay đổi chưa lưu) ra tệp Word/PDF, hoặc lưu vào Kho Đề Thi"
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl border border-slate-700 transition-colors"
                >
                  <FileType className="w-4 h-4" />
                  <span>Lưu Thành</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintExam}
                  disabled={isPrinting}
                  title="In đề thi hiện tại (kể cả thay đổi chưa lưu)"
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl border border-slate-700 transition-colors"
                >
                  {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  <span>In Đề</span>
                </button>

                {isDirty && (
                  <button
                    type="button"
                    onClick={() => handleSaveExam(false)}
                    title="Lưu thay đổi vào đề thi này"
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all animate-in fade-in zoom-in-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>Lưu Đề Thi</span>
                  </button>
                )}

                {editingExam.isDraft && (
                  <button
                    type="button"
                    onClick={() => handleSaveExam(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-cyan-600/20 transition-all hover:scale-[1.02]"
                  >
                    <Check className="w-4 h-4" />
                    <span>Phát Hành & Mở Phòng Thi ({questions.length} câu)</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSaveExam(false)}
                  title="Lưu lại dưới dạng bản nháp, chưa mở phòng thi — có thể vào Hồ Sơ Giáo Viên để sửa và phát hành sau"
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl border border-slate-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Nháp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveExam(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-cyan-600/20 transition-all hover:scale-[1.02]"
                >
                  <Check className="w-4 h-4" />
                  <span>Phát Hành & Mở Phòng Thi ({questions.length} câu)</span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>

      {/* "Lưu Thành" picker: download as Word/PDF, or file straight into Kho Đề Thi */}
      {isSaveFormatModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-100 text-center">
              Bạn muốn lưu thành gì?
            </h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleExportExam('word')}
                disabled={exportingFormat !== null || isSavingToLibrary}
                className="w-full flex items-center gap-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-400/30 disabled:opacity-50 text-blue-100 text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
              >
                {exportingFormat === 'word' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileType className="w-4 h-4" />}
                <span>Word (.docx)</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportExam('pdf')}
                disabled={exportingFormat !== null || isSavingToLibrary}
                className="w-full flex items-center gap-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/30 disabled:opacity-50 text-emerald-100 text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
              >
                {exportingFormat === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>PDF</span>
              </button>

              <button
                type="button"
                onClick={handleSaveToLibrary}
                disabled={exportingFormat !== null || isSavingToLibrary}
                title="Lưu tệp Word của đề thi này vào Kho Đề Thi, dùng đúng khối/lớp/năm học/môn học đã thiết lập"
                className="w-full flex items-center gap-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 disabled:opacity-50 text-cyan-100 text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
              >
                {isSavingToLibrary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Library className="w-4 h-4" />}
                <span>Lưu vào Kho Đề Thi, Kiểm Tra</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSaveFormatModalOpen(false)}
                disabled={exportingFormat !== null || isSavingToLibrary}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
              >
                <span>Quay Trở Lại Đề Thi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showGuideModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <h3 className="text-sm font-bold text-slate-900">Hướng Dẫn Tạo Đề Thi</h3>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="/huongdantaodethi.pdf"
                  download="huongdantaodethi.pdf"
                  className="flex items-center gap-1.5 text-xs font-semibold text-cyan-700 hover:text-cyan-800 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải xuống</span>
                </a>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100">
              <iframe
                src="/huongdantaodethi.pdf#zoom=page-width"
                title="Hướng Dẫn Tạo Đề Thi"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
