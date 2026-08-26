import React from 'react';
import type { User } from '@supabase/supabase-js';
import {
  BookOpen,
  Wifi,
  WifiOff,
  Search,
  DownloadCloud,
  FileText,
  GraduationCap,
  PlusCircle,
  BarChart3,
  Wrench,
  Cpu,
  UserCircle2,
  LogOut,
  ShieldCheck,
  UploadCloud,
  Phone
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'news' | 'offline' | 'quiz' | 'admin' | 'utilities' | 'contact';
  setActiveTab: (tab: 'news' | 'offline' | 'quiz' | 'admin' | 'utilities' | 'contact') => void;
  isOffline: boolean;
  toggleOffline: () => void;
  savedOfflineCount: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  openCreateQuizModal: () => void;
  openUploadDocumentModal: () => void;
  user: User | null;
  isAdmin: boolean;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isOffline,
  toggleOffline,
  savedOfflineCount,
  searchQuery,
  setSearchQuery,
  openCreateQuizModal,
  openUploadDocumentModal,
  user,
  isAdmin,
  onOpenAuth,
  onSignOut,
  onOpenProfile,
}) => {
  return (
    <header id="main-header" className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 text-slate-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand - Bento Theme Style */}
          <div 
            id="brand-logo"
            onClick={() => setActiveTab('quiz')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <img
              src="/logo2.png"
              alt="Long Hoa Số"
              className="w-8 h-8 rounded-lg shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform"
            />
            <div className="flex items-baseline gap-1">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-100">
                LONG HOA <span className="text-blue-400">SỐ</span>
              </span>
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 tracking-wider hidden sm:inline-block">
                Trắc nghiệm của rồng
              </span>
            </div>
          </div>

          {/* Search Bar - Bento Theme Style */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="global-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm bài viết phân tích, đề thi, tiện ích..."
                className="w-full bg-slate-950/70 hover:bg-slate-950 focus:bg-slate-950 text-sm text-slate-200 placeholder-slate-500 pl-10 pr-10 py-2 rounded-xl border border-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
              />
              {searchQuery && (
                <button
                  id="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 px-1.5 py-0.5 rounded"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick Create Quiz button */}
            <button
              id="header-create-quiz-btn"
              onClick={openCreateQuizModal}
              className="hidden lg:flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Tạo Đề Thi từ Tệp</span>
            </button>

            {/* Quick Upload Document button */}
            <button
              id="header-upload-doc-btn"
              onClick={openUploadDocumentModal}
              className="hidden lg:flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Tải Lên Tài Liệu</span>
            </button>

            {/* Offline Simulation Toggle */}
            <button
              id="offline-toggle-btn"
              onClick={toggleOffline}
              title={isOffline ? 'Đang ở chế độ Ngoại tuyến (Click để bật Online)' : 'Đang Online (Click để giả lập Ngoại tuyến)'}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                isOffline
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700'
              }`}
            >
              {isOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="hidden sm:inline">Offline</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Online</span>
                </>
              )}
            </button>

            {/* Account */}
            {user ? (
              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-xl pl-2.5 pr-1.5 py-1.5">
                <button
                  id="open-profile-btn"
                  onClick={onOpenProfile}
                  title="Xem hồ sơ giáo viên"
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                >
                  {isAdmin ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <UserCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="hidden sm:inline text-xs font-medium text-slate-300 max-w-[120px] truncate">
                    {user.email}
                  </span>
                </button>
                <button
                  id="sign-out-btn"
                  onClick={onSignOut}
                  title="Đăng xuất"
                  className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                id="header-open-auth-btn"
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 transition-colors"
              >
                <UserCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </button>
            )}

          </div>
        </div>

        {/* Navigation Tabs Bar - Bento Clean Style */}
        <nav id="nav-tabs-bar" className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto py-2 scrollbar-none border-t border-slate-800/60">
          
          <button
            id="tab-quiz-rooms-btn"
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'quiz'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Phòng Thi Trắc Nghiệm</span>
          </button>

          <button
            id="tab-offline-btn"
            onClick={() => setActiveTab('offline')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all relative ${
              activeTab === 'offline'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Kho đề thi kiểm tra</span>
            {savedOfflineCount > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                activeTab === 'offline' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'
              }`}>
                {savedOfflineCount}
              </span>
            )}
          </button>

          <button
            id="tab-news-btn"
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'news'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Bảng Điều Khiển & Bài Viết</span>
          </button>

          {user && (
            <button
              id="tab-dashboard-btn"
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === 'admin'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Quản Trị & Tiến Độ</span>
            </button>
          )}

          <button
            id="tab-utilities-btn"
            onClick={() => setActiveTab('utilities')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'utilities'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Tiện Ích Phần Mềm</span>
          </button>

          <button
            id="tab-contact-btn"
            onClick={() => setActiveTab('contact')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'contact'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>Liên Hệ Hệ Thống</span>
          </button>

        </nav>
      </div>

      {/* Offline Alert Banner if simulated offline */}
      {isOffline && (
        <div id="offline-status-banner" className="bg-amber-600/90 text-white text-xs px-4 py-1 text-center font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Bạn đang ở chế độ ngoại tuyến. Các bài viết đã lưu và đề thi đã tải vẫn hoạt động đầy đủ mà không cần Internet.</span>
        </div>
      )}
    </header>
  );
};
