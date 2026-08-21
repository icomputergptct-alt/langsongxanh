import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  ThumbsUp, 
  Reply, 
  Send, 
  User, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck
} from 'lucide-react';
import { Comment } from '../types';
import { storageService } from '../services/storageService';

interface CommentSectionProps {
  articleId: string;
  articleTitle: string;
  theme?: 'light' | 'dark' | 'sepia';
}

const THEME = {
  light: {
    card: 'bg-white border-slate-200',
    input: 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400',
    heading: 'text-slate-900',
    text: 'text-slate-700',
    muted: 'text-slate-500',
    faint: 'text-slate-400',
    border: 'border-slate-200',
    hoverBorder: 'hover:border-slate-300',
    reply: 'bg-slate-50 border-slate-200',
    filterBar: 'bg-slate-100 border-slate-200',
    filterActive: 'bg-white text-cyan-600 shadow-sm',
    filterInactive: 'text-slate-500 hover:text-slate-700',
    empty: 'bg-slate-50 border-slate-200',
    cancelBtn: 'text-slate-500 hover:text-slate-800',
  },
  dark: {
    card: 'bg-slate-900/90 border-slate-800',
    input: 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500',
    heading: 'text-slate-200',
    text: 'text-slate-300',
    muted: 'text-slate-400',
    faint: 'text-slate-500',
    border: 'border-slate-800',
    hoverBorder: 'hover:border-slate-700/80',
    reply: 'bg-slate-950/60 border-slate-800/80',
    filterBar: 'bg-slate-900 border-slate-800',
    filterActive: 'bg-slate-800 text-cyan-400',
    filterInactive: 'text-slate-400 hover:text-slate-200',
    empty: 'bg-slate-900/40 border-slate-800/80',
    cancelBtn: 'text-slate-400 hover:text-slate-200',
  },
  sepia: {
    card: 'bg-[#1c1815] border-[#382f29]',
    input: 'bg-[#15110d] border-[#382f29] text-[#e8ded1] placeholder-[#8a7c68]',
    heading: 'text-[#f1e6d3]',
    text: 'text-[#e8ded1]',
    muted: 'text-[#b8a98f]',
    faint: 'text-[#8a7c68]',
    border: 'border-[#382f29]',
    hoverBorder: 'hover:border-[#4a3f35]',
    reply: 'bg-[#15110d] border-[#382f29]',
    filterBar: 'bg-[#241f1a] border-[#382f29]',
    filterActive: 'bg-[#382f29] text-[#f1e6d3]',
    filterInactive: 'text-[#b8a98f] hover:text-[#e8ded1]',
    empty: 'bg-[#15110d] border-[#382f29]',
    cancelBtn: 'text-[#b8a98f] hover:text-[#e8ded1]',
  },
};

