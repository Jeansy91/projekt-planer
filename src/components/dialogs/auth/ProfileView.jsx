import { useState, useCallback } from 'react';
import { LogOut, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getInitials } from '../../../utils/avatarUtils';

const ProfileView = ({ user, profile, onSignOut, onUpdateProfile }) => {
  const { t } = useTranslation();
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  const handleSaveName = useCallback(async () => {
    if (editName.trim()) {
      await onUpdateProfile({ display_name: editName.trim() });
    }
    setEditingName(false);
  }, [editName, onUpdateProfile]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
          {getInitials(profile?.display_name || profile?.email)}
        </div>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex gap-1">
              <input
                className="text-sm font-semibold border dark:border-slate-600 rounded px-2 py-0.5 flex-1 bg-white dark:bg-slate-700 dark:text-slate-100"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                autoComplete="name"
                autoFocus
              />
              <button onClick={handleSaveName} className="text-blue-500 hover:text-blue-700" aria-label={t('a11y.save')} title={t('a11y.save')}><Check size={16} /></button>
            </div>
          ) : (
            <div
              className="text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:text-blue-600 truncate"
              onClick={() => { setEditName(profile?.display_name || ''); setEditingName(true); }}
            >
              {profile?.display_name || t('auth.unnamed')}
            </div>
          )}
          <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{user.email}</div>
        </div>
      </div>
      <button
        onClick={onSignOut}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors"
      >
        <LogOut size={16} />
        {t('auth.signOut')}
      </button>
    </div>
  );
};

export default ProfileView;
