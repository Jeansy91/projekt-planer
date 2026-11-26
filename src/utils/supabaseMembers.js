import { supabase } from './supabase';

export const getMembers = async (projectId) => {
  if (!supabase) return [];
  const { data } = await supabase
    .from('project_members')
    .select('user_id, role, profiles:user_id(email, display_name, avatar_url)')
    .eq('project_id', projectId);
  return (data || []).map(m => ({
    userId: m.user_id,
    role: m.role,
    email: m.profiles?.email,
    displayName: m.profiles?.display_name,
    avatarUrl: m.profiles?.avatar_url,
  }));
};

export const inviteMember = async (projectId, email, role = 'editor') => {
  if (!supabase) return { success: false, error: 'not_configured' };

  // Clean up ghost users and send registration email BEFORE the RPC.
  // Ghost users (from old inviteUserByEmail) have auth + profile entries
  // but never signed in. The RPC checks profiles, so ghosts must be
  // removed first to get the correct pending/immediate result.
  const { data: { session } } = await supabase.auth.getSession();
  const { data: prepData, error: prepError } = await supabase.functions.invoke('invite-user', {
    body: { email, projectId },
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
  });

  if (prepError) {
    console.error('Edge function invite-user failed:', prepError);
    return { success: false, error: 'email_failed' };
  }
  if (prepData?.error) {
    console.error('Invite prep error:', prepData.error);
    return { success: false, error: 'email_failed' };
  }

  const { data, error } = await supabase.rpc('invite_member', {
    p_project_id: projectId,
    p_email: email,
    p_role: role,
  });
  if (error) return { success: false, error: error.message };

  return data;
};

export const removeMember = async (projectId, userId) => {
  if (!supabase) return false;
  const { error } = await supabase.from('project_members').delete().match({ project_id: projectId, user_id: userId });
  return !error;
};

export const getPendingInvites = async (projectId) => {
  if (!supabase) return [];
  const { data } = await supabase.from('pending_invites').select('*').eq('project_id', projectId);
  return data || [];
};

export const updateMemberRole = async (projectId, userId, role) => {
  if (!supabase) return { error: 'not_configured' };
  const { error } = await supabase.rpc('update_member_role', {
    p_project_id: projectId,
    p_user_id: userId,
    p_role: role,
  });
  return { error: error?.message || null };
};

export const transferOwnership = async (projectId, newOwnerId) => {
  if (!supabase) return { error: 'not_configured' };
  const { error } = await supabase.rpc('transfer_ownership', {
    p_project_id: projectId,
    p_new_owner_id: newOwnerId,
  });
  return { error: error?.message || null };
};

export const removePendingInvite = async (inviteId) => {
  if (!supabase) return false;
  const { error } = await supabase.from('pending_invites').delete().eq('id', inviteId);
  return !error;
};

export const updatePendingInviteRole = async (inviteId, role) => {
  if (!supabase) return { error: 'not_configured' };
  const { error } = await supabase.from('pending_invites').update({ role }).eq('id', inviteId);
  return { error: error?.message || null };
};

export const resendInvite = async (projectId, email) => {
  if (!supabase) return { success: false };
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: { email, projectId },
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
  });
  if (error) return { success: false };
  return { success: !data?.error };
};

export const getProfileById = async (userId) => {
  if (!supabase) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data;
};

export const getProfilesByIds = async (userIds) => {
  if (!supabase || !userIds.length) return {};
  const { data } = await supabase.from('profiles').select('id, display_name, email').in('id', userIds);
  return Object.fromEntries((data || []).map(p => [p.id, p.display_name || p.email || p.id]));
};
