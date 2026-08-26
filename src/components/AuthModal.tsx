import React, { useState } from 'react';
import { X, LogIn, UserPlus, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setInfoMessage(null);
    setMode('signin');
    onClose();
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setInfoMessage(null);
    setIsGoogleSubmitting(true);
    const { error: err } = await signInWithGoogle();
    if (err) {
      setError(err);
      setIsGoogleSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const { error: err } = await signIn(email, password);
        if (err) {
          setError(err);
        } else {
          resetAndClose();
        }
      } else {
        if (password.length < 6) {
          setError('Mật khẩu cần tối thiểu 6 ký tự.');
          return;
        }
        const { error: err, needsEmailConfirmation } = await signUp(email, password);
        if (err) {
          setError(err);
        } else if (needsEmailConfirmation) {
          setInfoMessage('Đã gửi email xác nhận. Vui lòng kiểm tra hộp thư và xác nhận trước khi đăng nhập.');
        } else {
          resetAndClose();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              {mode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <h2 className="text-base font-bold text-slate-100">
              {mode === 'signin' ? 'Đăng Nhập' : 'Đăng Ký Tài Khoản'}
            </h2>
          </div>
          <button onClick={resetAndClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-5">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleSubmitting || isSubmitting}
            className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-800 text-sm font-semibold py-2.5 rounded-xl shadow-md transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84Z" />
              <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11C3.24 21.3 7.29 24 12 24Z" />
              <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.26a12 12 0 0 0 0 10.76l4.01-3.11Z" />
              <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.29 0 3.24 2.7 1.26 6.62l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z" />
            </svg>
            {isGoogleSubmitting ? 'Đang chuyển hướng...' : 'Đăng nhập bằng Google'}
          </button>

          <div className="relative flex items-center gap-3 mt-4">
            <div className="flex-1 border-t border-slate-800" />
            <span className="text-[11px] text-slate-500 uppercase tracking-wide">hoặc</span>
            <div className="flex-1 border-t border-slate-800" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="ban@email.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="flex items-center gap-2 text-xs text-cyan-200 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl shadow-md transition-colors"
          >
            {isSubmitting ? 'Đang xử lý...' : mode === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>

          <p className="text-xs text-center text-slate-400">
            {mode === 'signin' ? (
              <>
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  Đăng ký ngay
                </button>
              </>
            ) : (
              <>
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  Đăng nhập
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
};
