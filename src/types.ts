export type NavTab = 'news' | 'offline' | 'quiz-rooms' | 'quiz-creator' | 'dashboard' | 'utilities';

export type TechCategory = 
  | 'Tất cả'
  | 'Trí tuệ Nhân tạo'
  | 'Tin tức thời sự'
  | 'Tin tức thời sự thế giới'
  | 'An ninh Mạng'
  | 'Điện toán Đám mây & DevOps'
  | 'Kiến trúc Phần mềm'
  | 'Blockchain & Web3'
  | 'Phần cứng & Bán dẫn'
  | 'Tin công nghệ mới'
  | 'Tin tức địa phương';

// Short news items shown in the home page's "Tin tức công nghệ mới" card.
export const TECH_NEWS_CATEGORY: TechCategory = 'Tin công nghệ mới';

// Default avatar: a cartoon character wearing a Vietnamese nón lá (public/avatar-non-la.svg).
export const DEFAULT_AVATAR = '/avatar-non-la.svg';
// Stock photo used as the default before; rows saved with it still carry this URL.
const LEGACY_DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde';
export const resolveAvatar = (url?: string | null) =>
  !url || url.startsWith(LEGACY_DEFAULT_AVATAR) ? DEFAULT_AVATAR : url;

// Local news items, shown as their own strip on the news page.
export const LOCAL_NEWS_CATEGORY: TechCategory = 'Tin tức địa phương';

// Short news categories that use the compact card and a strip instead of the article grid.
export const isCompactNewsCategory = (category: string) =>
  category === TECH_NEWS_CATEGORY || category === LOCAL_NEWS_CATEGORY;

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
  // When true, submit_exam_attempt returns each student their own per-question
  // review (correct answer + explanation) right after they submit — off by
  // default so a room reused across many sittings doesn't leak its answer key
  // to later test-takers via an earlier student's screenshot.
  allowAnswerReview?: boolean;
  participantsCount: number;
  averageScore: number;
  sourceFile?: string;
  isFeatured?: boolean;
  createdBy?: string;
}

// A real uploaded .docx/.pdf exam file browsable in "Kho đề thi kiểm tra" — distinct from
// QuizExam, which is an interactive multiple-choice test room.
// "Tin Học" video library: YouTube videos (or any video link) curated by admins.
export const VIDEO_CATEGORIES = [
  'Tin học cơ bản',
  'Tin học văn phòng',
  'Lập trình',
  'Mạng & Internet',
  'Thủ thuật máy tính',
  'Khác',
] as const;

export interface VideoItem {
  id: string;
  title: string;
  url: string;
  youtubeId: string | null;
  thumbnailUrl: string | null;
  description: string;
  category: string;
  createdAt: string;
}

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
// A "Phòng Họp Online" room; the id is the Jitsi room name.
export interface Meeting {
  id: string;
  title: string | null;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
  lastActiveAt: string;
}

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

// One question's full review detail, returned by submit_exam_attempt only when
// the exam has allowAnswerReview on — transient (part of the submit response
// only, never stored client-side or re-fetchable later).
export interface ReviewedQuestion {
  questionId: string;
  questionText: string;
  options: QuizOption[];
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  explanation: string;
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
