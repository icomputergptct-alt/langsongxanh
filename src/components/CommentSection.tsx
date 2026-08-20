import React, { useState } from 'react';
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
}

export const CommentSection: React.FC<CommentSectionProps> = ({ articleId, articleTitle }) => {
  const [comments, setComments] = useState<Comment[]>(() => storageService.getComments(articleId));
  const [newCommentText, setNewCommentText] = useState('');
  const [authorName, setAuthorName] = useState('Kỹ sư Tuấn Anh');
  const [authorRole, setAuthorRole] = useState('Software Engineer');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filterMode, setFilterMode] = useState<'newest' | 'popular'>('popular');

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const created = storageService.addComment(
      articleId,
      authorName,
      authorRole,
      newCommentText
    );
    setComments(storageService.getComments(articleId));
    setNewCommentText('');
  };

  const handlePostReply = (parentId: string) => {
    if (!replyText.trim()) return;

    storageService.addComment(
      articleId,
      authorName,
      authorRole,
      replyText,
      parentId
    );
    setComments(storageService.getComments(articleId));
    setReplyText('');
    setReplyingToId(null);
  };

  const handleToggleLike = (commentId: string) => {
    storageService.toggleCommentLike(articleId, commentId);
    setComments(storageService.getComments(articleId));
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (filterMode === 'popular') return (b.likes || 0) - (a.likes || 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalCommentCount = comments.reduce((acc, c) => acc + 1 + (c.replies ? c.replies.length : 0), 0);

  return (
    <section id="article-comment-section" className="mt-12 pt-8 border-t border-slate-800">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
            <MessageSquare className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">
            Thảo Luận Trực Tiếp ({totalCommentCount})
          </h3>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setFilterMode('popular')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterMode === 'popular' ? 'bg-slate-800 text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Nổi bật nhất
          </button>
          <button
            onClick={() => setFilterMode('newest')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterMode === 'newest' ? 'bg-slate-800 text-cyan-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mới nhất
          </button>
        </div>
      </div>

      {/* Main New Comment Box */}
      <form onSubmit={handlePostComment} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 mb-8 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Tên của bạn</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Chức danh / Đơn vị</label>
            <input
              type="text"
              value={authorRole}
              onChange={(e) => setAuthorRole(e.target.value)}
              placeholder="VD: DevOps Engineer / Học viên"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
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
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg p-3 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none resize-y"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
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
          <div className="text-center py-8 bg-slate-900/40 border border-slate-800/80 rounded-xl">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Chưa có bình luận nào. Hãy là người đầu tiên trao đổi về bài viết này!</p>
          </div>
        ) : (
          sortedComments.map((comment) => (
            <div 
              key={comment.id} 
              id={`comment-${comment.id}`}
              className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 transition-colors hover:border-slate-700/80"
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
                      <span className="font-semibold text-xs sm:text-sm text-slate-200">{comment.authorName}</span>
                      {comment.authorBadge && (
                        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-medium">
                          {comment.authorBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{comment.authorRole}</p>
                  </div>
                </div>

                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  {new Date(comment.createdAt).toLocaleDateString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: 'numeric',
                    month: 'numeric',
                  })}
                </span>
              </div>

              {/* Comment Content */}
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pl-10 mb-3 whitespace-pre-line">
                {comment.content}
              </p>

              {/* Comment Action bar */}
              <div className="flex items-center gap-4 pl-10 text-xs text-slate-400">
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
                  className="flex items-center gap-1.5 hover:text-slate-200 transition-colors"
                >
                  <Reply className="w-3.5 h-3.5" />
                  <span>Phản hồi</span>
                </button>
              </div>

              {/* Reply Input Form */}
              {replyingToId === comment.id && (
                <div className="mt-3 pl-10">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Trả lời ${comment.authorName}...`}
                      className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none mb-2"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingToId(null);
                          setReplyText('');
                        }}
                        className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
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
                <div className="mt-3 pl-10 space-y-3 border-l-2 border-slate-800 ml-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <img
                            src={reply.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt={reply.authorName}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="font-semibold text-xs text-slate-200">{reply.authorName}</span>
                          {reply.authorBadge && (
                            <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1 rounded">
                              {reply.authorBadge}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-500">
                          {new Date(reply.createdAt).toLocaleDateString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 pl-8 leading-relaxed">
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
