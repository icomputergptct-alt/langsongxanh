import { Article, Comment, ContactMessage, ExamAttempt, ExamDocument, OfflineArticle, QuizExam } from '../types';
import { supabase } from './supabaseClient';
import { generateExamPdfBlob } from './examPdf';

// Local-only state: things that are inherently per-device (offline cache,
// the "simulate offline" dev toggle, and this browser's like/bookmark overlay
// since the app has no user accounts / auth).
const LOCAL_KEYS = {
  OFFLINE_ARTICLES: 'techpulse_offline_articles_v1',
  SIMULATED_OFFLINE: 'techpulse_simulated_offline_v1',
  LIKED_ARTICLES: 'techpulse_liked_articles_v1',
  LIKED_COMMENTS: 'techpulse_liked_comments_v1',
};

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

function getLikedArticleIds(): Set<string> {
  return new Set(safeGet<string[]>(LOCAL_KEYS.LIKED_ARTICLES, []));
}

function setLikedArticleIds(ids: Set<string>): void {
  safeSet(LOCAL_KEYS.LIKED_ARTICLES, Array.from(ids));
}

function getLikedCommentIds(): Set<string> {
  return new Set(safeGet<string[]>(LOCAL_KEYS.LIKED_COMMENTS, []));
}

function setLikedCommentIds(ids: Set<string>): void {
  safeSet(LOCAL_KEYS.LIKED_COMMENTS, Array.from(ids));
}

// "nguyen thi an" and "nguyễn thị an" should count as the same student — strip
// Vietnamese diacritics (đ/Đ don't decompose under NFD, so handled separately)
// before comparing names.
function normalizeNameForMatch(name: string): string {
  const noDiacritics = name
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .split('')
    .filter((ch) => {
      const code = ch.codePointAt(0) || 0;
      return code < 0x0300 || code > 0x036f; // strip combining diacritical marks
    })
    .join('');
  return noDiacritics.replace(/\s+/g, ' ');
}

// --- Row <-> Model mapping ---

function rowToArticle(row: any, isLiked: boolean, isBookmarked: boolean): Article {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    content: row.content,
    author: {
      name: row.author_name,
      role: row.author_role,
      avatar: row.author_avatar,
      verified: row.author_verified,
    },
    publishedAt: row.published_at,
    readTimeMinutes: row.read_time_minutes,
    category: row.category,
    tags: row.tags || [],
    coverImage: row.cover_image,
    views: row.views,
    likes: row.likes,
    isLikedByUser: isLiked,
    isBookmarked: isBookmarked,
    isDeepAnalysis: row.is_deep_analysis,
    isTrending: row.is_trending,
    keyInsights: row.key_insights || [],
  };
}

function articleToRow(article: Article) {
  return sanitizeDeep({
    id: article.id,
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    content: article.content,
    author_name: article.author.name,
    author_role: article.author.role,
    author_avatar: article.author.avatar,
    author_verified: !!article.author.verified,
    published_at: article.publishedAt,
    read_time_minutes: article.readTimeMinutes,
    category: article.category,
    tags: article.tags,
    cover_image: article.coverImage,
    views: article.views,
    likes: article.likes,
    is_deep_analysis: !!article.isDeepAnalysis,
    is_trending: !!article.isTrending,
    key_insights: article.keyInsights || [],
  });
}

function rowToExam(row: any): QuizExam {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    difficulty: row.difficulty,
    durationMinutes: row.duration_minutes,
    passScorePercent: row.pass_score_percent,
    questions: row.questions || [],
    createdAt: row.created_at,
    authorName: row.author_name,
    schoolName: row.school_name || undefined,
    className: row.class_name || undefined,
    roomPassword: row.room_password || undefined,
    hasPassword: row.has_password ?? !!row.room_password,
    grade: row.grade || undefined,
    schoolYear: row.school_year || undefined,
    deadlineAt: row.deadline_at || undefined,
    isArchived: row.is_archived || false,
    isDraft: row.is_draft || false,
    participantsCount: row.participants_count,
    averageScore: row.average_score,
    sourceFile: row.source_file || undefined,
    isFeatured: row.is_featured,
    createdBy: row.created_by || undefined,
  };
}

