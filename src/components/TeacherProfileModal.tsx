import React, { useEffect, useState } from 'react';
import { X, User as UserIcon, Mail, Save, FileText, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { QuizExam, ExamAttempt } from '../types';
import { storageService } from '../services/storageService';
import { ExamPreviewModal } from './ExamPreviewModal';
import { AttemptsPreviewModal } from './AttemptsPreviewModal';

interface TeacherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditExam: (exam: QuizExam) => void;
}

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({ isOpen, onClose, onEditExam }) => {
  const { user, profile, updateProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [myExams, setMyExams] = useState<QuizExam[]>([]);
  const [viewingExam, setViewingExam] = useState<QuizExam | null>(null);
  const [viewingExamAttempts, setViewingExamAttempts] = useState<ExamAttempt[]>([]);
  const [previewExam, setPreviewExam] = useState<QuizExam | null>(null);

  useEffect(() => {
    if (isOpen && profile) {
      setFullName(profile.fullName || '');
      setSchoolName(profile.schoolName || '');
      setPhone(profile.phone || '');
      setSavedMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen, profile]);

  useEffect(() => {
    if (!isOpen || !user) return;
    storageService
      .getAllExamsIncludingArchived()
      .then((exams) => setMyExams(exams.filter((e) => e.createdBy === user.id)))
      .catch((err) => console.error('Không tải được danh sách đề thi:', err));
  }, [isOpen, user]);

  useEffect(() => {
    if (!viewingExam) return;
    storageService
      .getAttempts()
      .then((attempts) =>
        setViewingExamAttempts(
          attempts
            .filter((a) => a.examId === viewingExam.id)
            .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
        )
      )
      .catch((err) => console.error('Không tải được lượt thi:', err));
  }, [viewingExam]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setSavedMsg(null);
    setErrorMsg(null);
    const { error } = await updateProfile({
      fullName: fullName.trim(),
      schoolName: schoolName.trim(),
      phone: phone.trim(),
    });
    setIsSaving(false);
    if (error) {
      setErrorMsg(error);
    } else {
      setSavedMsg('Đã lưu thông tin hồ sơ.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
      {/* Colored glow blobs so the glass panel has something to refract even when
          it's stacked over another opaque dark screen with nothing colorful behind it. */}
      <div className="pointer-events-none absolute -top-32 -left-24 w-[28rem] h-[28rem] bg-blue-500/40 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 w-[28rem] h-[28rem] bg-emerald-500/40 rounded-full blur-3xl" />

      <div className="relative bg-slate-900/60 backdrop-blur-2xl border border-white/25 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-white/20 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <UserIcon className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white">Hồ Sơ Giáo Viên</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Họ và Tên Giáo Viên</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="w-full bg-white/10 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base text-white placeholder-white/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Tên Trường</label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="VD: THCS Nguyễn Du"
              className="w-full bg-white/10 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base text-white placeholder-white/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Địa Chỉ Email (dùng để xác thực và đăng nhập)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                disabled
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-base text-white/50 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Số Điện Thoại (không bắt buộc)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="VD: 0901234567"
              className="w-full bg-white/10 border border-white/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-base text-white placeholder-white/40 focus:outline-none"
            />
          </div>

          {errorMsg && <p className="text-sm text-rose-400 font-semibold">{errorMsg}</p>}
          {savedMsg && <p className="text-sm text-emerald-400 font-semibold">{savedMsg}</p>}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-base font-bold py-2.5 rounded-xl shadow-md transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu Thông Tin'}</span>
          </button>

          <div className="pt-4 border-t border-white/10">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              <span>Đề Thi Đã Tạo ({myExams.length})</span>
            </h3>
            {myExams.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Bạn chưa tạo đề thi nào.</p>
            ) : (
              <ul className="space-y-2">
                {myExams.map((exam) => (
                  <li key={exam.id} className="flex items-center gap-1.5">
                    <button
                      onClick={() => (exam.isDraft ? onEditExam(exam) : setViewingExam(exam))}
                      title={exam.isDraft ? 'Tiếp tục chỉnh sửa bản nháp' : 'Xem trước danh sách thí sinh (tải Word/PDF/in)'}
                      className="flex-1 min-w-0 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/50 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-left transition-colors"
                    >
                      <span className="text-sm font-medium text-white line-clamp-1">{exam.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {exam.isDraft && (
                          <span className="text-xs font-bold uppercase text-slate-200 bg-white/10 border border-white/20 px-1.5 py-0.5 rounded">
                            Bản nháp
                          </span>
                        )}
                        {exam.isArchived && (
                          <span className="text-xs font-bold uppercase text-amber-300 bg-amber-500/10 border border-amber-400/30 px-1.5 py-0.5 rounded">
                            Đã lưu trữ
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => setPreviewExam(exam)}
                      title="Xem trước đề thi (tải Word/PDF)"
                      className="shrink-0 p-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/50 rounded-xl text-slate-300 hover:text-cyan-300 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {previewExam && <ExamPreviewModal exam={previewExam} onClose={() => setPreviewExam(null)} />}

      {/* Clicking an exam in the list jumps straight to this — the report already
          shows everything the old scores table did, plus Word/PDF/print, so the
          intermediate table step was just an extra click for no benefit. */}
      {viewingExam && (
        <AttemptsPreviewModal
          exam={viewingExam}
          attempts={viewingExamAttempts}
          onClose={() => setViewingExam(null)}
        />
      )}
    </div>
  );
};
