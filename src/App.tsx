import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Layers, 
  Flame, 
  Search, 
  BookOpen, 
  PlusCircle, 
  ShieldCheck, 
  SlidersHorizontal,
  Compass,
  FileCheck2,
  Clock,
  ArrowRight,
  WifiOff,
  Zap,
  GraduationCap,
  Wrench,
  BarChart3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Header } from './components/Header';
import { ArticleCard } from './components/ArticleCard';
import { ArticleDetail } from './components/ArticleDetail';
import { ExamLibrary, ExamDocumentViewerModal } from './components/ExamLibrary';
import { QuizRoom } from './components/QuizRoom';
import { QuizCreatorModal } from './components/QuizCreatorModal';
import { AdminDashboard } from './components/AdminDashboard';
import { SoftwareUtilities } from './components/SoftwareUtilities';
import { AuthModal } from './components/AuthModal';
import { TeacherProfileModal } from './components/TeacherProfileModal';
import { VisitorStats } from './components/VisitorStats';
import { DocumentUploadModal } from './components/DocumentUploadModal';
import { SearchResults } from './components/SearchResults';
import { ContactPage } from './components/ContactPage';
import { Article, ExamDocument, QuizExam, SoftwareUtility } from './types';
import { storageService } from './services/storageService';
import { useAuth } from './contexts/AuthContext';
import { getPageNumbers } from './utils/pagination';
import { SOFTWARE_UTILITIES } from './data/initialData';
import { setPageMeta, resetPageMeta } from './utils/seoMeta';

// The quadratic/cubic equation solver (EQN mode) lives inside the Scientific
// Calculator tool, but "giải phương trình bậc 2/3" is searched for on its own —
// give it its own indexable slugs that open the calculator straight into that mode.
const EQN_SUBPAGE_DEGREES: Record<string, 2 | 3> = {
  'giai-phuong-trinh-bac-2': 2,
  'giai-phuong-trinh-bac-3': 3,
};

const EQN_SUBPAGE_META: Record<2 | 3, { title: string; description: string }> = {
  2: {
    title: 'Giải Phương Trình Bậc 2 Online (ax² + bx + c = 0) - Long Hoa Số',
    description: 'Công cụ giải phương trình bậc 2 trực tuyến miễn phí: nhập hệ số a, b, c để nhận ngay nghiệm x1, x2 (kể cả nghiệm phức) cùng giá trị delta (Δ), thao tác giống hệt máy tính Casio fx-570ES/991ES.'
  },
  3: {
    title: 'Giải Phương Trình Bậc 3 Online (ax³ + bx² + cx + d = 0) - Long Hoa Số',
    description: 'Công cụ giải phương trình bậc 3 trực tuyến miễn phí theo công thức Cardano: nhập hệ số a, b, c, d để nhận ngay đầy đủ 3 nghiệm (thực hoặc phức), không cần cài đặt.'
  }
};

// Deep-link helper: match a /cong-cu/{slug} pathname to its utility tool
// (and, for the two EQN sub-pages, which equation degree to auto-open).
const matchRouteFromPath = (
  pathname: string
): { tool: SoftwareUtility; eqnDegree: 2 | 3 | null } | null => {
  const match = pathname.match(/^\/cong-cu\/([^/]+)\/?$/);
  if (!match) return null;
  const slug = decodeURIComponent(match[1]);

  const eqnDegree = EQN_SUBPAGE_DEGREES[slug];
  if (eqnDegree) {
    const calculator = SOFTWARE_UTILITIES.find((u) => u.id === 'util-sci-calculator');
    return calculator ? { tool: calculator, eqnDegree } : null;
  }

  const tool = SOFTWARE_UTILITIES.find((u) => u.slug === slug);
  return tool ? { tool, eqnDegree: null } : null;
};