export const CommentSection: React.FC<CommentSectionProps> = ({ articleId, articleTitle, theme: themeName = 'dark' }) => {
  const theme = THEME[themeName];
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [authorName, setAuthorName] = useState('Kỹ sư Tuấn Anh');
  const [authorRole, setAuthorRole] = useState('Software Engineer');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filterMode, setFilterMode] = useState<'newest' | 'popular'>('popular');

  useEffect(() => {
    storageService.getComments(articleId).then(setComments).catch((err) => console.error('Không tải được bình luận:', err));
  }, [articleId]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    await storageService.addComment(articleId, authorName, authorRole, newCommentText);
    setComments(await storageService.getComments(articleId));
    setNewCommentText('');
  };

  const handlePostReply = async (parentId: string) => {
    if (!replyText.trim()) return;

    await storageService.addComment(articleId, authorName, authorRole, replyText, parentId);
    setComments(await storageService.getComments(articleId));
    setReplyText('');
    setReplyingToId(null);
  };

  const handleToggleLike = async (commentId: string) => {
    await storageService.toggleCommentLike(articleId, commentId);
    setComments(await storageService.getComments(articleId));
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (filterMode === 'popular') return (b.likes || 0) - (a.likes || 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalCommentCount = comments.reduce((acc, c) => acc + 1 + (c.replies ? c.replies.length : 0), 0);

  return (
    <section id="article-comment-section" className={`mt-12 pt-8 border-t ${theme.border}`}>

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <MessageSquare className="w-4 h-4" />
          </div>
          <h3 className={`text-lg font-bold ${theme.heading}`}>
            Thảo Luận Trực Tiếp ({totalCommentCount})
          </h3>
        </div>

        {/* Filter */}
        <div className={`flex items-center gap-1.5 p-1 rounded-lg border text-xs ${theme.filterBar}`}>
          <button
            onClick={() => setFilterMode('popular')}
            className={`px-2.5 py-1 rounded-md transition-colors font-semibold ${
              filterMode === 'popular' ? theme.filterActive : theme.filterInactive
            }`}
          >
            Nổi bật nhất
          </button>
          <button
            onClick={() => setFilterMode('newest')}
            className={`px-2.5 py-1 rounded-md transition-colors font-semibold ${
              filterMode === 'newest' ? theme.filterActive : theme.filterInactive
            }`}
          >
            Mới nhất
          </button>
        </div>
      </div>

      {/* Main New Comment Box */}
      <form onSubmit={handlePostComment} className={`border rounded-xl p-4 mb-8 shadow-sm ${theme.card}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className={`block text-[11px] font-medium mb-1 ${theme.muted}`}>Tên của bạn</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className={`w-full border focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs focus:outline-none ${theme.input}`}
              required
            />
          </div>
          <div>
            <label className={`block text-[11px] font-medium mb-1 ${theme.muted}`}>Chức danh / Đơn vị</label>
            <input
              type="text"
              value={authorRole}
              onChange={(e) => setAuthorRole(e.target.value)}
              placeholder="VD: DevOps Engineer / Học viên"
              className={`w-full border focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs focus:outline-none ${theme.input}`}
            />
          </div>
        </div>

        <div className="relative mb-3">
          <textarea
            id="new-comment-textarea"
            rows={3}
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder={`Chia sẻ quan điểm kỹ thuật của bạn về "${articleTitle.slice(0, 45)}..."`}
            className={`w-full border focus:border-cyan-500 rounded-lg p-3 text-xs sm:text-sm focus:outline-none resize-y ${theme.input}`}
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 text-[11px] ${theme.muted}`}>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bình luận tuân thủ tiêu chuẩn cộng đồng kỹ thuật</span>
          </div>
          <button
            type="submit"
            id="submit-comment-btn"
            disabled={!newCommentText.trim()}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi bình luận</span>
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {sortedComments.length === 0 ? (
          <div className={`text-center py-8 border rounded-xl ${theme.empty}`}>
            <MessageSquare className={`w-8 h-8 mx-auto mb-2 opacity-50 ${theme.faint}`} />
            <p className={`text-sm ${theme.muted}`}>Chưa có bình luận nào. Hãy là người đầu tiên trao đổi về bài viết này!</p>
          </div>
        ) : (
          sortedComments.map((comment) => (
            <div
              key={comment.id}
              id={`comment-${comment.id}`}
              className={`border rounded-xl p-4 transition-colors ${theme.card} ${theme.hoverBorder}`}
            >
              {/* Comment Author Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <img
                    src={comment.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                    alt={comment.authorName}
                    className="w-8 h-8 rounded-full object-cover border border-slate-700"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-xs sm:text-sm ${theme.heading}`}>{comment.authorName}</span>
                      {comment.authorBadge && (
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-medium">
                          {comment.authorBadge}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] ${theme.muted}`}>{comment.authorRole}</p>
                  </div>
                </div>

                <span className={`text-[10px] whitespace-nowrap ${theme.faint}`}>
                  {new Date(comment.createdAt).toLocaleDateString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: 'numeric',
                    month: 'numeric',
                  })}
                </span>
              </div>

              {/* Comment Content */}
              <p className={`text-xs sm:text-sm leading-relaxed pl-10 mb-3 whitespace-pre-line ${theme.text}`}>
                {comment.content}
              </p>

              {/* Comment Action bar */}
              <div className={`flex items-center gap-4 pl-10 text-xs ${theme.muted}`}>
                <button
                  onClick={() => handleToggleLike(comment.id)}
                  className={`flex items-center gap-1.5 hover:text-cyan-400 transition-colors ${
                    comment.isLikedByUser ? 'text-cyan-400 font-semibold' : ''
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{comment.likes || 0}</span>
                </button>

                <button
                  onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                  className={`flex items-center gap-1.5 hover:text-cyan-400 transition-colors`}
                >
                  <Reply className="w-3.5 h-3.5" />
                  <span>Phản hồi</span>
                </button>
              </div>

              {/* Reply Input Form */}
              {replyingToId === comment.id && (
                <div className="mt-3 pl-10">
                  <div className={`p-3 rounded-lg border ${theme.reply}`}>
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Trả lời ${comment.authorName}...`}
                      className={`w-full bg-transparent text-xs focus:outline-none resize-none mb-2 ${theme.text}`}
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingToId(null);
                          setReplyText('');
                        }}
                        className={`text-xs px-2 py-1 ${theme.cancelBtn}`}
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePostReply(comment.id)}
                        disabled={!replyText.trim()}
                        className="text-xs bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold px-3 py-1 rounded transition-colors"
                      >
                        Gửi phản hồi
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Nested Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className={`mt-3 pl-10 space-y-3 border-l-2 ml-4 ${theme.border}`}>
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className={`p-3 rounded-lg border ${theme.reply}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <img
                            src={reply.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt={reply.authorName}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className={`font-semibold text-xs ${theme.heading}`}>{reply.authorName}</span>
                          {reply.authorBadge && (
                            <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1 rounded">
                              {reply.authorBadge}
                            </span>
                          )}
                        </div>
                        <span className={`text-[9px] ${theme.faint}`}>
                          {new Date(reply.createdAt).toLocaleDateString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className={`text-xs pl-8 leading-relaxed ${theme.text}`}>
                        {reply.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

            </div>
          ))
        )}
      </div>

    </section>
  );
};
