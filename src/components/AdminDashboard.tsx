import React, { useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  TrendingUp, 
  Download, 
  Trash2, 
  Search, 
  Calendar, 
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { ExamAttempt, QuizExam } from '../types';
import { storageService } from '../services/storageService';

interface AdminDashboardProps {
  onOpenCreateQuiz: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenCreateQuiz }) => {
  const [attempts, setAttempts] = useState<ExamAttempt[]>(() => storageService.getAttempts());
  const [exams, setExams] = useState<QuizExam[]>(() => storageService.getExams());
  const [searchCandidate, setSearchCandidate] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttempt | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'attempts' | 'exams' | 'analytics'>('analytics');

  const handleDeleteExam = (examId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa đề thi này?')) {
      storageService.deleteExam(examId);
      setExams(storageService.getExams());
    }
  };

  // Metrics Calculations
  const totalAttempts = attempts.length;
  const passedAttempts = attempts.filter((a) => a.passed).length;
  const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
  const averageScore = totalAttempts > 0
    ? Math.round((attempts.reduce((acc, a) => acc + a.percentage, 0) / totalAttempts) * 10) / 10
    : 0;

  // Score Distribution (<50%, 50-70%, 70-85%, 85-100%)
  const scoreDist = {
    low: attempts.filter((a) => a.percentage < 50).length,
    medium: attempts.filter((a) => a.percentage >= 50 && a.percentage < 70).length,
    good: attempts.filter((a) => a.percentage >= 70 && a.percentage < 85).length,
    excellent: attempts.filter((a) => a.percentage >= 85).length,
  };

  // Category statistics
  const categoryStats: Record<string, { count: number; totalScore: number }> = {};
  attempts.forEach((a) => {
    const exam = exams.find((e) => e.id === a.examId);
    const cat = exam?.category || 'Công nghệ chung';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { count: 0, totalScore: 0 };
    }
    categoryStats[cat].count++;
    categoryStats[cat].totalScore += a.percentage;
  });

  const filteredAttempts = attempts.filter((a) =>
    a.userName.toLowerCase().includes(searchCandidate.toLowerCase()) ||
    a.examTitle.toLowerCase().includes(searchCandidate.toLowerCase())
  );

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID,Thí sinh,Chức vụ,Đề thi,Điểm,Tổng câu,Tỷ lệ %,Kết quả,Thời gian làm (s),Ngày thi'];
    const rows = attempts.map((a) =>
      `"${a.id}","${a.userName}","${a.userRole || ''}","${a.examTitle}",${a.score},${a.maxScore},${a.percentage}%,"${a.passed ? 'Đạt' : 'Chưa đạt'}",${a.durationSeconds},"${a.completedAt}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `techpulse_exam_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="admin-dashboard-view" className="max-w-6xl mx-auto pb-16">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
                Bảng Điều Khiển Quản Trị & Tiến Độ Thí Sinh
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Theo dõi trực quan tiến độ học tập, phổ điểm khảo sát, tỷ lệ hoàn thành các đề thi trắc nghiệm và quản lý hệ thống dữ liệu bài thi số.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Báo Cáo (CSV)</span>
            </button>

            <button
              onClick={onOpenCreateQuiz}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Tạo Đề Thi Mới</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Lượt thi hoàn tất</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-100">{totalAttempts}</div>
            <span className="text-[10px] text-emerald-400 mt-1 block">Tăng trưởng ổn định</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Tỷ lệ Vượt qua (Pass)</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400">{passRate}%</div>
            <span className="text-[10px] text-slate-400 mt-1 block">{passedAttempts} thí sinh đạt chuẩn</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Điểm trung bình</span>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-extrabold text-indigo-300">{averageScore}%</div>
            <span className="text-[10px] text-slate-400 mt-1 block">Thang điểm 100%</span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium">Đề thi sẵn sàng</span>
              <FileText className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-300">{exams.length}</div>
            <span className="text-[10px] text-slate-400 mt-1 block">Đa dạng chuyên ngành</span>
          </div>

        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
            activeSubTab === 'analytics'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Biểu Đồ Phân Tích Năng Lực
        </button>

        <button
          onClick={() => setActiveSubTab('attempts')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
            activeSubTab === 'attempts'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Nhật Ký Làm Bài ({attempts.length})
        </button>

        <button
          onClick={() => setActiveSubTab('exams')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
            activeSubTab === 'exams'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Quản Lý Kho Đề Thi ({exams.length})
        </button>
      </div>

      {/* SUB-VIEW 1: Visual Analytics Charts */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Chart 1: Score Distribution Histogram */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 mb-1 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>Phân Bố Phổ Điểm Khảo Sát</span>
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Tỷ lệ số lượng bài thi theo từng khung điểm số
              </p>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-400 font-semibold">Xuất sắc (85% - 100%)</span>
                    <strong className="text-slate-200">{scoreDist.excellent} bài ({totalAttempts ? Math.round((scoreDist.excellent / totalAttempts) * 100) : 0}%)</strong>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${totalAttempts ? (scoreDist.excellent / totalAttempts) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-cyan-400 font-semibold">Khá & Đạt chuẩn (70% - 84%)</span>
                    <strong className="text-slate-200">{scoreDist.good} bài ({totalAttempts ? Math.round((scoreDist.good / totalAttempts) * 100) : 0}%)</strong>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${totalAttempts ? (scoreDist.good / totalAttempts) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-amber-400 font-semibold">Trung bình (50% - 69%)</span>
                    <strong className="text-slate-200">{scoreDist.medium} bài ({totalAttempts ? Math.round((scoreDist.medium / totalAttempts) * 100) : 0}%)</strong>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${totalAttempts ? (scoreDist.medium / totalAttempts) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-rose-400 font-semibold">Cần cải thiện (&lt; 50%)</span>
                    <strong className="text-slate-200">{scoreDist.low} bài ({totalAttempts ? Math.round((scoreDist.low / totalAttempts) * 100) : 0}%)</strong>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${totalAttempts ? (scoreDist.low / totalAttempts) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Chart 2: Category Proficiency Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 mb-1 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                <span>Năng Lực Theo Lĩnh Vực Công Nghệ</span>
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Điểm số trung bình phân theo từng chuyên ngành
              </p>

              <div className="space-y-4">
                {Object.entries(categoryStats).map(([cat, stat]) => {
                  const avg = Math.round(stat.totalScore / stat.count);
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 font-medium">{cat}</span>
                        <strong className="text-indigo-300">{avg}% ({stat.count} lượt thi)</strong>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${avg}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Quick Insights Box */}
          <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/30 rounded-2xl p-6">
            <h4 className="font-bold text-sm text-cyan-300 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Khuyến Nghị Quản Trị Hệ Thống Đào Tạo</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              Các thí sinh thể hiện năng lực vượt trội ở mảng <strong>TypeScript & React 19</strong> (điểm TB &gt; 80%), trong khi mảng <strong>An toàn Thông tin & Mật mã Lượng tử</strong> đòi hỏi tăng cường thêm các tài liệu phân tích chuyên sâu và bài thi mẫu nhằm củng cố kiến thức.
            </p>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Attempts Table */}
      {activeSubTab === 'attempts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchCandidate}
                onChange={(e) => setSearchCandidate(e.target.value)}
                placeholder="Tìm thí sinh hoặc tên đề thi..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>
            <span className="text-xs text-slate-400">
              Hiển thị {filteredAttempts.length} bản ghi
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Thí sinh</th>
                    <th className="py-3.5 px-4">Đề thi</th>
                    <th className="py-3.5 px-4 text-center">Điểm số</th>
                    <th className="py-3.5 px-4 text-center">Kết quả</th>
                    <th className="py-3.5 px-4">Thời gian</th>
                    <th className="py-3.5 px-4">Ngày nộp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        Không tìm thấy dữ liệu lượt thi phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredAttempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={attempt.userAvatar}
                              alt={attempt.userName}
                              className="w-7 h-7 rounded-full object-cover border border-slate-700"
                            />
                            <div>
                              <strong className="text-slate-200 block">{attempt.userName}</strong>
                              <span className="text-[10px] text-slate-500">{attempt.userRole || 'Học viên'}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 max-w-xs truncate font-medium text-slate-200">
                          {attempt.examTitle}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg ${
                            attempt.passed ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                          }`}>
                            {attempt.score}/{attempt.maxScore} ({attempt.percentage}%)
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            attempt.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {attempt.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-400">
                          {Math.floor(attempt.durationSeconds / 60)}p {attempt.durationSeconds % 60}s
                        </td>

                        <td className="py-3 px-4 text-slate-400">
                          {new Date(attempt.completedAt).toLocaleDateString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: 'numeric',
                            month: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Exams Management */}
      {activeSubTab === 'exams' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                      {exam.category}
                    </span>
                    <span className="text-xs text-slate-400">
                      {exam.questions.length} câu hỏi
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-100 text-sm sm:text-base mb-1">
                    {exam.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                    {exam.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span>Thời gian: <strong className="text-slate-200">{exam.durationMinutes}p</strong></span>
                    <span>Đã thi: <strong className="text-cyan-400">{exam.participantsCount || 0} lượt</strong></span>
                  </div>

                  <button
                    onClick={() => handleDeleteExam(exam.id)}
                    title="Xóa đề thi này"
                    className="p-1.5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
