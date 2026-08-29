import React, { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { storageService } from '../services/storageService';

const SESSION_VISIT_KEY = 'lhs_visit_counted';
const SESSION_PRESENCE_KEY = 'lhs_presence_id';

function getPresenceId(): string {
  let id = sessionStorage.getItem(SESSION_PRESENCE_KEY);
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_PRESENCE_KEY, id);
  }
  return id;
}

// Footer widget: total site visits (persisted, one increment per browser tab
// session) and how many browser tabs are live right now (Supabase Realtime
// Presence — no polling, no extra table, self-cleans up on disconnect).
export const VisitorStats: React.FC = () => {
  const [totalVisits, setTotalVisits] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState(1);

  useEffect(() => {
    let cancelled = false;
    // Flag set before the request starts (not after it resolves) so two
    // effect invocations in the same tick — React StrictMode's dev-only
    // double-invoke — can't both see "not counted yet" and increment twice.
    const alreadyCounted = sessionStorage.getItem(SESSION_VISIT_KEY) === '1';
    if (!alreadyCounted) sessionStorage.setItem(SESSION_VISIT_KEY, '1');

    (alreadyCounted ? storageService.getTotalVisits() : storageService.incrementSiteVisit())
      .then((count) => {
        if (!cancelled) setTotalVisits(count);
      })
      .catch((err) => console.error('Không tải được lượt truy cập:', err));

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const channel = supabase.channel('site-online-users', {
      config: { presence: { key: getPresenceId() } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineCount(Object.keys(channel.presenceState()).length || 1);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <>
      <span className="flex items-center gap-1">
        <Eye className="w-3.5 h-3.5 text-blue-400" />
        <span>{totalVisits === null ? '...' : totalVisits.toLocaleString('vi-VN')} lượt truy cập</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span>{onlineCount} đang online</span>
      </span>
    </>
  );
};
