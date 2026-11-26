import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { fromDbTask, fromDbTeam, fromDbLane } from '../utils/supabaseMappers';

// Transport layer for the Supabase Realtime channel. Owns subscribe / reconnect /
// presence / health-check. Knows nothing about Pending flushes, Fingerprints, or
// state shape — it only forwards typed events to its consumer via callbacks.
//
// See docs/glossary.md → "Realtime channel".
export const useRealtimeChannel = ({
  projectId,
  user,
  profile,
  onTaskChange,
  onTeamChange,
  onLaneChange,
  onProjectChange,
  onReconnect,
  onResumeFromIdle,
}) => {
  const channelRef = useRef(null);
  const channelCounterRef = useRef(0);
  const [activeUsers, setActiveUsers] = useState([]);

  const profileRef = useRef(profile);
  const onTaskChangeRef = useRef(onTaskChange);
  const onTeamChangeRef = useRef(onTeamChange);
  const onLaneChangeRef = useRef(onLaneChange);
  const onProjectChangeRef = useRef(onProjectChange);
  const onReconnectRef = useRef(onReconnect);
  const onResumeFromIdleRef = useRef(onResumeFromIdle);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { onTaskChangeRef.current = onTaskChange; }, [onTaskChange]);
  useEffect(() => { onTeamChangeRef.current = onTeamChange; }, [onTeamChange]);
  useEffect(() => { onLaneChangeRef.current = onLaneChange; }, [onLaneChange]);
  useEffect(() => { onProjectChangeRef.current = onProjectChange; }, [onProjectChange]);
  useEffect(() => { onReconnectRef.current = onReconnect; }, [onReconnect]);
  useEffect(() => { onResumeFromIdleRef.current = onResumeFromIdle; }, [onResumeFromIdle]);

  // Ensure auth session is fresh (JWT may have expired during idle)
  const refreshSession = useCallback(async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.getSession();
      if (error) {
        console.warn('[RealtimeChannel] Session refresh failed, forcing refresh:', error.message);
        await supabase.auth.refreshSession();
      }
    } catch (err) {
      console.warn('[RealtimeChannel] Session refresh error:', err.message);
    }
  }, []);

  const removeChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setActiveUsers([]);
    }
  }, []);

  // Local user's presence payload. Used for initial track() and merged-self fallback
  // so the local user is always shown as active while the tab is open.
  const buildSelfPresence = useCallback(() => {
    if (!user) return null;
    return {
      userId: user.id,
      displayName: profileRef.current?.display_name || user.user_metadata?.display_name || user.email?.split('@')[0] || '?',
      email: user.email || '',
      avatarUrl: profileRef.current?.avatar_url || null,
    };
  }, [user]);

  const createChannel = useCallback(() => {
    if (!supabase || !user || !projectId) return null;

    channelCounterRef.current += 1;
    const channelName = `project:${projectId}:${channelCounterRef.current}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, (payload) => {
        const task = payload.new ? fromDbTask(payload.new) : null;
        const oldId = payload.old?.id;
        onTaskChangeRef.current?.({ eventType: payload.eventType, task, oldId });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `project_id=eq.${projectId}` }, (payload) => {
        const team = payload.new ? fromDbTeam(payload.new) : null;
        const oldId = payload.old?.id;
        onTeamChangeRef.current?.({ eventType: payload.eventType, team, oldId });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lanes' }, (payload) => {
        const lane = payload.new ? fromDbLane(payload.new) : null;
        const oldId = payload.old?.id;
        onLaneChangeRef.current?.({ eventType: payload.eventType, lane, oldId });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` }, (payload) => {
        onProjectChangeRef.current?.({ project: payload.new });
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat().map(p => ({
          userId: p.userId,
          displayName: p.displayName,
          email: p.email,
          avatarUrl: p.avatarUrl || null,
        }));
        // Deduplicate by userId AND ensure self is always present — the local user
        // is by definition active while the tab is open, even before the first
        // presence sync or if the channel temporarily drops their entry.
        const map = new Map(users.map(u => [u.userId, u]));
        const self = buildSelfPresence();
        if (self && !map.has(self.userId)) map.set(self.userId, self);
        setActiveUsers([...map.values()]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const self = buildSelfPresence();
          if (self) {
            setActiveUsers(prev => prev.some(u => u.userId === self.userId) ? prev : [...prev, self]);
            await channel.track(self);
          }
        }
        if (status === 'CHANNEL_ERROR') {
          console.warn('[RealtimeChannel] Channel error, scheduling reconnect');
          setTimeout(() => reconnect(), 1000);
        }
      });

    return channel;
  }, [projectId, user, buildSelfPresence]);

  const reconnect = useCallback(async () => {
    await refreshSession();
    removeChannel();
    const ch = createChannel();
    if (ch) {
      channelRef.current = ch;
      onReconnectRef.current?.();
    }
  }, [refreshSession, removeChannel, createChannel]);

  // Initial subscription
  useEffect(() => {
    const channel = createChannel();
    if (!channel) return;
    channelRef.current = channel;
    return removeChannel;
  }, [createChannel, removeChannel]);

  // Periodic health check — catches silent WebSocket death during idle.
  // Sends a lightweight DB query every 30s. If it fails, the connection is dead.
  // Also re-tracks presence so other clients keep seeing this user as active even
  // when the browser is on a secondary monitor and never fires a focus event.
  useEffect(() => {
    if (!supabase || !user || !projectId) return;

    const interval = setInterval(async () => {
      const ch = channelRef.current;
      if (ch && ch.state !== 'joined' && ch.state !== 'joining') {
        reconnect();
        return;
      }

      try {
        const { error } = await supabase.from('projects').select('id').eq('id', projectId).single();
        if (error) {
          console.warn('[RealtimeChannel] Health check query failed:', error.message);
          reconnect();
          return;
        }
      } catch (err) {
        console.warn('[RealtimeChannel] Health check network error:', err.message);
        reconnect();
        return;
      }

      const self = buildSelfPresence();
      if (self && ch && ch.state === 'joined') {
        try { await ch.track(self); } catch { /* next tick will retry */ }
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [projectId, user, reconnect, buildSelfPresence]);

  // React to network reconnection — fires even when no focus/visibility event does.
  useEffect(() => {
    if (!supabase || !user || !projectId) return;
    const handleOnline = () => {
      const ch = channelRef.current;
      if (!ch || ch.state !== 'joined') reconnect();
      else onResumeFromIdleRef.current?.({ trigger: 'online' });
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [projectId, user, reconnect]);

  // Reconnect on user interaction when channel is unhealthy (throttled)
  useEffect(() => {
    if (!supabase || !user || !projectId) return;

    let lastCheck = 0;
    const checkChannel = () => {
      const now = Date.now();
      if (now - lastCheck < 5000) return;
      lastCheck = now;

      const ch = channelRef.current;
      if (!ch) return;
      if (ch.state === 'joined' || ch.state === 'joining') return;
      reconnect();
    };

    window.addEventListener('mousemove', checkChannel);
    window.addEventListener('mousedown', checkChannel);
    window.addEventListener('keydown', checkChannel);
    return () => {
      window.removeEventListener('mousemove', checkChannel);
      window.removeEventListener('mousedown', checkChannel);
      window.removeEventListener('keydown', checkChannel);
    };
  }, [projectId, user, reconnect]);

  // Resync when tab becomes visible again
  useEffect(() => {
    if (!supabase || !user || !projectId) return;
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const ch = channelRef.current;
      if (!ch || ch.state !== 'joined') reconnect();
      else onResumeFromIdleRef.current?.({ trigger: 'visibility' });
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [projectId, user, reconnect]);

  // Full resync when window regains focus
  useEffect(() => {
    if (!supabase || !user || !projectId) return;
    const handleFocus = () => {
      const ch = channelRef.current;
      if (!ch || ch.state !== 'joined') reconnect();
      else onResumeFromIdleRef.current?.({ trigger: 'focus' });
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [projectId, user, reconnect]);

  return { activeUsers };
};
