import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { NotificationsResponse } from '@/types/telehealth';

// ─── Query Key Factory ────────────────────────────────────────────────────────

export const notificationKeys = {
  all:  ['notifications'] as const,
  list: (unreadOnly: boolean, limit: number) =>
          ['notifications', 'list', unreadOnly, limit] as const,
};

// ─── List Notifications ───────────────────────────────────────────────────────

export function useNotifications(unreadOnly = false, limit = 20) {
  const qc = useQueryClient();

  const query = useQuery<NotificationsResponse>({
    queryKey: notificationKeys.list(unreadOnly, limit),
    queryFn: async () => {
      const params = new URLSearchParams({
        unreadOnly: String(unreadOnly),
        limit:      String(limit),
      });
      const { data } = await api.get<{ success: boolean; data: NotificationsResponse }>(`/notifications?${params}`);
      return data.data;
    },
    staleTime: 30_000,
    // Poll every 60 s so the bell badge stays up to date
    refetchInterval: 60_000,
  });

  // Invalidate when the window regains focus (user switches tabs)
  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: notificationKeys.all });
  }, [qc]);
  const invalidateRef = useRef(invalidate);
  invalidateRef.current = invalidate;

  useEffect(() => {
    const onFocus = () => invalidateRef.current();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return query;
}

// ─── Unread Count (derived) ───────────────────────────────────────────────────

export function useUnreadCount() {
  const { data } = useNotifications(false, 1);
  return data?.unreadCount ?? 0;
}

// ─── Mark All Read ────────────────────────────────────────────────────────────

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation<{ message: string; updatedCount: number }, Error>({
    mutationFn: async () => {
      const { data } = await api.patch<{ success: boolean; data: { message: string; updatedCount: number } }>(
        '/notifications/read-all',
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// ─── Mark One Read ────────────────────────────────────────────────────────────

export function useMarkOneRead() {
  const qc = useQueryClient();
  return useMutation<{ message: string }, Error, string>({
    mutationFn: async (notificationId) => {
      const { data } = await api.patch<{ success: boolean; data: { message: string } }>(
        `/notifications/${notificationId}/read`,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
