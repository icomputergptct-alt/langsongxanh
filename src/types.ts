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
  roomPassword?: string;
  grade?: number;
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
  semester?: string;
  category?: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  views: number;
  uploadedAt: string;
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
  category: 'Lập trình & Mã nguồn' | 'Mạng & Hạ tầng' | 'Bảo mật & Mã hoá' | 'Định dạng Dữ liệu' | 'Nội dung & Tài liệu';
  icon: string;
  shortDesc: string;
  detailedDesc: string;
  badge?: string;
  features: string[];
  useCases: string[];
  guides: UtilityStepGuide[];
  keyShortcuts?: { key: string; action: string }[];
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
