import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, 
  Clock, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Flag, 
  ChevronLeft, 
  ChevronRight, 
  Check,
  Layers, 
  Sparkles, 
  BarChart2, 
  AlertTriangle,
  Play,
  ArrowLeft,
  Users,
  CheckCircle,
  Keyboard,
  Lock,
  Target
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizExam, ExamAttempt, QuizQuestion } from '../types';
import { storageService } from '../services/storageService';

// Days left until an exam room's deadline (null if it has no deadline).
function getDaysRemaining(deadlineAt?: string): number | null {
  if (!deadlineAt) return null;
  const diffMs = new Date(deadlineAt).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

interface QuizRoomProps {
  onAttemptRecorded?: () => void;
  openCreateQuizModal: (mode?: 'upload' | 'manual') => void;
  examsRefreshKey?: number;
  globalSearchQuery?: string;
  initialExamId?: string;
  onInitialExamConsumed?: () => void;
}

// Ignore spacing differences ("2024 - 2025" vs "2024-2025") so the global search bar
// still matches a school year regardless of how the user typed the dash.
const normalizeForSearch = (s: string) => s.toLowerCase().replace(/\s+/g, '');

export const QuizRoom: React.FC<QuizRoomProps> = ({
  onAttemptRecorded,
  openCreateQuizModal,
  examsRefreshKey,
  globalSearchQuery,
  initialExamId,
  onInitialExamConsumed,
}) => {
  const [exams, setExams] = useState<QuizExam[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [selectedExam, setSelectedExam] = useState<QuizExam | null>(null);
  const [examState, setExamState] = useState<'lobby' | 'testing' | 'result'>('lobby');

  // Active testing state
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [startTime, setStartTime] = useState<string>('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<ExamAttempt | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong' | 'flagged'>('all');

  // Entry gate — shown for every exam so the student can see the room's
  // school/grade/class and enter their name before starting; the password
  // field only appears when the room actually has one.
  const [pendingEntryExam, setPendingEntryExam] = useState<QuizExam | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentNameError, setStudentNameError] = useState(false);
  const [passwordAttempt, setPasswordAttempt] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isCheckingEntry, setIsCheckingEntry] = useState(false);
  const [alreadyTookError, setAlreadyTookError] = useState(false);

  // Reload exams when the component mounts, and again whenever a new exam is published
  // (App.tsx bumps examsRefreshKey after a successful create, even if this tab never unmounted).
  // There's no background server, so expired rooms are archived to a PDF lazily —
  // whenever anyone opens the Quiz Room — rather than at the exact deadline.
  useEffect(() => {
    setIsLoadingExams(true);
    storageService
      .archiveExpiredExams()
      .catch((err) => console.error('Không lưu trữ được đề thi hết hạn:', err))
      .finally(() => {
        storageService
          .getExams()
          .then(setExams)
          .catch((err) => console.error('Không tải được đề thi:', err))
          .finally(() => setIsLoadingExams(false));
      });
  }, [examsRefreshKey]);

  // Countdown timer during test
  useEffect(() => {
    if (examState !== 'testing') return;

    if (secondsRemaining <= 0) {
      // Auto submit when time runs out
      handleSubmitExam();
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [examState, secondsRemaining]);

  // Start exam session
  const handleStartExam = (exam: QuizExam) => {
    setSelectedExam(exam);
    setCurrentQIndex(0);
    setUserAnswers({});
    setFlaggedQuestions(new Set());
    setSecondsRemaining(exam.durationMinutes * 60);
    setStartTime(new Date().toISOString());
    setExamState('testing');
  };

  // Entry point from the exam list — always collect the student's name (and a
  // room password too, if the room has one) before starting. Whether they've
  // already taken this exam is checked against exam_attempts once they type
  // their name in, since there's no account to check against up front.
  const handleRequestStartExam = (exam: QuizExam) => {
    setPendingEntryExam(exam);
    setStudentName('');
    setStudentNameError(false);
    setPasswordAttempt('');
    setPasswordError(false);
    setAlreadyTookError(false);
  };

  // Jumping in from a global search result — auto-open the matching exam once
  // its data has loaded, but only once per mount (a later exams refetch shouldn't
  // yank the user back in if they've already returned to the lobby).
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!initialExamId || autoStartedRef.current || exams.length === 0) return;
    const match = exams.find((e) => e.id === initialExamId);
    if (match) {
      autoStartedRef.current = true;
      handleRequestStartExam(match);
      onInitialExamConsumed?.();
    }
  }, [initialExamId, exams]);

  const handleConfirmEntry = async () => {
    if (!pendingEntryExam) return;
    if (!studentName.trim()) {
      setStudentNameError(true);
      return;
    }
    if (pendingEntryExam.roomPassword && passwordAttempt.trim() !== pendingEntryExam.roomPassword) {
      setPasswordError(true);
      return;
    }
    setAlreadyTookError(false);
    setIsCheckingEntry(true);
    try {
      const alreadyTook = await storageService.hasStudentCompletedExam(pendingEntryExam.id, studentName);
      if (alreadyTook) {
        setAlreadyTookError(true);
        return;
      }
      const exam = pendingEntryExam;
      setPendingEntryExam(null);
      handleStartExam(exam);
    } finally {
      setIsCheckingEntry(false);
    }
  };

  // Select answer for question
  const handleSelectOption = (questionId: string, optionId: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  // Toggle flag on question
  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  // Submit and grade exam
  const handleSubmitExam = async () => {
    if (!selectedExam) return;

    setIsSubmitModalOpen(false);
    const completedAt = new Date().toISOString();
    const durationSeconds = Math.max(
      1,
      selectedExam.durationMinutes * 60 - secondsRemaining
    );

    let correctCount = 0;
    const answerDetails = selectedExam.questions.map((q) => {
      const selected = userAnswers[q.id] || '';
      const isCorrect = selected === q.correctOptionId;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        selectedOptionId: selected,
        isCorrect,
      };
    });

    const percentage = Math.round((correctCount / selectedExam.questions.length) * 100);
    const passed = percentage >= selectedExam.passScorePercent;

    const attempt: ExamAttempt = {
      id: `att-${Date.now()}`,
      examId: selectedExam.id,
      examTitle: selectedExam.title,
      userId: 'user-current',
      userName: studentName.trim() || 'Thí sinh ẩn danh',
      userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      userRole: 'Kỹ sư Phần mềm',
      score: correctCount,
      maxScore: selectedExam.questions.length,
      percentage,
      passed,
      startedAt: startTime,
      completedAt,
      durationSeconds,
      answers: answerDetails,
      flaggedQuestions: Array.from(flaggedQuestions),
    };

    setLastAttempt(attempt);
    setExamState('result');

    if (onAttemptRecorded) {
      onAttemptRecorded();
    }

    storageService.recordAttempt(attempt).catch((err) => console.error('Không lưu được kết quả bài thi:', err));

    // Trigger celebratory confetti if passed!
    if (passed) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#6366f1', '#10b981', '#f59e0b'],
        });
      } catch (e) {
        // confetti fallback
      }
    }
  };

  // Format MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Filtered exams for lobby — filtering now happens only via the global search
  // bar in the Header (see globalSearchQuery), not a local search/category bar.
  const globalSearchTerm = normalizeForSearch(globalSearchQuery || '');
  const filteredExams = exams.filter((ex) => {
    if (!globalSearchTerm) return true;
    return normalizeForSearch(
      [ex.title, ex.description, ex.schoolYear, ex.schoolName, ex.className, ex.grade && `khối ${ex.grade}`]
        .filter(Boolean)
        .join(' ')
    ).includes(globalSearchTerm);
  });

  // ----------------------------------------------------
  // VIEW 1: LOBBY (Danh sách phòng thi)
  // ----------------------------------------------------
  if (examState === 'lobby') {
    return (
      <div id="quiz-room-lobby" className="max-w-6xl mx-auto pb-16">
        
        {/* Unified Toolbar Card — hero + search/filter live in one continuous surface
            instead of separate floating white blocks, so the page reads as one panel. */}
        <div className="glass-panel mb-8 overflow-hidden">
          {/* Hero */}
          <div className="px-6 py-3 sm:px-8 sm:py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white [text-shadow:_0_1px_4px_rgba(0,0,0,0.6)]">
                    "Hệ thống Trắc nghiệm của Rồng – Đồng hành Nâng tầm tri thức Việt"
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-100 max-w-2xl leading-relaxed [text-shadow:_0_1px_3px_rgba(0,0,0,0.6)]">
                  Khám phá bản thân qua các bài kiểm tra cùng Rồng Thần bằng phòng thi trắc nghiệm công nghệ kỹ thuật số khảo sát AI – Ứng dụng đột phá của phòng thi trắc nghiệm số trong việc nâng cao chất lượng kiểm tra. Bây giờ hãy bước vào hang Rồng mở khóa tri thức, nhận ngọc quý và Sẵn sàng nghênh chiến với bộ câu hỏi của Rồng chưa?
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <button
                  onClick={() => openCreateQuizModal('upload')}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Tạo Phòng Thi Mới từ Tệp</span>
                </button>

                <button
                  onClick={() => openCreateQuizModal('manual')}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                >
                  <Keyboard className="w-4 h-4" />
                  <span>Tạo Bằng Công Cụ Nhập Liệu</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Exams Grid — while the room list (and the lazy expired-room archiving
            that runs before it) is still loading, show pulsing skeleton cards
            instead of a blank grid so a slow/large fetch doesn't look frozen. */}
        {isLoadingExams ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="min-h-[320px] h-full rounded-3xl border-2 border-white/10 bg-white/5 p-3 flex flex-col animate-pulse"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="h-5 w-20 rounded-full bg-white/10" />
                  <div className="h-5 w-24 rounded-full bg-white/10" />
                </div>
                <div className="h-5 w-3/4 rounded bg-white/10 mt-8 mb-2" />
                <div className="h-4 w-1/2 rounded bg-white/10 mb-1.5" />
                <div className="h-4 w-1/3 rounded bg-white/10 mb-6" />
                <div className="mt-auto rounded-2xl bg-white/10 h-32" />
              </div>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExams.map((exam) => {
            const daysRemaining = getDaysRemaining(exam.deadlineAt);
            return (
            <div
              key={exam.id}
              id={`exam-card-${exam.id}`}
              style={{ backgroundImage: "url('/the.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
              className="group relative min-h-[320px] h-full overflow-hidden rounded-3xl border-2 border-amber-400/40 hover:border-amber-400/70 p-3 flex flex-col transition-all duration-200 shadow-lg hover:shadow-2xl hover:shadow-amber-500/20 hover:scale-[1.01]"
            >
                <div className="absolute inset-0 bg-teal-950/50 backdrop-blur-sm pointer-events-none" />

                <div className="relative z-10">
                  {/* Header tags */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-100 bg-white/10 backdrop-blur-sm border border-white/20 px-2.5 py-1 rounded-full shadow-sm [text-shadow:_0_1px_2px_rgba(0,0,0,0.5)]">
                      {exam.category}
                    </span>
                    <div className="flex flex-wrap justify-end items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-100 bg-white/10 backdrop-blur-sm border border-white/20 px-2.5 py-1 rounded-full [text-shadow:_0_1px_2px_rgba(0,0,0,0.5)]">
                        {exam.participantsCount || 0} HS đã thi
                      </span>
                      {daysRemaining !== null && (
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-sm [text-shadow:_0_1px_2px_rgba(0,0,0,0.5)] ${
                            daysRemaining <= 0
                              ? 'bg-rose-500/20 border-rose-400/40 text-rose-100'
                              : 'bg-white/10 border-white/20 text-slate-100'
                          }`}
                        >
                          {daysRemaining <= 0 ? 'Đã hết hạn' : `Còn lại: ${daysRemaining} ngày`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug mt-8 mb-1.5 pr-14 [text-shadow:_0_1px_4px_rgba(0,0,0,0.8)]">
                    {exam.title}
                  </h3>

                  {/* School / Teacher / Class meta, if provided */}
                  {(exam.schoolName || exam.className || exam.authorName) && (
                    <div className="text-sm font-bold text-amber-50 space-y-0.5 mb-4 [text-shadow:_0_1px_3px_rgba(0,0,0,0.7)]">
                      {(exam.schoolName || exam.className) && (
                        <p>{[exam.schoolName, exam.className && `Lớp ${exam.className}`].filter(Boolean).join(' • ')}</p>
                      )}
                      {exam.authorName && <p>GV: {exam.authorName}</p>}
                    </div>
                  )}
                </div>

                {/* Stats + CTA panel */}
                <div className="relative z-10 bg-white/85 backdrop-blur-sm rounded-2xl pt-4 px-2 pb-2 mt-auto shadow-lg border border-white/40">
                  <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                    <div>
                      <span className="flex items-center gap-1 text-xs text-amber-700/70 mb-0.5">
                        <Layers className="w-3.5 h-3.5 text-amber-600" />
                        <span>Số câu</span>
                      </span>
                      <strong className="text-base font-extrabold text-teal-900">{exam.questions.length} câu</strong>
                    </div>
                    <div>
                      <span className="flex items-center gap-1 text-xs text-amber-700/70 mb-0.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Thời gian</span>
                      </span>
                      <strong className="text-base font-extrabold text-teal-900">{exam.durationMinutes} phút</strong>
                    </div>
                    <div>
                      <span className="flex items-center gap-1 text-xs text-amber-700/70 mb-0.5">
                        <Target className="w-3.5 h-3.5 text-amber-600" />
                        <span>Điểm đạt</span>
                      </span>
                      <strong className="text-base font-extrabold text-emerald-700">{exam.passScorePercent}%</strong>
                    </div>
                  </div>

                  <button
                    id={`start-exam-btn-${exam.id}`}
                    onClick={() => handleRequestStartExam(exam)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-800 to-emerald-800 hover:from-teal-700 hover:to-emerald-700 border border-white/10 text-white text-sm font-bold py-2.5 rounded-xl transition-all"
                  >
                    {exam.roomPassword ? (
                      <Lock className="w-3.5 h-3.5 text-amber-300/80" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current text-amber-300/80" />
                    )}
                    <span>Vào Phòng Thi & Làm Bài</span>
                  </button>
                </div>
            </div>
            );
          })}
        </div>
        )}

        {/* Exam Entry Gate — shows the room's school/grade/class and collects the
            student's name (plus a password, if the room has one) before starting */}
        {pendingEntryExam && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mx-auto">
                {pendingEntryExam.roomPassword ? <Lock className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
              </div>

              <div className="text-center">
                <h3 className="text-lg font-bold text-white">Thông Tin Thí Sinh</h3>
                <p className="text-xs text-slate-300 mt-1 line-clamp-1">{pendingEntryExam.title}</p>
                {(pendingEntryExam.schoolName || pendingEntryExam.grade || pendingEntryExam.className) && (
                  <p className="text-sm text-cyan-300 font-semibold mt-1">
                    {[
                      pendingEntryExam.schoolName,
                      pendingEntryExam.grade && `Khối ${pendingEntryExam.grade}`,
                      pendingEntryExam.className && `Lớp ${pendingEntryExam.className}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Họ và Tên</label>
                <input
                  type="text"
                  autoFocus
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value.toUpperCase());
                    setStudentNameError(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && !pendingEntryExam.roomPassword && handleConfirmEntry()}
                  placeholder="Nhập họ và tên của bạn..."
                  className={`w-full bg-white/10 border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-400 uppercase focus:outline-none ${
                    studentNameError ? 'border-rose-400 focus:border-rose-500' : 'border-white/20 focus:border-cyan-500'
                  }`}
                />
                {studentNameError && (
                  <p className="text-xs text-rose-400 font-semibold mt-1.5">Vui lòng nhập họ và tên trước khi vào phòng thi.</p>
                )}
              </div>

              {pendingEntryExam.roomPassword && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Mật Mã Phòng Thi</label>
                  <input
                    type="text"
                    value={passwordAttempt}
                    onChange={(e) => {
                      setPasswordAttempt(e.target.value);
                      setPasswordError(false);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirmEntry()}
                    placeholder="Nhập mật mã phòng thi..."
                    className={`w-full bg-white/10 border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none ${
                      passwordError ? 'border-rose-400 focus:border-rose-500' : 'border-white/20 focus:border-cyan-500'
                    }`}
                  />
                  {passwordError && (
                    <p className="text-xs text-rose-400 font-semibold mt-1.5">Sai mật mã phòng thi. Vui lòng thử lại.</p>
                  )}
                </div>
              )}

              {alreadyTookError && (
                <p className="text-xs text-rose-300 font-semibold bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
                  Thí sinh "{studentName.trim()}" đã nộp bài đề thi này rồi, không thể vào lại phòng thi.
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingEntryExam(null)}
                  className="flex-1 text-xs font-semibold text-slate-300 hover:text-white py-2.5 rounded-xl border border-white/20 hover:bg-white/10 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmEntry}
                  disabled={isCheckingEntry}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white text-xs font-bold py-2.5 rounded-xl shadow-md transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isCheckingEntry ? 'Đang kiểm tra...' : 'Vào Phòng Thi'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 2: LIVE TESTING ROOM (Đang làm bài thi)
  // ----------------------------------------------------
  if (examState === 'testing' && selectedExam) {
    const currentQ = selectedExam.questions[currentQIndex];
    const isLastQuestion = currentQIndex === selectedExam.questions.length - 1;
    const answeredCount = Object.keys(userAnswers).length;
    const isCurrentFlagged = flaggedQuestions.has(currentQ.id);

    const isUrgent = secondsRemaining < 120; // less than 2 mins

    return (
      <div id="active-quiz-room" className="max-w-5xl mx-auto pb-16">
        
        {/* Top Header Bar with Live Countdown Timer */}
        <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 mb-6 shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn rời phòng thi? Kết quả hiện tại sẽ không được lưu.')) {
                  setExamState('lobby');
                }
              }}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 max-w-[280px] sm:max-w-md">
                {selectedExam.title}
              </h2>
              <span className="text-[11px] text-slate-500">
                Đã hoàn thành: <strong className="text-cyan-600">{answeredCount}/{selectedExam.questions.length}</strong> câu
              </span>
            </div>
          </div>

          {/* Timer & Submit button */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm sm:text-base border transition-colors ${
              isUrgent
                ? 'bg-rose-50/60 border-rose-300 text-rose-700 animate-pulse'
                : 'bg-slate-50 border-slate-200 text-cyan-600'
            }`}>
              <Clock className="w-4 h-4" />
              <span>{formatTime(secondsRemaining)}</span>
            </div>

            <button
              id="submit-exam-trigger-btn"
              onClick={() => setIsSubmitModalOpen(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl shadow-md transition-all"
            >
              Nộp Bài
            </button>
          </div>
        </div>

        {/* Main Testing Body */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Question View Box (3 Cols) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xl">
              
              {/* Question Header */}
              <div className="flex items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="bg-cyan-500/20 text-cyan-600 font-extrabold text-xs px-3 py-1 rounded-lg border border-cyan-500/30">
                    Câu {currentQIndex + 1} / {selectedExam.questions.length}
                  </span>
                  {currentQ.difficulty && (
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Mức độ: {currentQ.difficulty}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleToggleFlag(currentQ.id)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                    isCurrentFlagged
                      ? 'bg-amber-500/20 text-amber-700 border-amber-500/40'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  <Flag className={`w-3.5 h-3.5 ${isCurrentFlagged ? 'fill-amber-400 text-amber-600' : ''}`} />
                  <span>{isCurrentFlagged ? 'Đã gắn cờ' : 'Gắn cờ xem lại'}</span>
                </button>
              </div>

              {/* Question Text */}
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed mb-4">
                {currentQ.question}
              </h3>

              {/* Question Image (if applicable) */}
              {currentQ.questionImage && (
                <div className="mb-6">
                  <img
                    src={currentQ.questionImage}
                    alt={`Hình minh họa câu hỏi ${currentQ.id}`}
                    className="max-w-full max-h-96 rounded-xl border border-slate-200 shadow-sm"
                  />
                </div>
              )}

              {/* Code Snippet Box (if applicable) */}
              {currentQ.codeSnippet && (
                <div className="mb-6 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs sm:text-sm">
                  <div className="bg-slate-900 px-3 py-1.5 text-[11px] text-slate-400 border-b border-slate-800">
                    {currentQ.codeLanguage || 'Mã nguồn'}
                  </div>
                  <pre className="p-4 text-cyan-300 overflow-x-auto">
                    <code>{currentQ.codeSnippet}</code>
                  </pre>
                </div>
              )}

              {/* Options List */}
              <div className="space-y-3 pt-2">
                {currentQ.options.map((opt) => {
                  const isSelected = userAnswers[currentQ.id] === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(currentQ.id, opt.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-cyan-50/40 border-cyan-500 text-cyan-900 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-50/80 hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {opt.id}
                      </div>

                      <span className="text-sm sm:text-base leading-relaxed flex-1">
                        {opt.text}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-200">
                <button
                  disabled={currentQIndex === 0}
                  onClick={() => setCurrentQIndex((prev) => prev - 1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-800 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Câu trước</span>
                </button>

                {isLastQuestion ? (
                  <button
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-md"
                  >
                    <Check className="w-4 h-4" />
                    <span>Xem lại & Nộp bài</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQIndex((prev) => prev + 1)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-md"
                  >
                    <span>Câu kế tiếp</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Question Palette Sidebar (1 Col) */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
                Bảng Câu Hỏi (Palette)
              </h4>

              <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2 mb-4">
                {selectedExam.questions.map((q, idx) => {
                  const isAnswered = !!userAnswers[q.id];
                  const isCurrent = currentQIndex === idx;
                  const isFlagged = flaggedQuestions.has(q.id);

                  let bgStyle = 'bg-slate-50 border-slate-200 text-slate-500';
                  if (isAnswered) bgStyle = 'bg-cyan-50/60 border-cyan-500 text-cyan-700 font-bold';
                  if (isFlagged) bgStyle = 'bg-amber-50/60 border-amber-500 text-amber-700 font-bold';
                  if (isCurrent) bgStyle += ' ring-2 ring-cyan-400 scale-105';

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQIndex(idx)}
                      className={`h-10 rounded-xl border flex items-center justify-center text-xs relative transition-all ${bgStyle}`}
                    >
                      <span>{idx + 1}</span>
                      {isFlagged && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1 right-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="space-y-2 pt-3 border-t border-slate-200 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-cyan-50 border border-cyan-500" />
                  <span>Đã trả lời ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-slate-50 border border-slate-200" />
                  <span>Chưa trả lời ({selectedExam.questions.length - answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-amber-50 border border-amber-500" />
                  <span>Đã gắn cờ ({flaggedQuestions.size})</span>
                </div>
              </div>

            </div>

            {/* Student & Room Info */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xl">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
                Thông Tin Thí Sinh
              </h4>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Họ và tên</span>
                  <strong className="text-slate-800 text-right">{studentName || 'Chưa cung cấp'}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Trường</span>
                  <strong className="text-slate-800 text-right">{selectedExam.schoolName || 'Chưa cung cấp'}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Khối</span>
                  <strong className="text-slate-800 text-right">{selectedExam.grade ? `Khối ${selectedExam.grade}` : 'Chưa cung cấp'}</strong>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400">Lớp</span>
                  <strong className="text-slate-800 text-right">{selectedExam.className || 'Chưa cung cấp'}</strong>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Submit Confirmation Modal */}
        {isSubmitModalOpen && (() => {
          const unansweredIndices = selectedExam.questions
            .map((q, idx) => ({ id: q.id, idx }))
            .filter(({ id }) => !userAnswers[id])
            .map(({ idx }) => idx);
          const hasUnanswered = unansweredIndices.length > 0;

          return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white border border-slate-300 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto border ${
                    hasUnanswered
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                      : 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30'
                  }`}
                >
                  {hasUnanswered ? <AlertTriangle className="w-6 h-6" /> : <Award className="w-6 h-6" />}
                </div>

                <h3 className="text-lg font-bold text-center text-slate-900">
                  {hasUnanswered ? 'Vẫn Còn Câu Chưa Trả Lời!' : 'Xác Nhận Nộp Bài Thi'}
                </h3>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Số câu đã trả lời:</span>
                    <strong className="text-cyan-600">{answeredCount} / {selectedExam.questions.length} câu</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Số câu còn bỏ trống:</span>
                    <strong className="text-amber-600">{selectedExam.questions.length - answeredCount} câu</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Thời gian còn lại:</span>
                    <strong className="text-slate-800">{formatTime(secondsRemaining)}</strong>
                  </div>
                </div>

                {hasUnanswered && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-2">
                    <p className="text-xs text-amber-700 font-semibold">
                      Bấm vào số câu bên dưới để quay lại làm tiếp:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {unansweredIndices.map((idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCurrentQIndex(idx);
                            setIsSubmitModalOpen(false);
                          }}
                          className="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-700 text-xs font-bold transition-colors"
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-500 text-center leading-relaxed">
                  Sau khi nộp bài, hệ thống sẽ tự động chấm điểm và hiển thị kết quả chi tiết từng câu hỏi.
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSubmitModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Làm tiếp
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitExam}
                    className={`px-5 py-2 text-xs font-bold rounded-xl shadow-lg transition-colors ${
                      hasUnanswered
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {hasUnanswered ? 'Vẫn Nộp Bài' : 'Nộp Bài Ngay'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 3: EXAM RESULTS & DEEP REVIEW (Kết quả bài thi)
  // ----------------------------------------------------
  if (examState === 'result' && selectedExam && lastAttempt) {
    const wrongCount = lastAttempt.maxScore - lastAttempt.score;

    const filteredQuestions = selectedExam.questions.filter((q) => {
      const ans = lastAttempt.answers.find((a) => a.questionId === q.id);
      if (reviewFilter === 'wrong') return !ans?.isCorrect;
      if (reviewFilter === 'flagged') return lastAttempt.flaggedQuestions?.includes(q.id);
      return true;
    });

    return (
      <div id="quiz-result-view" className="max-w-4xl mx-auto pb-16">
        
        {/* Scorecard Hero */}
        <div className={`border rounded-2xl p-6 sm:p-8 mb-8 shadow-2xl text-center relative overflow-hidden ${
          lastAttempt.passed
            ? 'bg-gradient-to-b from-emerald-50 via-white to-slate-50 border-emerald-300'
            : 'bg-gradient-to-b from-rose-50 via-white to-slate-50 border-rose-300'
        }`}>
          
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center border shadow-xl">
            {lastAttempt.passed ? (
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            ) : (
              <XCircle className="w-10 h-10 text-rose-600" />
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1">
            {lastAttempt.passed ? 'Chúc Mừng! Bạn Đã Vượt Qua Đề Thi' : 'Chưa Đạt Điểm Yêu Cầu'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6">
            {selectedExam.title}
          </p>

          {/* Big Score KPI */}
          <div className="inline-flex flex-col items-center gap-3 bg-slate-50/80 border border-slate-200 px-6 py-4 rounded-2xl mb-6">
            <div className="inline-flex items-baseline gap-2">
              <span className={`text-4xl sm:text-5xl font-black ${
                lastAttempt.passed ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {lastAttempt.percentage}%
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                ({lastAttempt.score} / {lastAttempt.maxScore} câu đúng)
              </span>
            </div>
            <div className="inline-flex items-baseline gap-2">
              <span className={`text-4xl sm:text-5xl font-black ${
                lastAttempt.passed ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {(lastAttempt.percentage / 10).toFixed(1).replace('.', ',')}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                Tổng điểm (thang 10)
              </span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-xs">
            <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 block text-[11px]">Kết quả</span>
              <strong className={lastAttempt.passed ? 'text-emerald-600' : 'text-rose-600'}>
                {lastAttempt.passed ? 'ĐẠT (PASSED)' : 'CHƯA ĐẠT'}
              </strong>
            </div>
            <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 block text-[11px]">Thời gian làm</span>
              <strong className="text-slate-800">{formatTime(lastAttempt.durationSeconds)}</strong>
            </div>
            <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 block text-[11px]">Điểm chuẩn đạt</span>
              <strong className="text-cyan-600">{selectedExam.passScorePercent}%</strong>
            </div>
            <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 block text-[11px]">Câu sai / bỏ qua</span>
              <strong className="text-rose-600">{wrongCount} câu</strong>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6 pt-6 border-t border-slate-200/80">
            <button
              onClick={() => setExamState('lobby')}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg transition-colors"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Trở Về Danh Sách Phòng Thi</span>
            </button>
          </div>

        </div>

        {/* Detailed Question by Question Review Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Xem Lại Chi Tiết & Giải Thích Từng Câu ({filteredQuestions.length})
            </h3>
            <p className="text-xs text-slate-500">
              Đối chiếu câu trả lời của bạn với đáp án chuẩn và lời giải thích học thuật
            </p>
          </div>

          {/* Filter options */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl text-xs">
            <button
              onClick={() => setReviewFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                reviewFilter === 'all' ? 'bg-slate-100 text-cyan-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tất cả ({selectedExam.questions.length})
            </button>
            <button
              onClick={() => setReviewFilter('wrong')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                reviewFilter === 'wrong' ? 'bg-slate-100 text-rose-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Câu sai ({wrongCount})
            </button>
            <button
              onClick={() => setReviewFilter('flagged')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                reviewFilter === 'flagged' ? 'bg-slate-100 text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đã gắn cờ ({lastAttempt.flaggedQuestions?.length || 0})
            </button>
          </div>
        </div>

        {/* Review Question List */}
        <div className="space-y-6">
          {filteredQuestions.map((q, idx) => {
            const ans = lastAttempt.answers.find((a) => a.questionId === q.id);
            const userSelected = ans?.selectedOptionId || '';
            const isCorrect = !!ans?.isCorrect;

            return (
              <div
                key={q.id}
                className={`bg-white/90 border rounded-2xl p-6 shadow-md ${
                  isCorrect ? 'border-slate-200' : 'border-rose-200 bg-rose-50/10'
                }`}
              >
                {/* Question title */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-500">
                      Câu {selectedExam.questions.indexOf(q) + 1}:
                    </span>
                    <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">
                      {q.question}
                    </h4>
                  </div>

                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 flex items-center gap-1 ${
                    isCorrect ? 'bg-emerald-500/20 text-emerald-700 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-700 border border-rose-500/30'
                  }`}>
                    {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{isCorrect ? 'Chính xác' : 'Chưa đúng'}</span>
                  </span>
                </div>

                {/* Question image if any */}
                {q.questionImage && (
                  <div className="my-3">
                    <img
                      src={q.questionImage}
                      alt={`Hình minh họa câu hỏi ${q.id}`}
                      className="max-w-full max-h-72 rounded-xl border border-slate-200 shadow-sm"
                    />
                  </div>
                )}

                {/* Code snippet if any */}
                {q.codeSnippet && (
                  <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs">
                    <pre className="p-3 text-cyan-300 overflow-x-auto">
                      <code>{q.codeSnippet}</code>
                    </pre>
                  </div>
                )}

                {/* Options Review */}
                <div className="space-y-2 mt-4">
                  {q.options.map((opt) => {
                    const isUserChoice = userSelected === opt.id;
                    const isRightChoice = q.correctOptionId === opt.id;

                    let optClass = 'bg-slate-50 border-slate-200/80 text-slate-500';
                    if (isRightChoice) {
                      optClass = 'bg-emerald-50/50 border-emerald-500/60 text-emerald-800 font-semibold';
                    } else if (isUserChoice && !isCorrect) {
                      optClass = 'bg-rose-50/50 border-rose-500/60 text-rose-800 line-through';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-xs sm:text-sm ${optClass}`}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isRightChoice ? 'bg-emerald-500 text-slate-950' : isUserChoice ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {opt.id}
                        </span>

                        <span className="flex-1">{opt.text}</span>

                        {isRightChoice && (
                          <span className="text-[11px] text-emerald-600 font-bold">
                            (Đáp án chuẩn)
                          </span>
                        )}
                        {isUserChoice && !isCorrect && (
                          <span className="text-[11px] text-rose-600 font-bold">
                            (Bạn đã chọn)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation block */}
                {q.explanation && (
                  <div className="mt-4 p-3.5 bg-slate-50 border-l-4 border-indigo-500 rounded-r-xl text-xs text-slate-600 leading-relaxed">
                    <strong className="text-indigo-600 block mb-0.5">💡 Giải thích chi tiết:</strong>
                    {q.explanation}
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>
    );
  }

  return null;
};
