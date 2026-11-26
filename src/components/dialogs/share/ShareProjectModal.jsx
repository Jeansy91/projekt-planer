import { useState, useEffect } from 'react';
import { X, Share2, UserPlus, Trash2, Loader2, Crown, Eye, Clock, Mail, LogOut, ArrowRightLeft, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RoleDropdown, { ROLE_ICONS } from './RoleDropdown';
import MemberRow from './MemberRow';
import ConfirmOverlay from './ConfirmOverlay';
import { getInitials } from '../../../utils/avatarUtils';

const ROLES = ['editor', 'viewer', 'admin'];

const ShareProjectModal = ({ show, onClose, projectId, ownerId, currentUserId, onGetMembers, onGetOwnerProfile, onInvite, onRemoveMember, onUpdateMemberRole, onTransferOwnership, onGetPendingInvites, onRemovePendingInvite, onUpdatePendingInviteRole, onResendInvite }) => {
  const { t } = useTranslation();
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [currentOwnerId, setCurrentOwnerId] = useState(ownerId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [loading, setLoading] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [inviteResult, setInviteResult] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    if (!show || !projectId) return;
    setCurrentOwnerId(ownerId);
    let cancelled = false;
    onGetMembers(projectId).then(data => { if (!cancelled) setMembers(data); });
    if (onGetPendingInvites) onGetPendingInvites(projectId).then(data => { if (!cancelled) setPendingInvites(data); });
    if (onGetOwnerProfile && ownerId) onGetOwnerProfile(ownerId).then(data => { if (!cancelled) setOwnerProfile(data); });
    return () => { cancelled = true; };
  }, [show, projectId, ownerId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null;

  const isOwner = currentUserId === currentOwnerId;
  const currentMember = members.find(m => m.userId === currentUserId);
  const isAdmin = currentMember?.role === 'admin';
  const canManage = isOwner || isAdmin;

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setInviteResult(null);
    const result = await onInvite(projectId, email.trim(), role);
    setLoading(false);
    if (result.success) {
      setEmail('');
      if (result.pending) {
        setInviteResult({ type: 'success', message: t('share.inviteSent', { email: result.email }) });
        if (onGetPendingInvites) onGetPendingInvites(projectId).then(setPendingInvites);
      } else {
        setInviteResult({ type: 'success', message: t('share.invited') });
        const updated = await onGetMembers(projectId);
        setMembers(updated);
      }
    } else {
      const errorKey = result.error === 'cannot_invite_self' ? 'share.cannotInviteSelf'
        : result.error === 'email_failed' ? 'share.emailFailed' : 'share.inviteError';
      setInviteResult({ type: 'error', message: t(errorKey) });
    }
  };

  const handleRemove = async (userId) => {
    await onRemoveMember(projectId, userId);
    setMembers(prev => prev.filter(m => m.userId !== userId));
    setConfirmAction(null);
    if (userId === currentUserId) onClose();
  };

  const handleRemovePending = async (inviteId) => {
    if (onRemovePendingInvite) {
      await onRemovePendingInvite(inviteId);
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    }
    setConfirmAction(null);
  };

  const handleResend = async (inviteId, inviteEmail) => {
    if (!onResendInvite) return;
    setResendingId(inviteId);
    const result = await onResendInvite(projectId, inviteEmail);
    setResendingId(null);
    setInviteResult({
      type: result.success ? 'success' : 'error',
      message: t(result.success ? 'share.resendSuccess' : 'share.resendError'),
    });
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!onUpdateMemberRole) return;
    const { error } = await onUpdateMemberRole(projectId, userId, newRole);
    if (!error) {
      setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role: newRole } : m));
    }
  };

  const handlePendingRoleChange = async (inviteId, newRole) => {
    if (!onUpdatePendingInviteRole) return;
    const { error } = await onUpdatePendingInviteRole(inviteId, newRole);
    if (!error) {
      setPendingInvites(prev => prev.map(i => i.id === inviteId ? { ...i, role: newRole } : i));
    }
  };

  const handleTransferOwnership = async (newOwnerId) => {
    if (!onTransferOwnership) return;
    const { error } = await onTransferOwnership(projectId, newOwnerId);
    if (!error) {
      setCurrentOwnerId(newOwnerId);
      const updated = await onGetMembers(projectId);
      setMembers(updated);
      if (onGetOwnerProfile) {
        const profile = await onGetOwnerProfile(newOwnerId);
        setOwnerProfile(profile);
      }
    }
    setConfirmAction(null);
  };

  const getConfirmContent = () => {
    if (!confirmAction) return null;
    switch (confirmAction.type) {
      case 'remove':
        return {
          icon: <Trash2 size={20} className="text-red-500" />,
          iconBg: 'bg-red-100',
          message: t('share.removeConfirm', { name: confirmAction.name }),
          confirmLabel: t('share.removeBtn'),
          confirmClass: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white',
          onConfirm: () => handleRemove(confirmAction.userId),
        };
      case 'removePending':
        return {
          icon: <Trash2 size={20} className="text-red-500" />,
          iconBg: 'bg-red-100',
          message: t('share.removeConfirm', { name: confirmAction.name }),
          confirmLabel: t('share.removeBtn'),
          confirmClass: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white',
          onConfirm: () => handleRemovePending(confirmAction.id),
        };
      case 'leave':
        return {
          icon: <LogOut size={20} className="text-red-500" />,
          iconBg: 'bg-red-100',
          message: t('share.leaveConfirm'),
          confirmLabel: t('share.leaveBtn'),
          confirmClass: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white',
          onConfirm: () => handleRemove(currentUserId),
        };
      case 'transfer':
        return {
          icon: <ArrowRightLeft size={20} className="text-amber-500" />,
          iconBg: 'bg-amber-100',
          message: t('share.transferConfirm', { name: confirmAction.name }),
          confirmLabel: t('share.transferBtn'),
          confirmClass: 'bg-amber-500 hover:bg-amber-600 text-white',
          onConfirm: () => handleTransferOwnership(confirmAction.userId),
        };
      default:
        return null;
    }
  };

  return (
    <div data-testid="share-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 relative">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-blue-50/60 dark:bg-blue-900/20">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center shrink-0">
                <Share2 size={18} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">{t('share.dialogTitle')}</h3>
            </div>
            <button data-testid="share-close-btn" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label={t('a11y.close')}><X size={16} aria-hidden="true" /></button>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Invite form */}
          {canManage && (
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t('share.invite')}</div>
              <div className="flex gap-2">
                <input
                  data-testid="share-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('share.emailPlaceholder')}
                  autoComplete="email"
                  className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700"
                  required
                />
                <RoleDropdown value={role} onChange={setRole} roles={ROLES} t={t} />
              </div>
              <button
                data-testid="share-invite-btn"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                {t('share.sendInvite')}
              </button>
              {inviteResult && (
                <div className={`text-xs ${inviteResult.type === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
                  {inviteResult.message}
                </div>
              )}
            </form>
          )}

          {/* Members list */}
          <div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">{t('share.members')}</div>
            <div className="space-y-2">
              {(() => {
                const ownerEntry = ownerProfile ? {
                  userId: currentOwnerId,
                  displayName: ownerProfile.display_name || ownerProfile.email,
                  email: ownerProfile.email,
                } : null;
                const allEmpty = !ownerEntry && members.length === 0 && pendingInvites.length === 0;
                if (allEmpty) {
                  return <div className="text-sm text-slate-400 text-center py-4">{t('share.noMembers')}</div>;
                }
                return (
                  <>
                    {ownerEntry && (
                      <MemberRow
                        avatar={getInitials(ownerEntry.displayName)}
                        avatarUrl={ownerProfile?.avatar_url}
                        avatarBg="bg-blue-100 dark:bg-blue-800/30" avatarText="text-blue-600 dark:text-blue-400"
                        name={ownerEntry.displayName}
                        subtitle={ownerEntry.email}
                        bg="bg-blue-50/50 dark:bg-blue-900/20"
                        right={
                          <div className="flex items-center gap-1 text-xs text-blue-500 font-medium">
                            <Crown size={12} />
                            {t('share.roleOwner')}
                          </div>
                        }
                      />
                    )}

                    {members.map(m => {
                      const RoleIcon = ROLE_ICONS[m.role] || Eye;
                      const isSelf = m.userId === currentUserId;
                      const canChangeRole = canManage && !isSelf && (isOwner || m.role !== 'admin');
                      const canRemove = isOwner || (isAdmin && m.role !== 'admin');
                      const canTransfer = isOwner && !isSelf;

                      return (
                        <MemberRow
                          key={m.userId}
                          avatar={getInitials(m.displayName || m.email)}
                          avatarUrl={m.avatarUrl}
                          avatarBg="bg-slate-100 dark:bg-slate-700" avatarText="text-slate-500 dark:text-slate-400"
                          name={
                            <>
                              {m.displayName || m.email}
                              {isSelf && <span className="text-xs text-slate-400 ml-1">({t('share.you')})</span>}
                            </>
                          }
                          subtitle={m.email}
                          right={
                            <>
                              {canChangeRole ? (
                                <RoleDropdown
                                  value={m.role}
                                  onChange={(newRole) => handleRoleChange(m.userId, newRole)}
                                  roles={ROLES}
                                  t={t}
                                />
                              ) : (
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                  <RoleIcon size={12} />
                                  {t(`share.role${m.role.charAt(0).toUpperCase() + m.role.slice(1)}`)}
                                </div>
                              )}
                              {canTransfer && (
                                <button
                                  onClick={() => setConfirmAction({ type: 'transfer', userId: m.userId, name: m.displayName || m.email })}
                                  className="text-slate-300 hover:text-amber-500"
                                  title={t('share.transferOwnership')}
                                >
                                  <ArrowRightLeft size={14} />
                                </button>
                              )}
                              {canRemove && !isSelf && (
                                <button
                                  onClick={() => setConfirmAction({ type: 'remove', userId: m.userId, name: m.displayName || m.email })}
                                  className="text-slate-300 hover:text-red-500"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </>
                          }
                        />
                      );
                    })}

                    {pendingInvites.map(inv => (
                      <MemberRow
                        key={inv.id}
                        avatar={<Mail size={14} />}
                        avatarBg="bg-amber-100 dark:bg-amber-800/30" avatarText="text-amber-600 dark:text-amber-400"
                        name={inv.email}
                        subtitle={
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Clock size={10} /> {t('share.pending')}
                          </span>
                        }
                        bg="bg-amber-50/50 dark:bg-amber-900/20"
                        border="border border-amber-100 dark:border-amber-800/30"
                        right={
                          <>
                            {canManage ? (
                              <RoleDropdown
                                value={inv.role}
                                onChange={(newRole) => handlePendingRoleChange(inv.id, newRole)}
                                roles={ROLES}
                                t={t}
                              />
                            ) : (
                              <div className="flex items-center gap-1 text-xs text-slate-400">
                                {t(`share.role${inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}`)}
                              </div>
                            )}
                            {canManage && (
                              <>
                                <button
                                  onClick={() => handleResend(inv.id, inv.email)}
                                  disabled={resendingId === inv.id}
                                  className="text-slate-300 hover:text-blue-500 disabled:opacity-50"
                                  title={t('share.resend')}
                                >
                                  {resendingId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                </button>
                                <button onClick={() => setConfirmAction({ type: 'removePending', id: inv.id, name: inv.email })} className="text-slate-300 hover:text-red-500">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </>
                        }
                      />
                    ))}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Leave project */}
          {!isOwner && currentMember && (
            <button
              onClick={() => setConfirmAction({ type: 'leave' })}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors"
            >
              <LogOut size={16} />
              {t('share.leaveProject')}
            </button>
          )}
        </div>

        <ConfirmOverlay content={getConfirmContent()} onCancel={() => setConfirmAction(null)} />
      </div>
    </div>
  );
};

export default ShareProjectModal;