// Postgres text/jsonb columns reject NUL bytes and most control characters
// (e.g. leftover junk from reading a binary .docx file as plain text), which
// would otherwise make the insert fail with an opaque error. Strip them here.
// Built at runtime from char codes (rather than a regex literal with escapes)
// so no raw control bytes end up sitting in this source file.
const CONTROL_CHAR_CODES = Array.from({ length: 32 }, (_, i) => i).filter((c) => c !== 9 && c !== 10 && c !== 13);
const CONTROL_CHARS_PATTERN = new RegExp('[' + CONTROL_CHAR_CODES.map((c) => String.fromCharCode(c)).join('') + ']', 'g');

function sanitizeDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return value.replace(CONTROL_CHARS_PATTERN, '') as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeDeep) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = sanitizeDeep(val);
    }
    return result as T;
  }
  return value;
}

function examToRow(exam: QuizExam) {
  return sanitizeDeep({
    id: exam.id,
    title: exam.title,
    description: exam.description,
    category: exam.category,
    difficulty: exam.difficulty,
    duration_minutes: exam.durationMinutes,
    pass_score_percent: exam.passScorePercent,
    questions: exam.questions,
    created_at: exam.createdAt,
    author_name: exam.authorName,
    school_name: exam.schoolName || null,
    class_name: exam.className || null,
    room_password: exam.roomPassword || null,
    grade: exam.grade || null,
    school_year: exam.schoolYear || null,
    deadline_at: exam.deadlineAt || null,
    is_archived: !!exam.isArchived,
    is_draft: !!exam.isDraft,
    participants_count: exam.participantsCount,
    average_score: exam.averageScore,
    source_file: exam.sourceFile || null,
    is_featured: !!exam.isFeatured,
    created_by: exam.createdBy || null,
  });
}

function rowToAttempt(row: any): ExamAttempt {
  return {
    id: row.id,
    examId: row.exam_id,
    examTitle: row.exam_title,
    userId: row.user_id,
    userName: row.user_name,
    userAvatar: row.user_avatar,
    userRole: row.user_role || undefined,
    score: row.score,
    maxScore: row.max_score,
    percentage: row.percentage,
    passed: row.passed,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationSeconds: row.duration_seconds,
    answers: row.answers || [],
    flaggedQuestions: row.flagged_questions || [],
  };
}

function rowToExamDocument(row: any): ExamDocument {
  return {
    id: row.id,
    title: row.title,
    grade: row.grade || undefined,
    className: row.class_name || undefined,
    schoolYear: row.school_year || undefined,
    semester: row.semester || undefined,
    category: row.category || undefined,
    description: row.description || undefined,
    fileUrl: row.file_url,
    fileName: row.file_name,
    fileType: row.file_type,
    views: row.views,
    uploadedAt: row.uploaded_at,
  };
}

