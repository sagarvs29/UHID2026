import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Loader2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications, useMarkAllRead, useMarkOneRead } from '@/hooks/useNotifications';
import type { NotificationItem } from '@/types/telehealth';

// ─── Single notification row ──────────────────────────────────────────────────
function NotificationRow({
  item,
  onMarkRead,
}: {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
}) {
  return (
    <div
      className={`flex gap-3 px-4 py-3 hover:bg-accent/60 transition-colors ${
        item.isRead ? 'opacity-70' : ''
      }`}
    >
      {/* Unread dot */}
      <div className="mt-1 shrink-0 w-2 h-2 rounded-full bg-primary" style={{ visibility: item.isRead ? 'hidden' : 'visible' }} />

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground leading-snug">{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.message}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </p>
      </div>

      {!item.isRead && (
        <button
          onClick={(e) => { e.stopPropagation(); onMarkRead(item.id); }}
          title="Mark as read"
          className="shrink-0 self-start mt-0.5 p-1 rounded-md hover:bg-primary/10 transition-colors"
        >
          <Check className="w-3 h-3 text-primary" />
        </button>
      )}
    </div>
  );
}

// ─── Bell with dropdown ───────────────────────────────────────────────────────
export default function NotificationBell() {
  const [open, setOpen]   = useState(false);
  const containerRef      = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useNotifications(false, 20);
  const { mutate: markAll,  isPending: markingAll }  = useMarkAllRead();
  const { mutate: markOne }  = useMarkOneRead();

  const unreadCount = data?.unreadCount ?? 0;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border bg-card shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAll()}
                  disabled={markingAll}
                  title="Mark all as read"
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {markingAll
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <CheckCheck className="w-3 h-3" />}
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-accent transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : !data?.notifications.length ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Bell className="w-8 h-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              data.notifications.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onMarkRead={(id) => markOne(id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
