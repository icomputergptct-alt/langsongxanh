import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Bookmark, 
  BookmarkCheck, 
  Clock, 
  Eye, 
  ThumbsUp, 
  Share2, 
  Sparkles, 
  CheckCircle2, 
  Sliders, 
  Type, 
  BookOpen, 
  ShieldAlert, 
  DownloadCloud
} from 'lucide-react';
import { Article } from '../types';
import { CommentSection } from './CommentSection';

interface ArticleDetailProps {
  article: Article;
  isSavedOffline: boolean;
  onBack: () => void;
  onToggleSaveOffline: (article: Article) => void;
  onToggleLike: (articleId: string) => void;
}

export const ArticleDetail: React.FC<ArticleDetailProps> = ({
  article,
  isSavedOffline,
  onBack,
  onToggleSaveOffline,
  onToggleLike,
}) => {
  const [likes, setLikes] = useState(article.likes);
  const [isLiked, setIsLiked] = useState(!!article.isLikedByUser);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [readerTheme, setReaderTheme] = useState<'light' | 'dark' | 'sepia'>('light');
  const [aiSummary, setAiSummary] = useState<{
    summary?: string;
    keyPoints?: string[];
    techTerms?: { term: string; meaning: string }[];
  } | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const handleLike = () => {
    onToggleLike(article.id);
    setIsLiked(!isLiked);
    setLikes((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handleGenerateAiSummary = async () => {
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/ai/summarize-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          content: article.content,
        }),
      });
      const data = await res.json();
      if (data && data.data) {
        setAiSummary(data.data);
      }
    } catch (e) {
      console.warn('AI summary failed, providing local insight:', e);
      setAiSummary({
        summary: article.summary,
        keyPoints: article.keyInsights || [
          'Phân tích chuyên sâu về kiến trúc và nguyên lý vận hành cốt lõi.',
          'Đánh giá ưu nhược điểm so với các mô hình truyền thống.',
          'Khuyến nghị phương pháp áp dụng thực tiễn cho kỹ sư và nhà phát triển.'
        ],
        techTerms: [
          { term: 'Architecture', meaning: 'Cấu trúc tổng thể của hệ thống' },
          { term: 'Optimization', meaning: 'Quá trình nâng cao hiệu suất' }
        ]
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Reader theme tokens: outer card + every text/border role used inside the article
  const THEME = {
    light: {
      card: 'bg-white text-slate-900 border-slate-200',
      heading: 'text-slate-900',
      text: 'text-slate-700',
      strong: 'text-slate-900',
      muted: 'text-slate-500',
      border: 'border-slate-200',
      tag: 'bg-slate-100 text-slate-500',
      quote: 'bg-slate-100 text-slate-700',
      likeBtn: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200',
    },
    dark: {
      card: 'bg-slate-900/90 text-slate-200 border-slate-800',
      heading: 'text-slate-100',
      text: 'text-slate-300',
      strong: 'text-slate-100',
      muted: 'text-slate-400',
      border: 'border-slate-800',
      tag: 'bg-slate-800/60 text-slate-400',
      quote: 'bg-slate-800/50 text-slate-300',
      likeBtn: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700',
    },
    sepia: {
      card: 'bg-[#1c1815] text-[#e8ded1] border-[#382f29]',
      heading: 'text-[#f1e6d3]',
      text: 'text-[#e8ded1]',
      strong: 'text-[#f1e6d3]',
      muted: 'text-[#b8a98f]',
      border: 'border-[#382f29]',
      tag: 'bg-[#241f1a] text-[#b8a98f]',
      quote: 'bg-[#241f1a] text-[#e8ded1]',
      likeBtn: 'bg-[#241f1a] hover:bg-[#2c261f] text-[#e8ded1] border-[#382f29]',
    },
  };
  const theme = THEME[readerTheme];
  const themeClasses = {
    light: THEME.light.card,
    dark: THEME.dark.card,
    sepia: THEME.sepia.card,
  };

  // Font-size tokens: scale the title and quote too, not just body paragraphs,
  // so the effect is visible immediately without needing to scroll.
  const SIZE = {
    normal: {
      title: 'text-2xl sm:text-3xl lg:text-4xl',
      quote: 'text-sm',
      body: 'text-base leading-relaxed',
    },
    large: {
      title: 'text-3xl sm:text-4xl lg:text-5xl',
      quote: 'text-base',
      body: 'text-lg leading-relaxed',
    },
    xlarge: {
      title: 'text-4xl sm:text-5xl lg:text-6xl',
      quote: 'text-lg',
      body: 'text-xl leading-loose',
    },
  };
  const size = SIZE[fontSize];
  const fontClasses = {
    normal: SIZE.normal.body,
    large: SIZE.large.body,
    xlarge: SIZE.xlarge.body,
  };

  return (
    <div id="article-detail-container" className="max-w-4xl mx-auto pb-16">
      
      {/* Top Bar Actions */}
      <div className="flex items-center justify-between gap-4 py-4 mb-4 border-b border-slate-800">
        <button
          id="back-to-articles-btn"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Reader Preferences */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setFontSize(fontSize === 'normal' ? 'large' : fontSize === 'large' ? 'xlarge' : 'normal')}
              title="Thay đổi cỡ chữ"
              className="px-2 py-1 hover:bg-slate-800 rounded text-slate-300 flex items-center gap-1 font-medium"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="uppercase text-[10px]">{fontSize}</span>
            </button>

            <button
              onClick={() => setReaderTheme(readerTheme === 'light' ? 'dark' : readerTheme === 'dark' ? 'sepia' : 'light')}
              title="Thay đổi giao diện đọc"
              className="px-2 py-1 hover:bg-slate-800 rounded text-slate-300 text-[10px] font-medium"
            >
              {readerTheme === 'light' ? '☀️ Trắng' : readerTheme === 'dark' ? '🌙 Tối' : '📜 Sepia'}
            </button>
          </div>

          {/* Share */}
          <button
            onClick={handleCopyLink}
            title="Sao chép liên kết"
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition-colors relative"
          >
            <Share2 className="w-4 h-4" />
            {copiedNotification && (
              <span className="absolute -bottom-7 right-0 bg-cyan-600 text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
                Đã sao chép link!
              </span>
            )}
          </button>

          {/* Save Offline */}
          <button
            id="toggle-offline-detail-btn"
            onClick={() => onToggleSaveOffline(article)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isSavedOffline
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm shadow-cyan-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
          >
            {isSavedOffline ? (
              <>
                <BookmarkCheck className="w-4 h-4" />
                <span>Đã lưu Offline</span>
              </>
            ) : (
              <>
                <DownloadCloud className="w-4 h-4" />
                <span>Lưu để đọc Offline</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Article Container */}
      <article className={`border rounded-2xl p-6 sm:p-10 shadow-xl ${themeClasses[readerTheme]}`}>
        
        {/* Category & Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase px-2.5 py-1 rounded-md">
            {article.category}
          </span>
          {article.isDeepAnalysis && (
            <span className="bg-indigo-600/90 text-white text-xs font-semibold px-2.5 py-1 rounded-md flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Phân tích Chuyên sâu</span>
            </span>
          )}
          {article.tags.map((tag, idx) => (
            <span key={idx} className={`text-xs px-2 py-0.5 rounded ${theme.tag}`}>
              #{tag}
            </span>
          ))}
        </div>

        {/* Title */}
        <h1 className={`font-extrabold tracking-tight leading-tight mb-4 ${size.title} ${theme.heading}`}>
          {article.title}
        </h1>

        {/* Author & Meta */}
        <div className={`flex flex-wrap items-center justify-between gap-4 py-4 mb-6 border-y text-xs sm:text-sm ${theme.border} ${theme.muted}`}>
          <div className="flex items-center gap-3">
            <img
              src={article.author.avatar}
              alt={article.author.name}
              className="w-10 h-10 rounded-full object-cover border border-slate-700"
            />
            <div>
              <div className={`flex items-center gap-1.5 font-semibold ${theme.heading}`}>
                <span>{article.author.name}</span>
                {article.author.verified && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                )}
              </div>
              <p className={`text-xs ${theme.muted}`}>{article.author.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 opacity-70" />
              <span>Thời gian đọc: {article.readTimeMinutes} phút</span>
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 opacity-70" />
              <span>{article.views} lượt đọc</span>
            </span>
            <span>
              {new Date(article.publishedAt).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Cover Image */}
        <div className="mb-8 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
          <img
            src={article.coverImage}
            alt={article.title}
            className="w-full h-auto max-h-[420px] object-cover"
          />
        </div>

        {/* AI Smart Summary Generator Button & Box */}
        <div className="mb-8 p-5 bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm sm:text-base">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>AI TechPulse Assistant: Tóm tắt & Trích xuất Điểm Cốt lõi</span>
            </div>
            {!aiSummary && (
              <button
                id="generate-ai-summary-btn"
                onClick={handleGenerateAiSummary}
                disabled={isGeneratingAi}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isGeneratingAi ? 'Đang phân tích...' : 'Phân tích nhanh'}</span>
              </button>
            )}
          </div>

          {aiSummary ? (
            <div className="space-y-3 text-xs sm:text-sm text-slate-300">
              <p className="font-medium text-slate-200 leading-relaxed bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/20">
                💡 {aiSummary.summary}
              </p>
              {aiSummary.keyPoints && aiSummary.keyPoints.length > 0 && (
                <div>
                  <h4 className="font-semibold text-indigo-300 mb-1.5 text-xs uppercase tracking-wider">Điểm nhấn kỹ thuật:</h4>
                  <ul className="space-y-1.5 pl-4 list-disc marker:text-indigo-400">
                    {aiSummary.keyPoints.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiSummary.techTerms && aiSummary.techTerms.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-2">
                  {aiSummary.techTerms.map((t, idx) => (
                    <span key={idx} className="bg-slate-800/90 border border-slate-700 text-[11px] px-2.5 py-1 rounded-md">
                      <strong className="text-cyan-400">{t.term}:</strong> {t.meaning}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 leading-relaxed">
              Nhấn nút để AI trích xuất tự động các luận điểm kỹ thuật quan trọng nhất, thuật ngữ chuyên ngành và khuyến nghị áp dụng thực tiễn từ bài viết này.
            </p>
          )}
        </div>

        {/* Article Summary Box */}
        <div className={`mb-8 p-4 border-l-4 border-cyan-500 rounded-r-xl italic leading-relaxed ${size.quote} ${theme.quote}`}>
          "{article.summary}"
        </div>

        {/* Article Body Content (Markdown-like rendering) */}
        <div className={`space-y-6 ${fontClasses[fontSize]}`}>
          {article.content.split('\n\n').map((paragraph, index) => {
            // Heading 3
            if (paragraph.startsWith('### ')) {
              return (
                <h3 key={index} className={`text-xl font-bold mt-8 mb-3 border-b pb-2 ${theme.heading} ${theme.border}`}>
                  {paragraph.replace('### ', '')}
                </h3>
              );
            }
            // Code block
            if (paragraph.startsWith('```')) {
              const lines = paragraph.split('\n');
              const language = lines[0].replace('```', '') || 'code';
              const code = lines.slice(1, lines.length - 1).join('\n');
              return (
                <div key={index} className="my-6 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs sm:text-sm">
                  <div className="bg-slate-900 px-4 py-2 text-slate-400 text-xs flex items-center justify-between border-b border-slate-800">
                    <span className="uppercase">{language}</span>
                    <button
                      onClick={() => navigator.clipboard?.writeText(code)}
                      className="hover:text-cyan-400 transition-colors text-[11px]"
                    >
                      Sao chép mã
                    </button>
                  </div>
                  <pre className="p-4 text-cyan-300 overflow-x-auto">
                    <code>{code}</code>
                  </pre>
                </div>
              );
            }
            // List item bullet
            if (paragraph.startsWith('* ') || paragraph.startsWith('- ')) {
              const items = paragraph.split('\n').map((item) => item.replace(/^[\*\-]\s+/, ''));
              return (
                <ul key={index} className={`space-y-2 pl-6 list-disc marker:text-cyan-500 ${theme.text}`}>
                  {items.map((it, i) => (
                    <li key={i} dangerouslySetInnerHTML={{ __html: it.replace(/\*\*(.*?)\*\*/g, `<strong class="${theme.strong} font-semibold">$1</strong>`) }} />
                  ))}
                </ul>
              );
            }
            // Ordered list
            if (/^\d+\.\s+/.test(paragraph)) {
              const items = paragraph.split('\n').map((item) => item.replace(/^\d+\.\s+/, ''));
              return (
                <ol key={index} className={`space-y-2 pl-6 list-decimal marker:text-cyan-500 ${theme.text}`}>
                  {items.map((it, i) => (
                    <li key={i} dangerouslySetInnerHTML={{ __html: it.replace(/\*\*(.*?)\*\*/g, `<strong class="${theme.strong} font-semibold">$1</strong>`) }} />
                  ))}
                </ol>
              );
            }

            // Normal text with bold inline formatting
            return (
              <p
                key={index}
                className={`leading-relaxed ${theme.text}`}
                dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*(.*?)\*\*/g, `<strong class="${theme.strong} font-semibold">$1</strong>`) }}
              />
            );
          })}
        </div>

        {/* Article Footer Likes & Engagement */}
        <div className={`mt-12 pt-6 border-t flex flex-wrap items-center justify-between gap-4 ${theme.border}`}>
          <button
            id="article-like-btn"
            onClick={handleLike}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              isLiked
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                : theme.likeBtn
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-cyan-400 text-cyan-400' : ''}`} />
            <span>Thích bài viết ({likes})</span>
          </button>

          <div className={`flex items-center gap-3 text-xs ${theme.muted}`}>
            <span>Bản quyền nội dung thuộc TechPulse Digital Hub</span>
          </div>
        </div>

        {/* Live Discussion & Comments Section */}
        <CommentSection articleId={article.id} articleTitle={article.title} theme={readerTheme} />

      </article>

    </div>
  );
};
