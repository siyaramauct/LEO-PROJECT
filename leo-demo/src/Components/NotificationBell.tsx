// -----------------------------------------------------------------------------
// Notification Bell
//
// The bell icon in page headers, with an unread count and a dropdown list.
//
// How the dropdown works:
//   The open or closed state is kept here. Opening it loads the latest 20
//   notifications. Clicking anywhere outside the bell closes it (a document
//   listener checks whether the click landed inside). Clicking a notification
//   marks it read and follows its link.
//
// How the count stays live:
//   A Supabase Realtime channel listens for new rows addressed to this user and
//   adds one to the badge as each arrives, without reloading.
//
// Used by: the header of most student and teacher pages
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase-client";

type NotificationRow = {
  notification_id: number;
  type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
};

const NOTIFICATION_LIMIT = 20;

// Formats a timestamp as a short relative label, e.g. "5m ago", "3d ago".
function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function NotificationBell() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const userId = session?.user?.id;

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function loadNotifications() {
    if (!userId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("notification_id, type, title, body, link_url, is_read, created_at")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(NOTIFICATION_LIMIT);

    if (error) {
      console.error("Error loading notifications:", error);
      setIsLoading(false);
      return;
    }
    setNotifications((data ?? []) as NotificationRow[]);
    setIsLoading(false);
  }

  useEffect(() => {
    if (!userId) return;
    let isCurrent = true;

    supabase
      .from("notifications")
      .select("notification_id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .eq("is_read", false)
      .then(({ count, error }) => {
        if (!isCurrent) return;
        if (error) {
          console.error("Error loading unread notification count:", error);
          return;
        }
        setUnreadCount(count ?? 0);
      });

    return () => {
      isCurrent = false;
    };
  }, [userId]);

  // Bumps the unread badge instantly when a new notification is inserted for this user.
  // Channel name includes a per-instance id: mobile/desktop headers both render a
  // NotificationBell for the same user, and reusing one topic makes supabase-js hand
  // back an already-subscribed channel, which throws when `.on()` is called again.
  const instanceIdRef = useRef(crypto.randomUUID());
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}:${instanceIdRef.current}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => setUnreadCount((count) => count + 1),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  // Closes the dropdown when clicking outside of it.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function toggleOpen() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) await loadNotifications();
  }

  async function markAsRead(notification: NotificationRow) {
    if (!notification.is_read) {
      setNotifications((current) =>
        current.map((n) =>
          n.notification_id === notification.notification_id ? { ...n, is_read: true } : n,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("notification_id", notification.notification_id);
      if (error) console.error("Error marking notification as read:", error);
    }

    setIsOpen(false);
    if (notification.link_url) navigate(notification.link_url);
  }

  async function markAllAsRead() {
    if (!userId || !unreadCount) return;
    setNotifications((current) => current.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", userId)
      .eq("is_read", false);
    if (error) console.error("Error marking all notifications as read:", error);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => void toggleOpen()}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={isOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-700 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-bold">Notifications</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-800"
              >
                <CheckCheck size={14} /> Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Loading...</p>
            )}

            {!isLoading && notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-400">
                You have no notifications yet.
              </p>
            )}

            {!isLoading &&
              notifications.map((notification) => (
                <button
                  key={notification.notification_id}
                  type="button"
                  onClick={() => void markAsRead(notification)}
                  className={`flex w-full flex-col items-start gap-0.5 border-b border-slate-50 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 ${
                    notification.is_read ? "" : "bg-violet-50/60"
                  }`}
                >
                  <div className="flex w-full items-center gap-2">
                    {!notification.is_read && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-700" />
                    )}
                    <span className="truncate text-sm font-semibold text-slate-800">
                      {notification.title}
                    </span>
                  </div>
                  {notification.body && (
                    <p className="line-clamp-2 text-xs text-slate-500">{notification.body}</p>
                  )}
                  <span className="text-[11px] text-slate-400">
                    {formatRelativeTime(notification.created_at)}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
