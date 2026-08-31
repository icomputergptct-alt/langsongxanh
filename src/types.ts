export type NavTab = 'news' | 'offline' | 'quiz-rooms' | 'quiz-creator' | 'dashboard' | 'utilities';

export type TechCategory = 
  | 'Tất cả'
  | 'Trí tuệ Nhân tạo'
  | 'An ninh Mạng'
  | 'Điện toán Đám mây & DevOps'
  | 'Kiến trúc Phần mềm'
  | 'Blockchain & Web3'
  | 'Phần cứng & Bán dẫn';

export interface Comment {
  id: string;
  articleId: string;
  authorName: string;
  authorAvatar: string;
  authorRole: string;
  authorBadge?: string;
  content: string;
  createdAt: string;
  likes: number;
  isLikedByUser?: boolean;
  replies?: Comment[];
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  author: {
    name: string;
    role: string;
    avatar: string;
    verified?: boolean;
  };
  publishedAt: string;
  readTimeMinutes: number;
  category: TechCategory;
  tags: string[];
  coverImage: string;
  views: number;
  likes: number;
  isLikedByUser?: boolean;
  isBookmarked?: boolean;
  isDeepAnalysis?: boolean;
  isTrending?: boolean;
  keyInsights?: string[];
}

export interface OfflineArticle {
  article: Article;
  savedAt: string;
  sizeKB: number;
  cachedContent: string;
}

export interface QuizOption {
  id: string; // 'A', 'B', 'C', 'D'
  text: string;
  // A screenshot/photo of a formula that's easier to paste as an image than to
  // retype (e.g. a fraction) — shown instead of/alongside `text` when set.
  image?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  questionImage?: string;
  codeSnippet?: string;
  codeLanguage?: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
  topic?: string;
  difficulty?: 'Dễ' | 'Trung bình' | 'Khó';
}

export interface QuizExam {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Cơ bản' | 'Trung bình' | 'Nâng cao' | 'Chuyên gia';
  durationMinutes: number;
  passScorePercent: number;
  questions: QuizQuestion[];
  createdAt: string;
  authorName: string;
  schoolName?: string;
  className?: string;
  // Only populated for the room's own creator/admin (see quiz_exams_public view) —
  // everyone else must go through storageService.verifyRoomPassword instead of
  // reading this back. hasPassword is safe for everyone: it only says whether one exists.
  roomPassword?: string;
  hasPassword: boolean;
  grade?: number;
  schoolYear?: string;
  deadlineAt?: string;
  isArchived?: boolean;
  isDraft?: boolean;
  participantsCount: number;
  averageScore: number;
  sourceFile?: string;
  isFeatured?: boolean;
  createdBy?: string;
}

// A real uploaded .docx/.pdf exam file browsable in "Kho đề thi kiểm tra" — distinct from
// QuizExam, which is an interactive multiple-choice test room.
export interface ExamDocument {
  id: string;
  title: string;
  grade?: number;
  className?: string;
  schoolYear?: string;
  semester?: string;
  category?: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  views: number;
  uploadedAt: string;
}

// A message submitted through the public "Liên Hệ Hệ Thống" contact form
export interface ContactMessage {
  id: string;
  title: string;
  content: string;
  email: string;
  createdAt: string;
}

// One row in the admin "Nhật Ký Hoạt Động" audit trail — who did what and
// when. Guests/parents have no account (actorId/actorEmail null, identified
// only by whatever name they typed); teachers/admins are resolved from their
// Supabase auth session at the time the action happened.
export interface ActivityLog {
  id: string;
  createdAt: string;
  actorType: 'guest' | 'teacher' | 'admin';
  actorName: string | null;
  actorEmail: string | null;
  actorId: string | null;
  action: string;
  detail: string | null;
}

export interface UserExamAnswer {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole?: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  answers: UserExamAnswer[];
  flaggedQuestions?: string[];
}

export interface UtilityStepGuide {
  step: number;
  title: string;
  instruction: string;
  tip?: string;
  exampleSnippet?: string;
}

export interface SoftwareUtility {
  id: string;
  name: string;
  slug: string;
  category: 'Lập trình & Mã nguồn' | 'Mạng & Hạ tầng' | 'Bảo mật & Mã hoá' | 'Định dạng Dữ liệu' | 'Nội dung & Tài liệu' | 'An ninh Mạng' | 'Toán học & Khoa học';
  icon: string;
  shortDesc: string;
  detailedDesc: string;
  badge?: string;
  features: string[];
  useCases: string[];
  guides: UtilityStepGuide[];
  keyShortcuts?: { key: string; action: string }[];
}

export interface UrlSecurityScanResult {
  inputUrl: string;
  normalizedUrl: string;
  hostname: string;
  resolvedIps: string[];
  finalUrl: string;
  redirectChain: string[];
  httpStatus: number | null;
  tls: {
    issuer: string | null;
    subject: string | null;
    validFrom: string | null;
    validTo: string | null;
    authorized: boolean | null;
  } | null;
  riskScore: number;
  verdict: 'An toàn' | 'Cần thận trọng' | 'Nguy hiểm' | 'Không xác định';
  reasons: string[];
  checkedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'Kỹ sư Phần mềm' | 'Quản trị viên' | 'Học viên' | 'Kiến trúc sư';
  completedExamsCount: number;
  averageScore: number;
  readingStreakDays: number;
  offlineSavedCount: number;
}
