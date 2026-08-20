import { Article, Comment, ExamAttempt, OfflineArticle, QuizExam } from '../types';
import { INITIAL_ARTICLES, INITIAL_COMMENTS, INITIAL_EXAMS, INITIAL_ATTEMPTS } from '../data/initialData';

const STORAGE_KEYS = {
  ARTICLES: 'techpulse_articles_v1',
  OFFLINE_ARTICLES: 'techpulse_offline_articles_v1',
  COMMENTS: 'techpulse_comments_v1',
  EXAMS: 'techpulse_exams_v1',
  ATTEMPTS: 'techpulse_attempts_v1',
  SIMULATED_OFFLINE: 'techpulse_simulated_offline_v1'
};

// Safe JSON parser
function safeGet<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error writing ${key} to localStorage:`, e);
  }
}

export const storageService = {
  // --- Articles ---
  getArticles(): Article[] {
    const stored = safeGet<Article[] | null>(STORAGE_KEYS.ARTICLES, null);
    if (!stored || stored.length === 0) {
      safeSet(STORAGE_KEYS.ARTICLES, INITIAL_ARTICLES);
      return INITIAL_ARTICLES;
    }
    return stored;
  },

  getArticleById(id: string): Article | undefined {
    const articles = this.getArticles();
    return articles.find((a) => a.id === id);
  },

  toggleArticleLike(articleId: string): { likes: number; isLiked: boolean } {
    const articles = this.getArticles();
    const article = articles.find((a) => a.id === articleId);
    if (!article) return { likes: 0, isLiked: false };

    const wasLiked = !!article.isLikedByUser;
    article.isLikedByUser = !wasLiked;
    article.likes += wasLiked ? -1 : 1;

    safeSet(STORAGE_KEYS.ARTICLES, articles);
    return { likes: article.likes, isLiked: article.isLikedByUser };
  },

  incrementArticleViews(articleId: string): void {
    const articles = this.getArticles();
    const article = articles.find((a) => a.id === articleId);
    if (article) {
      article.views = (article.views || 0) + 1;
      safeSet(STORAGE_KEYS.ARTICLES, articles);
    }
  },

  // --- Offline Articles Cache ---
  getOfflineArticles(): OfflineArticle[] {
    return safeGet<OfflineArticle[]>(STORAGE_KEYS.OFFLINE_ARTICLES, []);
  },

  isArticleSavedOffline(articleId: string): boolean {
    const offlineList = this.getOfflineArticles();
    return offlineList.some((item) => item.article.id === articleId);
  },

  saveArticleOffline(article: Article): OfflineArticle {
    const offlineList = this.getOfflineArticles();
    const existingIndex = offlineList.findIndex((item) => item.article.id === article.id);

    // Calculate approximate size in KB
    const contentString = JSON.stringify(article);
    const sizeKB = Math.max(1, Math.round(new Blob([contentString]).size / 1024));

    const offlineItem: OfflineArticle = {
      article: { ...article, isBookmarked: true },
      savedAt: new Date().toISOString(),
      sizeKB,
      cachedContent: article.content,
    };

    if (existingIndex >= 0) {
      offlineList[existingIndex] = offlineItem;
    } else {
      offlineList.unshift(offlineItem);
    }

    safeSet(STORAGE_KEYS.OFFLINE_ARTICLES, offlineList);

    // Also update bookmark state in main articles
    const articles = this.getArticles();
    const found = articles.find((a) => a.id === article.id);
    if (found) {
      found.isBookmarked = true;
      safeSet(STORAGE_KEYS.ARTICLES, articles);
    }

    return offlineItem;
  },

  removeArticleOffline(articleId: string): void {
    let offlineList = this.getOfflineArticles();
    offlineList = offlineList.filter((item) => item.article.id !== articleId);
    safeSet(STORAGE_KEYS.OFFLINE_ARTICLES, offlineList);

    const articles = this.getArticles();
    const found = articles.find((a) => a.id === articleId);
    if (found) {
      found.isBookmarked = false;
      safeSet(STORAGE_KEYS.ARTICLES, articles);
    }
  },

  clearAllOfflineArticles(): void {
    safeSet(STORAGE_KEYS.OFFLINE_ARTICLES, []);
  },

  // --- Comments ---
  getComments(articleId: string): Comment[] {
    const allComments = safeGet<Record<string, Comment[]>>(STORAGE_KEYS.COMMENTS, {
      'art-1': INITIAL_COMMENTS,
    });
    return allComments[articleId] || [];
  },

  addComment(articleId: string, authorName: string, authorRole: string, content: string, parentId?: string): Comment {
    const allComments = safeGet<Record<string, Comment[]>>(STORAGE_KEYS.COMMENTS, {
      'art-1': INITIAL_COMMENTS,
    });

    const articleComments = allComments[articleId] || [];

    const newComment: Comment = {
      id: 'cmt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      articleId,
      authorName: authorName.trim() || 'Kỹ sư Ẩn danh',
      authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      authorRole: authorRole.trim() || 'Thành viên TechHub',
      content: content.trim(),
      createdAt: new Date().toISOString(),
      likes: 0,
      isLikedByUser: false,
      replies: [],
    };

    if (parentId) {
      // Find parent comment and append reply
      const parent = articleComments.find((c) => c.id === parentId);
      if (parent) {
        if (!parent.replies) parent.replies = [];
        parent.replies.push(newComment);
      } else {
        articleComments.unshift(newComment);
      }
    } else {
      articleComments.unshift(newComment);
    }

    allComments[articleId] = articleComments;
    safeSet(STORAGE_KEYS.COMMENTS, allComments);
    return newComment;
  },

  toggleCommentLike(articleId: string, commentId: string): void {
    const allComments = safeGet<Record<string, Comment[]>>(STORAGE_KEYS.COMMENTS, {
      'art-1': INITIAL_COMMENTS,
    });
    const articleComments = allComments[articleId] || [];

    const toggleInList = (list: Comment[]): boolean => {
      for (const c of list) {
        if (c.id === commentId) {
          const wasLiked = !!c.isLikedByUser;
          c.isLikedByUser = !wasLiked;
          c.likes += wasLiked ? -1 : 1;
          return true;
        }
        if (c.replies && toggleInList(c.replies)) {
          return true;
        }
      }
      return false;
    };

    toggleInList(articleComments);
    allComments[articleId] = articleComments;
    safeSet(STORAGE_KEYS.COMMENTS, allComments);
  },

  // --- Quiz Exams ---
  getExams(): QuizExam[] {
    const stored = safeGet<QuizExam[] | null>(STORAGE_KEYS.EXAMS, null);
    if (!stored || stored.length === 0) {
      safeSet(STORAGE_KEYS.EXAMS, INITIAL_EXAMS);
      return INITIAL_EXAMS;
    }
    return stored;
  },

  getExamById(examId: string): QuizExam | undefined {
    const exams = this.getExams();
    return exams.find((e) => e.id === examId);
  },

  saveExam(exam: QuizExam): void {
    const exams = this.getExams();
    const index = exams.findIndex((e) => e.id === exam.id);
    if (index >= 0) {
      exams[index] = exam;
    } else {
      exams.unshift(exam);
    }
    safeSet(STORAGE_KEYS.EXAMS, exams);
  },

  deleteExam(examId: string): void {
    let exams = this.getExams();
    exams = exams.filter((e) => e.id !== examId);
    safeSet(STORAGE_KEYS.EXAMS, exams);
  },

  // --- Exam Attempts & Admin Progress Analytics ---
  getAttempts(): ExamAttempt[] {
    const stored = safeGet<ExamAttempt[] | null>(STORAGE_KEYS.ATTEMPTS, null);
    if (!stored || stored.length === 0) {
      safeSet(STORAGE_KEYS.ATTEMPTS, INITIAL_ATTEMPTS);
      return INITIAL_ATTEMPTS;
    }
    return stored;
  },

  recordAttempt(attempt: ExamAttempt): void {
    const attempts = this.getAttempts();
    attempts.unshift(attempt);
    safeSet(STORAGE_KEYS.ATTEMPTS, attempts);

    // Update exam participant stats
    const exams = this.getExams();
    const exam = exams.find((e) => e.id === attempt.examId);
    if (exam) {
      exam.participantsCount = (exam.participantsCount || 0) + 1;
      const examAttempts = attempts.filter((a) => a.examId === attempt.examId);
      const totalScore = examAttempts.reduce((acc, a) => acc + a.percentage, 0);
      exam.averageScore = Math.round((totalScore / examAttempts.length) * 10) / 10;
      safeSet(STORAGE_KEYS.EXAMS, exams);
    }
  },

  // --- Simulated Offline Mode Toggle ---
  getIsSimulatedOffline(): boolean {
    return safeGet<boolean>(STORAGE_KEYS.SIMULATED_OFFLINE, false);
  },

  isOfflineMode(): boolean {
    return this.getIsSimulatedOffline();
  },

  setSimulatedOffline(isOffline: boolean): void {
    safeSet(STORAGE_KEYS.SIMULATED_OFFLINE, isOffline);
  },

  setOfflineMode(isOffline: boolean): void {
    this.setSimulatedOffline(isOffline);
  },

  toggleLikeArticle(articleId: string): { likes: number; isLiked: boolean } {
    return this.toggleArticleLike(articleId);
  }
};
