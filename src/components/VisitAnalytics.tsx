import React, { useEffect, useState } from 'react';
import { Monitor, Smartphone, Tablet, Globe, MapPin, FileText, Clock, CalendarDays, ShieldCheck } from 'lucide-react';
import { storageService, type VisitStats, type VisitStatRow } from '../services/storageService';

const PERIODS = [
  { days: 1, label: 'Hôm nay' },
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
  { days: 90, label: '90 ngày' },
] as const;

const DEVICE_LABELS: Record<string, string> = {
  mobile: 'Điện thoại',
  tablet: 'Máy tính bảng',
  desktop: 'Máy tính',
  unknown: 'Không rõ',
};

const pct = (count: number, total: number) => (total > 0 ? Math.round((count / total) * 1000) / 10 : 0);

// Single-series horizontal bars: one hue, value + share as text beside each bar.
const BarList: React.FC<{ title: string; icon: React.ReactNode; rows: VisitStatRow[]; total: number; format?: (label: string) => string }> = ({
  title,
  icon,
  rows,
  total,
  format = (l) => l,
}) => {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="glass-panel rounded-2xl p-5">
      <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
        {icon}
        <span>{title}</span>
      </h3>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">Chưa có dữ liệu.</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.label} title={`${format(r.label)}: ${r.count.toLocaleString('vi-VN')} lượt (${pct(r.count, total)}%)`}>
              <div className="flex items-baseline justify-between gap-3 text-xs mb-1">
                <span className="text-slate-200 truncate">{format(r.label)}</span>
                <span className="text-slate-400 shrink-0 tabular-nums">
                  {r.count.toLocaleString('vi-VN')} · {pct(r.count, total)}%
                </span>
              </div>
              <div className="h-2 rounded bg-slate-800/80 overflow-hidden">
                <div className="h-full rounded bg-blue-500" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Vertical bars over an ordered axis (hours of the day, days in the period).
const ColumnChart: React.FC<{
  title: string;
  icon: React.ReactNode;
  rows: { key: string; tick: string; tooltip: string; count: number }[];
  tickEvery: number;
}> = ({ title, icon, rows, tickEvery }) => {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="glass-panel rounded-2xl p-5">
      <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
        {icon}
        <span>{title}</span>
      </h3>
      <div className="flex items-end gap-[2px] h-36 border-b border-slate-700">
        {rows.map((r) => (
          <div key={r.key} className="group flex-1 h-full flex items-end relative" title={`${r.tooltip}: ${r.count.toLocaleString('vi-VN')} lượt`}>
            <div
              className="w-full rounded-t bg-blue-500 group-hover:bg-blue-400 transition-colors"
              style={{ height: `${(r.count / max) * 100}%`, minHeight: r.count > 0 ? 2 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-[2px] mt-1.5">
        {rows.map((r, i) => (
          <span key={r.key} className="flex-1 text-[10px] text-slate-500 text-center overflow-visible whitespace-nowrap">
            {i % tickEvery === 0 ? r.tick : ''}
          </span>
        ))}
      </div>
    </div>
  );
};

export const VisitAnalytics: React.FC = () => {
  const [days, setDays] = useState<number>(30);
  const [stats, setStats] = useState<VisitStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    storageService
      .getVisitStats(days)
      .then((s) => !cancelled && setStats(s))
      .catch((err) => {
        console.error('Không tải được thống kê truy cập:', err);
        if (!cancelled) setError('Không tải được thống kê. Kiểm tra đã chạy phần "visit analytics" trong supabase/auth.sql chưa.');
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const total = stats?.total ?? 0;
  const deviceCount = (key: string) => stats?.device.find((d) => d.label === key)?.count ?? 0;

  // Fill every hour 0–23 and every day in the period so gaps show as zero.
  const hourRows = Array.from({ length: 24 }, (_, h) => ({
    key: String(h),
    tick: `${h}h`,
    tooltip: `${h}:00–${h}:59`,
    count: stats?.hour.find((r) => Number(r.label) === h)?.count ?? 0,
  }));
  const dayRows = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000);
    const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const [, m, dd] = key.split('-');
    return { key, tick: `${dd}/${m}`, tooltip: `${dd}/${m}`, count: stats?.day.find((r) => r.label === key)?.count ?? 0 };
  });

  const tiles = [
    { label: 'Tổng lượt truy cập', value: total, icon: <Globe className="w-4 h-4 text-blue-400" /> },
    { label: 'Điện thoại', value: deviceCount('mobile'), icon: <Smartphone className="w-4 h-4 text-emerald-400" /> },
    { label: 'Máy tính', value: deviceCount('desktop'), icon: <Monitor className="w-4 h-4 text-blue-400" /> },
    { label: 'Máy tính bảng', value: deviceCount('tablet'), icon: <Tablet className="w-4 h-4 text-emerald-400" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          Thống kê ẩn danh: không lưu IP hay danh tính, chỉ loại thiết bị, hệ điều hành, trình duyệt và khu vực gần đúng. Tự xoá sau 180 ngày.
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                days === p.days ? 'bg-slate-800 text-cyan-400 border-slate-700' : 'bg-transparent text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">{error}</p>
      ) : !stats ? (
        <div className="flex justify-center py-16" role="status" aria-label="Đang tải">
          <div className="w-8 h-8 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {tiles.map((t) => (
              <div key={t.label} className="glass-panel rounded-2xl p-4">
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  {t.icon}
                  {t.label}
                </span>
                <span className="text-2xl font-extrabold text-slate-100 mt-1 block tabular-nums">{t.value.toLocaleString('vi-VN')}</span>
                {t.label !== 'Tổng lượt truy cập' && (
                  <span className="text-[10px] text-slate-500">{pct(t.value, total)}% tổng lượt</span>
                )}
              </div>
            ))}
          </div>

          {days > 1 && (
            <ColumnChart
              title="Lượt truy cập theo ngày"
              icon={<CalendarDays className="w-4 h-4 text-blue-400" />}
              rows={dayRows}
              tickEvery={days <= 7 ? 1 : days <= 30 ? 5 : 15}
            />
          )}
          <ColumnChart
            title="Khung giờ truy cập (giờ Việt Nam)"
            icon={<Clock className="w-4 h-4 text-blue-400" />}
            rows={hourRows}
            tickEvery={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BarList title="Thiết bị" icon={<Smartphone className="w-4 h-4 text-blue-400" />} rows={stats.device} total={total} format={(l) => DEVICE_LABELS[l] || l} />
            <BarList title="Hệ điều hành" icon={<Monitor className="w-4 h-4 text-blue-400" />} rows={stats.os} total={total} />
            <BarList title="Trình duyệt / ứng dụng" icon={<Globe className="w-4 h-4 text-blue-400" />} rows={stats.browser} total={total} />
            <BarList title="Khu vực (gần đúng)" icon={<MapPin className="w-4 h-4 text-blue-400" />} rows={stats.city} total={total} />
          </div>
          <BarList
            title="Trang được vào đầu tiên"
            icon={<FileText className="w-4 h-4 text-blue-400" />}
            rows={stats.path}
            total={total}
            format={(l) => {
              if (l === '/') return 'Trang chủ';
              try {
                return decodeURIComponent(l);
              } catch {
                return l;
              }
            }}
          />
        </>
      )}
    </div>
  );
};
