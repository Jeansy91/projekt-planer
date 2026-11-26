import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const recoveryHandledRef = useRef(false);
  const mfaJustVerifiedRef = useRef(false);

  const fetchOrCreateProfile = useCallback(async (authUser) => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
    if (data) return data;
    // Query failed (network/RLS error) — don't overwrite an existing profile
    if (error) return null;

    // Profile missing (user created before trigger existed) — create it
    const { data: created } = await supabase.from('profiles')
      .insert({ id: authUser.id, email: authUser.email, display_name: authUser.email?.split('@')[0] || 'User' })
      .select()
      .single();
    return created;
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }

    // IMPORTANT: This callback must be SYNC (not async) to avoid deadlocking
    // GoTrueClient's internal _acquireLock. _notifyAllSubscribers awaits all
    // callbacks via Promise.all — if the callback is async and makes Supabase
    // queries inside, those queries queue behind the lock held by the caller
    // (e.g. mfa.verify), causing a deadlock. All Supabase queries are deferred
    // to a fire-and-forget IIFE instead.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && !recoveryHandledRef.current) {
        setPasswordRecovery(true);
      }
      const u = session?.user ?? null;
      setUser(u);

      if (u) {
        const wasMfaJustVerified = mfaJustVerifiedRef.current;
        if (wasMfaJustVerified) {
          mfaJustVerifiedRef.current = false;
          setMfaRequired(false);
        }

        // Defer all Supabase queries to break out of the lock
        (async () => {
          try {
            if (!wasMfaJustVerified) {
              const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
              if (aal?.nextLevel === 'aal2' && aal?.currentLevel === 'aal1') {
                if (event === 'INITIAL_SESSION') {
                  await supabase.auth.signOut();
                  setUser(null);
                  setProfile(null);
                  setMfaRequired(false);
                  setLoading(false);
                  return;
                }
                setMfaRequired(true);
              } else {
                setMfaRequired(false);
              }
            }
            const p = await fetchOrCreateProfile(u);
            setProfile(p);
            if (p?.email) {
              await supabase.rpc('resolve_pending_invites', { p_user_id: u.id, p_email: p.email });
            }
          } catch (err) {
            console.error('Auth state post-processing failed:', err);
          } finally {
            setLoading(false);
          }
        })();
      } else {
        setProfile(null);
        setMfaRequired(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchOrCreateProfile]);

  const checkEmailExists = useCallback(async (email) => {
    if (!supabase) return { exists: false, error: null };
    const { data, error } = await supabase.rpc('check_email_exists', { p_email: email });
    if (error) return { exists: false, error };
    return { exists: !!data, error: null };
  }, []);

  const signInWithPassword = useCallback(async (email, password) => {
    if (!supabase) return { error: { message: 'Supabase not configured' } };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(async (email, password, displayName) => {
    if (!supabase) return { error: { message: 'Supabase not configured' } };
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    return { error };
  }, []);

  const resetPasswordForEmail = useCallback(async (email) => {
    if (!supabase) return { error: { message: 'Supabase not configured' } };
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword, oldPassword) => {
    if (!supabase) return { error: { message: 'Supabase not configured' } };
    // Password recovery flow — no old password needed, user arrived via reset link
    if (!oldPassword) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (!error) {
        recoveryHandledRef.current = true;
        setPasswordRecovery(false);
      }
      return { error };
    }
    // Normal flow — enforce old password via edge function
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('change-password', {
      body: { oldPassword, newPassword },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    if (error || data?.error) {
      return { error: { message: data?.error || error?.message } };
    }
    return { error: null };
  }, []);

  const verifyPassword = useCallback(async (password) => {
    if (!supabase) return { error: 'not_configured' };
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('change-password', {
      body: { oldPassword: password, verifyOnly: true },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    if (error || data?.error) return { error: data?.error || error?.message };
    return { error: null };
  }, []);

  const updateEmail = useCallback(async (newEmail, password) => {
    if (!supabase) return { error: { message: 'Supabase not configured' } };
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('change-email', {
      body: { newEmail, password },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    if (error || data?.error) {
      return { error: { message: data?.error || error?.message } };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMfaRequired(false);
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!supabase || !user) return;
    const { data } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single();
    if (data) setProfile(data);
  }, [user]);

  const uploadAvatar = useCallback(async (file) => {
    if (!supabase || !user) return { error: 'not_configured' };
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    // Remove old avatar files first
    const { data: existing } = await supabase.storage.from('avatars').list(user.id);
    if (existing?.length) {
      await supabase.storage.from('avatars').remove(existing.map(f => `${user.id}/${f.name}`));
    }
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) return { error: uploadError.message };
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;
    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
    setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : prev);
    return { error: null, url: avatarUrl };
  }, [user]);

  const removeAvatar = useCallback(async () => {
    if (!supabase || !user) return;
    const { data: existing } = await supabase.storage.from('avatars').list(user.id);
    if (existing?.length) {
      await supabase.storage.from('avatars').remove(existing.map(f => `${user.id}/${f.name}`));
    }
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
    setProfile(prev => prev ? { ...prev, avatar_url: null } : prev);
  }, [user]);

  const deleteAccount = useCallback(async () => {
    if (!supabase || !user) return { error: 'not_configured' };
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('delete-account', {
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    if (error || data?.error) return { error: error?.message || data?.error };
    setUser(null);
    setProfile(null);
    return { error: null };
  }, [user]);

  // MFA helpers
  // Enrollment uses edge function (bypasses mfa_allow_low_aal restriction)
  const enrollMfa = useCallback(async () => {
    if (!supabase) return { error: 'not_configured' };
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('enroll-mfa', {
      body: { action: 'enroll' },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    if (error || data?.error) return { error: data?.error || error?.message };
    return { ...data, error: null };
  }, []);

  // Challenge + verify on CLIENT so session upgrades to AAL2
  const verifyMfa = useCallback(async (factorId, code) => {
    if (!supabase) return { error: 'not_configured' };
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) return { error: challengeError.message };
    // Set BEFORE verify — onAuthStateChange fires DURING mfa.verify(), before it returns
    mfaJustVerifiedRef.current = true;
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    if (verifyError) {
      mfaJustVerifiedRef.current = false;
      return { error: verifyError.message };
    }
    setMfaRequired(false);
    return { error: null };
  }, []);

  // List factors via edge function (admin API, bypasses AAL)
  const getMfaFactors = useCallback(async () => {
    if (!supabase) return [];
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('enroll-mfa', {
      body: { action: 'list' },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    if (error || data?.error) return [];
    return data.factors || [];
  }, []);

  // Unenroll via edge function (admin API)
  const unenrollMfa = useCallback(async (factorId) => {
    if (!supabase) return { error: 'not_configured' };
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('enroll-mfa', {
      body: { action: 'unenroll', factorId },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    if (error || data?.error) return { error: data?.error || error?.message };
    return { error: null };
  }, []);

  return {
    user,
    profile,
    loading,
    // Only fully authenticated if no MFA challenge pending
    isAuthenticated: !!user && !mfaRequired,
    mfaRequired,
    isSupabaseConfigured,
    passwordRecovery,
    checkEmailExists,
    signInWithPassword,
    signUp,
    signOut,
    resetPasswordForEmail,
    updatePassword,
    updateEmail,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    deleteAccount,
    getMfaFactors,
    enrollMfa,
    verifyMfa,
    unenrollMfa,
    verifyPassword,
  };
};