export const storageService = {
  // --- Articles ---
  async getArticles(): Promise<Article[]> {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('published_at', { ascending: false });
    if (error) throw error;

    const likedIds = getLikedArticleIds();
    const offlineIds = new Set(this.getOfflineArticles().map((o) => o.article.id));
    return (data || []).map((row) => rowToArticle(row, likedIds.has(row.id), offlineIds.has(row.id)));
  },

  async getArticleById(id: string): Promise<Article | undefined> {
    const { data, error } = await supabase.from('articles').select('*').eq('id', id).maybeSingle();
    if (error || !data) return undefined;

    const likedIds = getLikedArticleIds();
    const offlineIds = new Set(this.getOfflineArticles().map((o) => o.article.id));
    return rowToArticle(data, likedIds.has(id), offlineIds.has(id));
  },

  async toggleArticleLike(articleId: string): Promise<{ likes: number; isLiked: boolean }> {
    const likedIds = getLikedArticleIds();
    const wasLiked = likedIds.has(articleId);

    const { data, error } = await supabase.from('articles').select('likes').eq('id', articleId).maybeSingle();
    if (error || !data) return { likes: 0, isLiked: wasLiked };

    const newLikes = Math.max(0, data.likes + (wasLiked ? -1 : 1));
    await supabase.from('articles').update({ likes: newLikes }).eq('id', articleId);

    if (wasLiked) likedIds.delete(articleId);
    else likedIds.add(articleId);
    setLikedArticleIds(likedIds);

    return { likes: newLikes, isLiked: !wasLiked };
  },

  async incrementArticleViews(articleId: string): Promise<void> {
    const { data } = await supabase.from('articles').select('views').eq('id', articleId).maybeSingle();
    if (data) {
      await supabase.from('articles').update({ views: (data.views || 0) + 1 }).eq('id', articleId);
    }
  },

  // Admin-only (enforced by RLS): create/update/delete articles.
  async createArticle(article: Article): Promise<void> {
    const { error } = await supabase.from('articles').insert(articleToRow(article));
    if (error) throw error;
  },

  async updateArticle(article: Article): Promise<void> {
    const { error } = await supabase.from('articles').update(articleToRow(article)).eq('id', article.id);
    if (error) throw error;
  },

  async deleteArticle(articleId: string): Promise<void> {
    const { error } = await supabase.from('articles').delete().eq('id', articleId);
    if (error) throw error;
  },

  // --- Offline Articles Cache (local-only device cache) ---
  getOfflineArticles(): OfflineArticle[] {
    return safeGet<OfflineArticle[]>(LOCAL_KEYS.OFFLINE_ARTICLES, []);
  },

  isArticleSavedOffline(articleId: string): boolean {
    const offlineList = this.getOfflineArticles();
    return offlineList.some((item) => item.article.id === articleId);
  },

  saveArticleOffline(article: Article): OfflineArticle {
    const offlineList = this.getOfflineArticles();
    const existingIndex = offlineList.findIndex((item) => item.article.id === article.id);

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

    safeSet(LOCAL_KEYS.OFFLINE_ARTICLES, offlineList);
    return offlineItem;
  },

  removeArticleOffline(articleId: string): void {
    let offlineList = this.getOfflineArticles();
    offlineList = offlineList.filter((item) => item.article.id !== articleId);
    safeSet(LOCAL_KEYS.OFFLINE_ARTICLES, offlineList);
  },

  clearAllOfflineArticles(): void {
    safeSet(LOCAL_KEYS.OFFLINE_ARTICLES, []);
  },

  // --- Comments ---
  async getComments(articleId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const likedIds = getLikedCommentIds();
    const rows = data || [];
    const byId = new Map<string, Comment>();
    for (const row of rows) {
      byId.set(row.id, {
        id: row.id,
        articleId: row.article_id,
        authorName: row.author_name,
        authorAvatar: row.author_avatar,
        authorRole: row.author_role,
        authorBadge: row.author_badge || undefined,
        content: row.content,
        createdAt: row.created_at,
        likes: row.likes,
        isLikedByUser: likedIds.has(row.id),
        replies: [],
      });
    }

    const roots: Comment[] = [];
    for (const row of rows) {
      const comment = byId.get(row.id)!;
      const parent = row.parent_id ? byId.get(row.parent_id) : undefined;
      if (parent) {
        if (!parent.replies) parent.replies = [];
        parent.replies.push(comment);
      } else {
        roots.push(comment);
      }
    }
    return roots;
  },

  async addComment(
    articleId: string,
    authorName: string,
    authorRole: string,
    content: string,
    parentId?: string
  ): Promise<Comment> {
    const row = {
      id: 'cmt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      article_id: articleId,
      parent_id: parentId || null,
      author_name: authorName.trim() || 'Kỹ sư Ẩn danh',
      author_avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      author_role: authorRole.trim() || 'Thành viên TechHub',
      content: content.trim(),
      created_at: new Date().toISOString(),
      likes: 0,
    };

    const { error } = await supabase.from('comments').insert(row);
    if (error) throw error;

    return {
      id: row.id,
      articleId,
      authorName: row.author_name,
      authorAvatar: row.author_avatar,
      authorRole: row.author_role,
      content: row.content,
      createdAt: row.created_at,
      likes: 0,
      replies: [],
    };
  },

  // Goes through a security-definer RPC (see supabase/auth.sql) instead of a
  // client-side read-then-write — comments no longer grant a blanket public
  // UPDATE (which used to let anyone overwrite any comment's content, not
  // just its like count).
  async toggleCommentLike(articleId: string, commentId: string): Promise<void> {
    const likedIds = getLikedCommentIds();
    const wasLiked = likedIds.has(commentId);

    const { error } = await supabase.rpc('increment_comment_likes', {
      p_comment_id: commentId,
      p_delta: wasLiked ? -1 : 1,
    });
    if (error) {
      console.error('Không cập nhật được lượt thích bình luận:', error);
      return;
    }

    if (wasLiked) likedIds.delete(commentId);
    else likedIds.add(commentId);
    setLikedCommentIds(likedIds);
  },

  // --- Quiz Exams ---
  // Reads go through the quiz_exams_public view (not the quiz_exams table
  // directly) — it masks room_password to null for anyone but the room's own
  // creator/admin, exposing only a safe hasPassword boolean to everyone else.
  // See supabase/auth.sql for the view + the RLS column revoke that backs it.
  async getExams(): Promise<QuizExam[]> {
    const { data, error } = await supabase
      .from('quiz_exams_public')
      .select('*')
      .eq('is_archived', false)
      .eq('is_draft', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToExam);
  },

  // Admin management view needs archived (past-deadline) rooms too, so teachers
  // can still open their score list even after the room itself has closed.
  async getAllExamsIncludingArchived(): Promise<QuizExam[]> {
    const { data, error } = await supabase
      .from('quiz_exams_public')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToExam);
  },

  // Rooms past their deadline get archived to a PDF in the document library and
  // hidden from the active list. There's no background server, so this runs
  // lazily — called whenever someone opens the Quiz Room.
  async archiveExpiredExams(): Promise<void> {
    const { data, error } = await supabase
      .from('quiz_exams_public')
      .select('*')
      .eq('is_archived', false)
      .not('deadline_at', 'is', null)
      .lt('deadline_at', new Date().toISOString());
    if (error || !data || data.length === 0) return;

    for (const row of data) {
      const exam = rowToExam(row);
      try {
        const pdfBlob = await generateExamPdfBlob(exam);
        const fileName = `${exam.title}.pdf`;
        const { fileUrl } = await this.uploadExamFileBlob(pdfBlob, 'pdf');
        await this.saveExamDocument({
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: exam.title,
          grade: exam.grade,
          className: exam.className,
          schoolYear: exam.schoolYear,
          fileUrl,
          fileName,
          fileType: 'pdf',
          views: 0,
          uploadedAt: new Date().toISOString(),
        });
        await supabase.from('quiz_exams').update({ is_archived: true }).eq('id', exam.id);
      } catch (err) {
        console.error(`Không thể lưu trữ đề thi hết hạn "${exam.title}":`, err);
      }
    }
  },

  async getExamById(examId: string): Promise<QuizExam | undefined> {
    const { data, error } = await supabase.from('quiz_exams_public').select('*').eq('id', examId).maybeSingle();
    if (error || !data) return undefined;
    return rowToExam(data);
  },

  async saveExam(exam: QuizExam): Promise<void> {
    const { error } = await supabase.from('quiz_exams').upsert(examToRow(exam));
    if (error) throw error;
  },

  async deleteExam(examId: string): Promise<void> {
    const { error } = await supabase.from('quiz_exams').delete().eq('id', examId);
    if (error) throw error;
  },

  // Server-side password check (Postgres RPC, see supabase/auth.sql) — the raw
  // room_password never has to round-trip to the client to verify an attempt.
  async verifyRoomPassword(examId: string, passwordAttempt: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('verify_room_password', {
      p_exam_id: examId,
      p_password: passwordAttempt,
    });
    if (error) {
      console.error('Không kiểm tra được mật khẩu phòng thi:', error);
      return false;
    }
    return !!data;
  },

  // There's no student login, so "already took this exam" is checked against
  // exam_attempts by name (case-insensitive) rather than a real account — a
  // student who retypes their name slightly differently can still get back in.
  // Goes through a security-definer RPC (see supabase/auth.sql) instead of a
  // raw SELECT, since exam_attempts is no longer publicly readable (it holds
  // every student's scores/answers, not just names).
  async hasStudentCompletedExam(examId: string, studentName: string): Promise<boolean> {
    const target = normalizeNameForMatch(studentName);
    if (!target) return false;
    const { data, error } = await supabase.rpc('has_student_completed_exam', {
      p_exam_id: examId,
      p_student_name: studentName,
    });
    if (error) {
      console.error('Không kiểm tra được lượt thi trước đó:', error);
      return false;
    }
    return !!data;
  },

  // --- Exam Attempts & Admin Progress Analytics ---
  async getAttempts(): Promise<ExamAttempt[]> {
    const { data, error } = await supabase
      .from('exam_attempts')
      .select('*')
      .order('completed_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToAttempt);
  },

  async recordAttempt(attempt: ExamAttempt): Promise<void> {
    const row = {
      id: attempt.id,
      exam_id: attempt.examId,
      exam_title: attempt.examTitle,
      user_id: attempt.userId,
      user_name: attempt.userName,
      user_avatar: attempt.userAvatar,
      user_role: attempt.userRole || null,
      score: attempt.score,
      max_score: attempt.maxScore,
      percentage: attempt.percentage,
      passed: attempt.passed,
      started_at: attempt.startedAt,
      completed_at: attempt.completedAt,
      duration_seconds: attempt.durationSeconds,
      answers: attempt.answers,
      flagged_questions: attempt.flaggedQuestions || [],
    };
    const { error } = await supabase.from('exam_attempts').insert(row);
    if (error) throw error;

    // Atomic RPC (see supabase/auth.sql) — works for anonymous students too,
    // unlike a direct update against quiz_exams (RLS restricts that to the
    // room's own creator/admin).
    const { error: statsError } = await supabase.rpc('record_exam_participation', {
      p_exam_id: attempt.examId,
      p_percentage: attempt.percentage,
    });
    if (statsError) console.error('Không cập nhật được thống kê đề thi:', statsError);
  },

  // --- Exam Document Library ("Kho đề thi kiểm tra" — real .docx/.pdf files) ---
  async getExamDocuments(): Promise<ExamDocument[]> {
    const { data, error } = await supabase
      .from('exam_documents')
      .select('*')
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToExamDocument);
  },

  async uploadExamFile(file: File): Promise<{ fileUrl: string; fileName: string; fileType: string }> {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('exam-files').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('exam-files').getPublicUrl(path);
    return { fileUrl: data.publicUrl, fileName: file.name, fileType: ext };
  },

  async uploadExamFileBlob(blob: Blob, ext: string): Promise<{ fileUrl: string }> {
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('exam-files').upload(path, blob, {
      contentType: blob.type || 'application/octet-stream',
    });
    if (error) throw error;
    const { data } = supabase.storage.from('exam-files').getPublicUrl(path);
    return { fileUrl: data.publicUrl };
  },

  async saveExamDocument(doc: ExamDocument): Promise<void> {
    const row = {
      id: doc.id,
      title: doc.title,
      grade: doc.grade || null,
      class_name: doc.className || null,
      school_year: doc.schoolYear || null,
      semester: doc.semester || null,
      category: doc.category || null,
      description: doc.description || null,
      file_url: doc.fileUrl,
      file_name: doc.fileName,
      file_type: doc.fileType,
      views: doc.views,
      uploaded_at: doc.uploadedAt,
    };
    const { error } = await supabase.from('exam_documents').upsert(row);
    if (error) throw error;
  },

  async deleteExamDocument(docId: string): Promise<void> {
    const { error } = await supabase.from('exam_documents').delete().eq('id', docId);
    if (error) throw error;
  },

  // Goes through a security-definer RPC (see supabase/auth.sql) instead of a
  // client-side read-then-write — exam_documents no longer grants a blanket
  // public UPDATE (which used to let anyone rewrite any document's metadata,
  // e.g. swap file_url, not just its view count).
  async incrementExamDocumentViews(docId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_exam_document_views', { p_doc_id: docId });
    if (error) console.error('Không cập nhật được lượt xem tài liệu:', error);
  },

  // --- Contact Messages ("Liên Hệ Hệ Thống" page) ---
  async sendContactMessage(title: string, content: string, email: string): Promise<void> {
    const row = {
      id: 'contact-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      title: title.trim(),
      content: content.trim(),
      email: email.trim(),
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('contact_messages').insert(row);
    if (error) throw error;
  },

  async getContactMessages(): Promise<ContactMessage[]> {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      email: row.email,
      createdAt: row.created_at,
    }));
  },

  // --- Simulated Offline Mode Toggle (local-only) ---
  getIsSimulatedOffline(): boolean {
    return safeGet<boolean>(LOCAL_KEYS.SIMULATED_OFFLINE, false);
  },

  isOfflineMode(): boolean {
    return this.getIsSimulatedOffline();
  },

  setSimulatedOffline(isOffline: boolean): void {
    safeSet(LOCAL_KEYS.SIMULATED_OFFLINE, isOffline);
  },

  setOfflineMode(isOffline: boolean): void {
    this.setSimulatedOffline(isOffline);
  },

  async toggleLikeArticle(articleId: string): Promise<{ likes: number; isLiked: boolean }> {
    return this.toggleArticleLike(articleId);
  },
};