// Deep-link helper: /de-thi/{id} → the exam_documents row id ("Kho Đề Thi" library).
const matchExamDocId = (pathname: string): string | null => {
  const match = pathname.match(/^\/de-thi\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
};

// Meta tags for one exam document page — reuses whatever metadata the
// uploader filled in, so the title/description actually contain the subject,
// grade and exam name people search for (e.g. "đề trắc nghiệm 15 phút Toán").
const buildExamDocMeta = (doc: ExamDocument): { title: string; description: string } => {
  const titleParts = [doc.title];
  if (doc.grade) titleParts.push(`Lớp ${doc.grade}`);
  if (doc.category) titleParts.push(doc.category);
  const description =
    doc.description ||
    `Xem trước và tải xuống miễn phí đề thi "${doc.title}"${doc.category ? ` môn ${doc.category}` : ''}${
      doc.grade ? ` lớp ${doc.grade}` : ''
    } tại Kho Đề Thi Long Hoa Số.`;
  return { title: `${titleParts.join(' - ')} - Long Hoa Số`, description };
};

// Articles per page in the news feed grid.
const ARTICLES_PER_PAGE = 9;

export default function App() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'news' | 'offline' | 'quiz' | 'admin' | 'utilities' | 'contact'>(() => {
    if (matchRouteFromPath(window.location.pathname)) return 'utilities';
    if (matchExamDocId(window.location.pathname)) return 'offline';
    return 'quiz';
  });
  // Which tool (and, for the EQN sub-pages, which equation degree) /cong-cu/{slug}
  // should deep-link to. Both feed into SoftwareUtilities' `key` too, so browser
  // back/forward (which can't call its internal setters directly) forces a
  // remount onto the right tool/mode instead of no-op-ing.
  const [initialToolId, setInitialToolId] = useState<string | undefined>(
    () => matchRouteFromPath(window.location.pathname)?.tool.id
  );
  const [initialEqnDegree, setInitialEqnDegree] = useState<2 | 3 | null>(
    () => matchRouteFromPath(window.location.pathname)?.eqnDegree ?? null
  );
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [currentArticlePage, setCurrentArticlePage] = useState(1);

  // "Quản Trị & Tiến Độ" requires login; bounce back if the session ends while it's open.
  useEffect(() => {
    if (!user && activeTab === 'admin') {
      setActiveTab('quiz');
    }
  }, [user, activeTab]);

  // Supabase clears the OAuth token from the URL fragment via `location.hash = ''`,
  // which leaves a trailing bare "#" in the address bar. Strip it once it appears.
  useEffect(() => {
    const stripTrailingHash = () => {
      if (window.location.href.endsWith('#')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };
    stripTrailingHash();
    window.addEventListener('hashchange', stripTrailingHash);
    return () => window.removeEventListener('hashchange', stripTrailingHash);
  }, []);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [articleFilterType, setArticleFilterType] = useState<'all' | 'deep' | 'trending'>('all');

  // Offline management
  const [isOffline, setIsOffline] = useState(() => storageService.isOfflineMode());
  const [savedCount, setSavedCount] = useState(() => storageService.getOfflineArticles().length);

  // Modal
  const [isCreateQuizModalOpen, setIsCreateQuizModalOpen] = useState(false);
  const [quizCreatorInitialMode, setQuizCreatorInitialMode] = useState<'upload' | 'manual'>('upload');
  const [editingExam, setEditingExam] = useState<QuizExam | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  // Whether the quiz creator was opened from the teacher profile's exam list, so
  // closing it (cancel, or a non-publishing save) can return there instead of just
  // vanishing back to whatever page was underneath. A ref rather than state since
  // the onClose closure below reads it at call time either way, and this avoids any
  // risk of it reading a stale value from a state update that hasn't re-rendered yet.
  const quizModalOpenedFromProfileRef = useRef(false);

  const openCreateQuizModal = (mode?: 'upload' | 'manual') => {
    quizModalOpenedFromProfileRef.current = false;
    setEditingExam(null);
    setQuizCreatorInitialMode(mode === 'manual' ? 'manual' : 'upload');
    setIsCreateQuizModalOpen(true);
  };

  // Continuing a draft from the teacher's profile — closes the profile modal
  // and reopens the creator pre-filled with that exam's saved content.
  const openEditExamModal = (exam: QuizExam) => {
    quizModalOpenedFromProfileRef.current = true;
    setIsProfileModalOpen(false);
    setEditingExam(exam);
    setQuizCreatorInitialMode('manual');
    setIsCreateQuizModalOpen(true);
  };

  // Document upload modal ("Tải Lên Tài Liệu" quick action in the Header)
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [docsRefreshKey, setDocsRefreshKey] = useState(0);

  // Document opened directly from the global search results
  const [searchViewingDoc, setSearchViewingDoc] = useState<ExamDocument | null>(null);

  // Exam opened directly from the global search results
  const [pendingExamId, setPendingExamId] = useState<string | null>(null);

  // Sync the selected article to the URL (/bai-viet/{slug}) so links are shareable & bookmarkable
  const selectArticle = (article: Article | null) => {
    setSelectedArticle(article);
    const path = article ? `/bai-viet/${article.slug}` : '/';
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  };

  // Sync the exam document being viewed to the URL (/de-thi/{id}) + document
  // meta, so each file in "Kho Đề Thi" is a distinct, shareable, indexable page
  // (with real question text once the .docx preview loads) instead of only
  // ever appearing inside a modal at "/".
  const selectExamDoc = (doc: ExamDocument | null) => {
    setSearchViewingDoc(doc);
    const path = doc ? `/de-thi/${doc.id}` : '/';
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    if (doc) {
      const meta = buildExamDocMeta(doc);
      setPageMeta(meta.title, meta.description, path);
    } else {
      resetPageMeta();
    }
  };

  // Deep-link support: opening /de-thi/{id} directly should fetch and open that
  // one document, without waiting on the full library list to load.
  useEffect(() => {
    const id = matchExamDocId(window.location.pathname);
    if (!id) return;
    let cancelled = false;
    storageService
      .getExamDocumentById(id)
      .then((doc) => {
        if (cancelled || !doc) return;
        setSearchViewingDoc(doc);
        const meta = buildExamDocMeta(doc);
        setPageMeta(meta.title, meta.description, window.location.pathname);
      })
      .catch((err) => console.error('Không tải được tài liệu đề thi:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync the active utility tool to the URL (/cong-cu/{slug}) + document meta,
  // so each tool (Scientific Calculator, URL Scanner, ...) is a distinct,
  // shareable, indexable page instead of hidden behind a client-only tab state.
  // When the calculator's EQN mode is active, this points at its own dedicated
  // "giai-phuong-trinh-bac-2/3" slug instead, since that's searched for on its own.
  const handleToolChange = (tool: SoftwareUtility, eqnDegree: 2 | 3 | null) => {
    let path: string;
    let title: string;
    let description: string;

    if (eqnDegree) {
      const meta = EQN_SUBPAGE_META[eqnDegree];
      path = `/cong-cu/${eqnDegree === 2 ? 'giai-phuong-trinh-bac-2' : 'giai-phuong-trinh-bac-3'}`;
      title = meta.title;
      description = meta.description;
    } else {
      path = `/cong-cu/${tool.slug}`;
      title = `${tool.name} - Long Hoa Số`;
      description = tool.shortDesc;
    }

    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setPageMeta(title, description, path);
  };

  // Leaving the Utilities tab for another tab: drop the tool URL/meta back to "/".
  useEffect(() => {
    if (activeTab !== 'utilities' && window.location.pathname.startsWith('/cong-cu/')) {
      window.history.pushState({}, '', '/');
      resetPageMeta();
    }
  }, [activeTab]);

  // Load articles from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    setIsLoadingArticles(true);
    storageService
      .getArticles()
      .then((data) => {
        if (cancelled) return;
        setArticles(data);
        // Deep-link support: opening /bai-viet/{slug} directly should load that article
        const match = window.location.pathname.match(/^\/bai-viet\/([^/]+)\/?$/);
        if (match) {
          const found = data.find((a) => a.slug === decodeURIComponent(match[1]));
          if (found) {
            setSelectedArticle(found);
            setActiveTab('news');
          }
        }
      })
      .catch((err) => console.error('Không tải được danh sách bài viết:', err))
      .finally(() => {
        if (!cancelled) setIsLoadingArticles(false);
      });
    setSavedCount(storageService.getOfflineArticles().length);
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/^\/bai-viet\/([^/]+)\/?$/);
      const route = matchRouteFromPath(window.location.pathname);
      const docId = matchExamDocId(window.location.pathname);
      if (match) {
        const found = articles.find((a) => a.slug === decodeURIComponent(match[1]));
        setSelectedArticle(found || null);
        setActiveTab('news');
        setSearchViewingDoc(null);
      } else if (route) {
        setSelectedArticle(null);
        setSearchViewingDoc(null);
        setInitialToolId(route.tool.id);
        setInitialEqnDegree(route.eqnDegree);
        setActiveTab('utilities');
      } else if (docId) {
        setSelectedArticle(null);
        setActiveTab('offline');
        storageService
          .getExamDocumentById(docId)
          .then((doc) => {
            setSearchViewingDoc(doc);
            if (doc) {
              const meta = buildExamDocMeta(doc);
              setPageMeta(meta.title, meta.description, window.location.pathname);
            }
          })
          .catch((err) => console.error('Không tải được tài liệu đề thi:', err));
      } else {
        setSelectedArticle(null);
        setSearchViewingDoc(null);
        resetPageMeta();
        setActiveTab((prev) => (prev === 'utilities' ? 'quiz' : prev));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [articles]);

  // Listen to browser network changes
  useEffect(() => {
    const handleOnline = () => {
      if (!storageService.isOfflineMode()) {
        setIsOffline(false);
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Toggle Save Article for Offline Reading
  const handleToggleSaveOffline = (article: Article, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isSaved = storageService.isArticleSavedOffline(article.id);
    if (isSaved) {
      storageService.removeArticleOffline(article.id);
    } else {
      storageService.saveArticleOffline(article);
    }
    setSavedCount(storageService.getOfflineArticles().length);
  };

  // Toggle Like Article
  const handleToggleLike = async (articleId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const { likes, isLiked } = await storageService.toggleLikeArticle(articleId);
    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, likes, isLikedByUser: isLiked } : a))
    );
    if (selectedArticle && selectedArticle.id === articleId) {
      setSelectedArticle((prev) => (prev ? { ...prev, likes, isLikedByUser: isLiked } : prev));
    }
  };

  // Handle Exam Created — publishing takes the teacher to see the now-live room in
  // Quiz Room, not back to their profile, even if this edit was opened from there.
  const [examsRefreshKey, setExamsRefreshKey] = useState(0);
  const handleExamCreated = (newExam: QuizExam) => {
    quizModalOpenedFromProfileRef.current = false;
    setActiveTab('quiz');
    setExamsRefreshKey((k) => k + 1);
  };

  // Creating a quiz requires an account; taking one does not.
  const requireAuthThenOpenQuizModal = (mode?: 'upload' | 'manual') => {
    if (!user) {
      setIsAuthModalOpen(true);
    } else {
      setEditingExam(null);
      setQuizCreatorInitialMode(mode === 'manual' ? 'manual' : 'upload');
      setIsCreateQuizModalOpen(true);
    }
  };

  // Uploading a document requires an account, same as creating a quiz.
  const requireAuthThenOpenUploadModal = () => {
    if (!user) {
      setIsAuthModalOpen(true);
    } else {
      setIsUploadDocModalOpen(true);
    }
  };

  // Filter Articles
  const categories = [
    'Tất cả',
    'Trí tuệ Nhân tạo',
    'An ninh Mạng',
    'Điện toán Đám mây & DevOps',
    'Kiến trúc Phần mềm',
    'Phần cứng & Bán dẫn',
    'Blockchain & Web3',
  ];

  const filteredArticles = articles.filter((art) => {
    const matchesSearch =
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'Tất cả' || art.category === selectedCategory;

    let matchesFilterType = true;
    if (articleFilterType === 'deep') matchesFilterType = !!art.isDeepAnalysis;
    if (articleFilterType === 'trending') matchesFilterType = !!art.isTrending;

    return matchesSearch && matchesCategory && matchesFilterType;
  });

  // Jump back to page 1 whenever a filter narrows/widens the result set —
  // otherwise the user could land on a now-empty page past the new last page.
  useEffect(() => {
    setCurrentArticlePage(1);
  }, [searchQuery, selectedCategory, articleFilterType]);

  const articleTotalPages = Math.max(1, Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE));
  // Clamp in case the list itself shrank and the page we were on no longer exists.
  const safeArticlePage = Math.min(currentArticlePage, articleTotalPages);
  const paginatedArticles = filteredArticles.slice(
    (safeArticlePage - 1) * ARTICLES_PER_PAGE,
    safeArticlePage * ARTICLES_PER_PAGE
  );

  const featuredArticle = articles.find((a) => a.isDeepAnalysis) || articles[0];

  return (
    <div className="min-h-screen text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white relative">

      {/* Background image + dark overlay so text stays readable */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg.png')" }}
      />
      <div className="fixed inset-0 -z-10 bg-slate-950/75" />

      {/* Top Main Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          selectArticle(null); // Return to list view
        }}
        isOffline={isOffline}
        savedOfflineCount={savedCount}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        openCreateQuizModal={requireAuthThenOpenQuizModal}
        openUploadDocumentModal={requireAuthThenOpenUploadModal}
        user={user}
        isAdmin={isAdmin}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSignOut={signOut}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Offline Banner Warning when in offline mode */}
        {isOffline && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-3xl flex items-center justify-between gap-4 text-xs text-amber-300 animate-in fade-in shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <span>
                <strong>Chế độ Ngoại Tuyến (Offline Mode) đang kích hoạt:</strong> Bạn có thể đọc đầy đủ {savedCount} bài viết trong Kho Lưu Trữ Ngoại Tuyến và làm các bài thi đã được lưu trên thiết bị.
              </span>
            </div>

            <button
              onClick={() => setActiveTab('offline')}
              className="bg-amber-500 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl whitespace-nowrap hover:bg-amber-400 transition-colors shadow-sm"
            >
              Mở Kho Offline
            </button>
          </div>
        )}

        {/* Global search override — searching from any tab surfaces matching
            articles, exams, and documents together, regardless of activeTab. */}
        {searchQuery.trim() && !selectedArticle ? (
          <SearchResults
            query={searchQuery}
            articles={articles}
            onSelectArticle={(art) => {
              selectArticle(art);
              setActiveTab('news');
            }}
            onOpenExam={(ex) => {
              setPendingExamId(ex.id);
              setActiveTab('quiz');
              setSearchQuery('');
            }}
            onOpenDocument={(doc) => selectExamDoc(doc)}
          />
        ) : (
        <>
        {/* ============================================================ */}
        {/* TAB 1: NEWS & DEEP ANALYSIS ARTICLES                         */}
        {/* ============================================================ */}
        {activeTab === 'news' && (
          <>
            {isLoadingArticles ? (
              <div className="text-center py-24 text-slate-400 text-sm">
                Đang tải bài viết từ Supabase...
              </div>
            ) : selectedArticle ? (
              /* Article Deep Detail View */
              <ArticleDetail
                article={selectedArticle}
                isSavedOffline={storageService.isArticleSavedOffline(selectedArticle.id)}
                onBack={() => selectArticle(null)}
                onToggleSaveOffline={(art) => handleToggleSaveOffline(art)}
                onToggleLike={(id) => handleToggleLike(id)}
              />
            ) : (
              /* Article Feed & Explorer View with Signature Bento Grid */
              <div className="space-y-8 pb-16">
                
                {/* Bento Grid Showcase Section (When no active search filter) */}
                {!searchQuery && selectedCategory === 'Tất cả' && articleFilterType === 'all' && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
                    
                    {/* BENTO 1: Hero Featured Deep Analysis (8 cols) */}
                    {featuredArticle && (
                      <section
                        id="bento-hero-featured"
                        onClick={() => selectArticle(featuredArticle)}
                        className="glass-panel md:col-span-12 lg:col-span-8 rounded-3xl p-6 sm:p-8 relative overflow-hidden group cursor-pointer transition-all duration-300 hover:border-blue-500/60 hover:shadow-2xl hover:shadow-blue-500/10 min-h-[380px] flex flex-col justify-end"
                      >
                        {/* Cover Image Background with dark overlay */}
                        <div className="absolute inset-0 z-0">
                          <img
                            src={featuredArticle.coverImage}
                            alt={featuredArticle.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-40 group-hover:opacity-50"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/40" />
                        </div>

                        <div className="relative z-10 flex flex-col justify-end">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm">
                              Phân tích chuyên sâu
                            </span>
                            <span className="bg-slate-900/80 text-blue-400 border border-slate-700/80 text-[10px] font-semibold px-2 py-0.5 rounded-lg backdrop-blur-md">
                              {featuredArticle.category}
                            </span>
                          </div>

                          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100 group-hover:text-blue-300 transition-colors mb-2 leading-tight">
                            {featuredArticle.title}
                          </h2>

                          <p className="text-slate-300 text-xs sm:text-sm mb-5 line-clamp-2 max-w-2xl leading-relaxed">
                            {featuredArticle.summary}
                          </p>

                          <div className="flex flex-wrap gap-3 items-center pt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                selectArticle(featuredArticle);
                              }}
                              className="bg-white text-slate-950 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-slate-200 transition-colors"
                            >
                              Đọc ngay
                            </button>
                            <button
                              onClick={(e) => handleToggleSaveOffline(featuredArticle, e)}
                              className="bg-slate-800/90 text-white px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-1.5 backdrop-blur-sm"
                            >
                              <span>{storageService.isArticleSavedOffline(featuredArticle.id) ? 'Đã lưu trong kho' : 'Lưu ngoại tuyến'}</span>
                            </button>
                          </div>
                        </div>
                      </section>
                    )}

                    {/* BENTO 2: Live Tech News Pulse (4 cols) */}
                    <section className="glass-panel md:col-span-12 lg:col-span-4 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-600/60 transition-colors">
                      <div>
                        <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-slate-100">
                          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                          <span>Tin tức công nghệ mới</span>
                        </h3>

                        <div className="space-y-3.5">
                          <div 
                            onClick={() => {
                              const art = articles.find((a) => a.id === 'art-gaafet-2nm') || articles[1];
                              if (art) selectArticle(art);
                            }}
                            className="border-b border-slate-800 pb-3 cursor-pointer group/news"
                          >
                            <p className="text-xs text-blue-400 font-medium mb-1">10 phút trước</p>
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-200 group-hover/news:text-blue-400 transition-colors line-clamp-2">
                              TSMC & Intel tăng tốc thương mại hóa bán dẫn GAAFET 2nm
                            </h4>
                          </div>

                          <div 
                            onClick={() => {
                              const art = articles.find((a) => a.id === 'art-post-quantum-cryptography') || articles[0];
                              if (art) selectArticle(art);
                            }}
                            className="border-b border-slate-800 pb-3 cursor-pointer group/news"
                          >
                            <p className="text-xs text-blue-400 font-medium mb-1">2 giờ trước</p>
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-200 group-hover/news:text-blue-400 transition-colors line-clamp-2">
                              NIST chuẩn hóa bộ thuật toán mật mã Hậu lượng tử ML-KEM
                            </h4>
                          </div>

                          <div 
                            onClick={() => {
                              const art = articles.find((a) => a.id === 'art-multi-agent-ai-system') || articles[2];
                              if (art) selectArticle(art);
                            }}
                            className="pb-1 cursor-pointer group/news"
                          >
                            <p className="text-xs text-blue-400 font-medium mb-1">5 giờ trước</p>
                            <h4 className="text-xs sm:text-sm font-semibold text-slate-200 group-hover/news:text-blue-400 transition-colors line-clamp-2">
                              Kiến trúc Multi-Agent Systems & Graph RAG định hình lại AI 2026
                            </h4>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800/80 text-center">
                        <button
                          onClick={() => setArticleFilterType('trending')}
                          className="text-slate-400 hover:text-blue-400 text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                          Xem tất cả tin tức →
                        </button>
                      </div>
                    </section>

                    {/* BENTO 3: Quiz Management Widget (4 cols) */}
                    <section className="glass-panel md:col-span-6 lg:col-span-4 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-600/60 transition-colors">
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-blue-400" />
                            <span>Quản lý Thi cử</span>
                          </h3>
                          <button
                            onClick={requireAuthThenOpenQuizModal}
                            className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
                            title="Tạo đề thi mới"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Upload trigger dropzone styled as Bento card */}
                        <div
                          onClick={requireAuthThenOpenQuizModal}
                          className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 bg-slate-950/60 cursor-pointer transition-all group/drop mb-4"
                        >
                          <span className="text-xs text-slate-400 group-hover/drop:text-slate-300">
                            Tải lên tệp câu hỏi (TXT / JSON / CSV)
                          </span>
                          <button className="text-xs font-bold text-blue-400 underline">
                            Chọn tệp đính kèm
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div 
                            onClick={() => setActiveTab('quiz')}
                            className="flex items-center justify-between bg-slate-800/40 hover:bg-slate-800/80 p-3 rounded-xl border border-slate-700/50 cursor-pointer transition-colors"
                          >
                            <span className="text-xs font-medium text-slate-200">Zero-Trust & Cloud Security</span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">
                              Đang diễn ra
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3">
                        <button
                          onClick={() => setActiveTab('quiz')}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
                        >
                          Vào phòng thi trực tuyến
                        </button>
                      </div>
                    </section>

                    {/* BENTO 4: Software Utilities Widget (4 cols) */}
                    <section className="glass-panel md:col-span-6 lg:col-span-4 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-600/60 transition-colors">
                      <div>
                        <h3 className="text-base font-bold mb-4 text-slate-100 flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-blue-400" />
                          <span>Tiện ích phần mềm</span>
                        </h3>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div 
                            onClick={() => setActiveTab('utilities')}
                            className="bg-slate-800/50 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-700/60 cursor-pointer transition-colors"
                          >
                            <div className="w-7 h-7 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center mb-2 font-bold text-xs">
                              {`{ }`}
                            </div>
                            <span className="text-xs font-bold text-slate-200 block">Code Formatter</span>
                            <span className="text-[10px] text-slate-400">JSON, SQL, JS</span>
                          </div>

                          <div 
                            onClick={() => setActiveTab('utilities')}
                            className="bg-slate-800/50 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-700/60 cursor-pointer transition-colors"
                          >
                            <div className="w-7 h-7 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center mb-2 font-bold text-xs">
                              .*
                            </div>
                            <span className="text-xs font-bold text-slate-200 block">Regex Tester</span>
                            <span className="text-[10px] text-slate-400">Kiểm thử biểu thức</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => setActiveTab('utilities')}
                          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
                        >
                          Mở bộ 6 công cụ kỹ thuật
                        </button>
                      </div>
                    </section>

                    {/* BENTO 5: Admin Dashboard Progress Highlight (4 cols) */}
                    <section className="md:col-span-12 lg:col-span-4 bg-blue-600/30 backdrop-blur-md border border-blue-400/30 rounded-3xl p-6 text-white shadow-xl shadow-blue-600/20 flex flex-col justify-between">
                      <div className="space-y-4">
                        <h3 className="text-base font-bold flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-white" />
                          <span>Admin Dashboard</span>
                        </h3>

                        <div>
                          <div className="flex justify-between text-xs mb-1.5 font-medium">
                            <span className="opacity-90">Tỷ lệ hoàn thành đề thi</span>
                            <span className="font-bold">84%</span>
                          </div>
                          <div className="w-full bg-blue-500/80 h-2 rounded-full overflow-hidden">
                            <div className="bg-white h-full rounded-full w-[84%]"></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-blue-500/60 p-3 rounded-2xl backdrop-blur-sm border border-blue-400/30">
                            <span className="text-[10px] block opacity-80 font-medium">Người dùng online</span>
                            <span className="text-lg font-extrabold">1,248</span>
                          </div>
                          <div className="bg-blue-500/60 p-3 rounded-2xl backdrop-blur-sm border border-blue-400/30">
                            <span className="text-[10px] block opacity-80 font-medium">Bài viết lưu trữ</span>
                            <span className="text-lg font-extrabold">{articles.length + savedCount}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4">
                        <button
                          onClick={() => setActiveTab('admin')}
                          className="w-full py-2.5 bg-white text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-bold transition-colors shadow-sm"
                        >
                          Xem chi tiết tiến độ
                        </button>
                      </div>
                    </section>

                  </div>
                )}

                {/* Category Pills & Quick Filter Controls */}
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col gap-4">

                    {/* Category Scrollable Bar */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none min-w-0 w-full">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`text-xs font-semibold px-4 py-2 rounded-xl whitespace-nowrap shrink-0 transition-all ${
                            selectedCategory === cat
                              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Filter Type Segmented Control */}
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs shrink-0 self-start">
                      <button
                        onClick={() => setArticleFilterType('all')}
                        className={`px-3.5 py-1.5 rounded-lg transition-colors ${
                          articleFilterType === 'all' ? 'bg-slate-800 text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Tất cả bài
                      </button>

                      <button
                        onClick={() => setArticleFilterType('deep')}
                        className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                          articleFilterType === 'deep' ? 'bg-slate-800 text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Phân tích sâu</span>
                      </button>

                      <button
                        onClick={() => setArticleFilterType('trending')}
                        className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                          articleFilterType === 'trending' ? 'bg-slate-800 text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Flame className="w-3 h-3" />
                        <span>Thịnh hành</span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* Articles Grid */}
                {filteredArticles.length === 0 ? (
                  <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-3xl p-8">
                    <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-300 mb-1">
                      Không tìm thấy bài viết phù hợp
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Vui lòng thử từ khóa tìm kiếm khác hoặc chuyển danh mục hiển thị.
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('Tất cả');
                        setArticleFilterType('all');
                      }}
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold px-4 py-2 rounded-xl"
                    >
                      Đặt lại bộ lọc
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedArticles.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        isSavedOffline={storageService.isArticleSavedOffline(article.id)}
                        onSelectArticle={(art) => selectArticle(art)}
                        onToggleSaveOffline={(art, e) => handleToggleSaveOffline(art, e)}
                        onToggleLike={(id, e) => handleToggleLike(id, e)}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination — only shown once there's more than one page's worth of articles */}
                {articleTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-8">
                    <button
                      type="button"
                      onClick={() => setCurrentArticlePage((p) => Math.max(1, p - 1))}
                      disabled={safeArticlePage === 1}
                      className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-800/70 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white border border-slate-700 transition-colors"
                      aria-label="Trang trước"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {getPageNumbers(safeArticlePage, articleTotalPages).map((page, idx) =>
                      page === '…' ? (
                        <span key={`ellipsis-${idx}`} className="w-9 h-9 flex items-center justify-center text-slate-500 text-sm">
                          …
                        </span>
                      ) : (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentArticlePage(page)}
                          className={`w-9 h-9 rounded-xl text-sm font-bold border transition-colors ${
                            page === safeArticlePage
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20'
                              : 'bg-slate-800/70 hover:bg-slate-700 border-slate-700 text-slate-300'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() => setCurrentArticlePage((p) => Math.min(articleTotalPages, p + 1))}
                      disabled={safeArticlePage === articleTotalPages}
                      className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-800/70 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white border border-slate-700 transition-colors"
                      aria-label="Trang sau"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

              </div>
            )}
          </>
        )}

        {/* ============================================================ */}
        {/* TAB 2: EXAM LIBRARY ("Kho đề thi kiểm tra")                  */}
        {/* ============================================================ */}
        {activeTab === 'offline' && (
          <ExamLibrary
            isOffline={isOffline}
            onSelectArticle={(art) => {
              selectArticle(art);
              setActiveTab('news');
            }}
            onRefreshSavedCount={() => setSavedCount(storageService.getOfflineArticles().length)}
            refreshKey={docsRefreshKey}
            globalSearchQuery={searchQuery}
            onViewDoc={selectExamDoc}
          />
        )}

        {/* ============================================================ */}
        {/* TAB 3: QUIZ & EXAM ROOMS                                     */}
        {/* ============================================================ */}
        {activeTab === 'quiz' && (
          <QuizRoom
            openCreateQuizModal={requireAuthThenOpenQuizModal}
            examsRefreshKey={examsRefreshKey}
            globalSearchQuery={searchQuery}
            initialExamId={pendingExamId || undefined}
            onInitialExamConsumed={() => setPendingExamId(null)}
            onAttemptRecorded={() => {
              // Bumps QuizRoom's exams list refresh so the room's "HS đã thi"
              // count reflects the attempt just submitted (server-side
              // participantsCount/averageScore are already updated by the
              // submit_exam_attempt RPC — the client just needs to refetch).
              setExamsRefreshKey((k) => k + 1);
            }}
          />
        )}

        {/* ============================================================ */}
        {/* TAB 4: ADMIN PROGRESS DASHBOARD                              */}
        {/* ============================================================ */}
        {activeTab === 'admin' && (
          <AdminDashboard
            onOpenCreateQuiz={requireAuthThenOpenQuizModal}
            isAdmin={isAdmin}
            userId={user?.id}
            userEmail={user?.email}
          />
        )}

        {/* ============================================================ */}
        {/* TAB 5: SOFTWARE UTILITIES & USER GUIDES                     */}
        {/* ============================================================ */}
        {activeTab === 'utilities' && (
          <SoftwareUtilities
            key={`${initialToolId || 'default'}-${initialEqnDegree ?? 'none'}`}
            initialToolId={initialToolId}
            initialEqnDegree={initialEqnDegree}
            onToolChange={handleToolChange}
          />
        )}

        {/* ============================================================ */}
        {/* TAB 6: SYSTEM CONTACT PAGE                                   */}
        {/* ============================================================ */}
        {activeTab === 'contact' && (
          <ContactPage />
        )}
        </>
        )}

      </main>

      {/* Quiz Creator Modal Dialog — unmounted while closed so it always opens with a clean slate */}
      {isCreateQuizModalOpen && (
        <QuizCreatorModal
          initialMode={quizCreatorInitialMode}
          onClose={() => {
            setIsCreateQuizModalOpen(false);
            if (quizModalOpenedFromProfileRef.current) {
              setIsProfileModalOpen(true);
            }
          }}
          onExamCreated={handleExamCreated}
          authorId={user?.id}
          authorName={profile?.fullName || user?.email}
          schoolName={profile?.schoolName}
          editingExam={editingExam}
        />
      )}

      {/* Auth Modal Dialog */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Teacher Profile Modal */}
      <TeacherProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setExamsRefreshKey((k) => k + 1);
        }}
        onEditExam={openEditExamModal}
      />

      {/* Document Viewer — opened directly from a global search result */}
      {searchViewingDoc && (
        <ExamDocumentViewerModal doc={searchViewingDoc} onClose={() => selectExamDoc(null)} />
      )}

      {/* Document Upload Modal — unmounted while closed so it always opens with a clean slate */}
      {isUploadDocModalOpen && (
        <DocumentUploadModal
          onClose={() => setIsUploadDocModalOpen(false)}
          onUploaded={() => {
            setDocsRefreshKey((k) => k + 1);
            setActiveTab('offline');
          }}
        />
      )}

      {/* Platform Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 backdrop-blur text-slate-500 text-xs py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo2.png" alt="Long Hoa Số" className="w-6 h-6 rounded-lg" />
            <span className="font-semibold text-slate-300">Long Hoa Số</span>
            <span className="text-slate-600">| Nền tảng kết nối Tri thức Công nghệ Số</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
            <VisitorStats />
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Offline Cache Vault Ready</span>
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gemini AI Engine Integrated</span>
            </span>
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Smart Assessment System</span>
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
