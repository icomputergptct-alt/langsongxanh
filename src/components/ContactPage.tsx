import React, { useState } from 'react';
import { Mail, MapPin, Phone, Send, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react';
import { storageService } from '../services/storageService';

// Real contact details go here.
const CONTACT_INFO = {
  email: 'icomputer.gpt.ct@gmail.com',
  phone: '0772 162 969',
  address: 'Khu vực Long Hòa, phường Long Phú 1, thành phố Cần Thơ',
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1653.7960562586852!2d105.6174575912564!3d9.64578677329545!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31a0fbf7c77b126d%3A0x8b9ef5d2f35928dd!2zRFYgQ8O0bmcgTmdo4buHIFPhu5EgLSBJbmZvcm1hdGlvbiBUZWNobm9sb3J5!5e0!3m2!1svi!2s!4v1787711340623!5m2!1svi!2s',
};

export const ContactPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await storageService.sendContactMessage(title, content, email);
      setIsSent(true);
      setTitle('');
      setContent('');
      setEmail('');
    } catch (err) {
      console.error('Không gửi được thông tin liên hệ:', err);
      setError('Không thể gửi thông tin liên hệ. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          Liên Hệ Hệ Thống
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Mọi góp ý, thắc mắc hoặc yêu cầu hỗ trợ, vui lòng gửi thông tin cho chúng tôi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Contact info + map */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Thông Tin Liên Hệ</h2>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Email</div>
                <div className="text-sm text-slate-200 font-medium">{CONTACT_INFO.email || 'Đang cập nhật'}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Số điện thoại</div>
                <div className="text-sm text-slate-200 font-medium">{CONTACT_INFO.phone || 'Đang cập nhật'}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Địa chỉ</div>
                <div className="text-sm text-slate-200 font-medium">{CONTACT_INFO.address || 'Đang cập nhật'}</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4">Bản Đồ Vị Trí</h2>
            {CONTACT_INFO.mapEmbedUrl ? (
              <iframe
                src={CONTACT_INFO.mapEmbedUrl}
                className="w-full h-64 rounded-xl border border-slate-800"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                title="Bản đồ vị trí"
              />
            ) : (
              <div className="h-64 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-500 text-center px-4">
                Bản đồ vị trí sẽ được cập nhật sau
              </div>
            )}
          </div>
        </div>

        {/* Contact form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4">Gửi Thông Tin Liên Hệ</h2>

          {isSent ? (
            <div className="flex flex-col items-center justify-center text-center gap-3 py-10">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm text-slate-200 font-semibold">Đã gửi thành công!</p>
              <p className="text-xs text-slate-400">Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi qua email sớm nhất có thể.</p>
              <button
                type="button"
                onClick={() => setIsSent(false)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold mt-2"
              >
                Gửi thêm liên hệ khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Tiêu đề <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Vd: Yêu cầu hỗ trợ đăng nhập"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Nội dung <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={5}
                  placeholder="Mô tả chi tiết nội dung cần liên hệ..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Địa chỉ email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="ban@email.com"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl shadow-md transition-colors"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Đang gửi...' : 'Gửi Thông Tin'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
