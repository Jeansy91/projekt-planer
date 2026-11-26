import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Check } from 'lucide-react';
import { getInitials } from '../../utils/avatarUtils';

const AccountSection = ({ user, profile, onUpdateProfile, onUploadAvatar, onRemoveAvatar }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [nameSaved, setNameSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile]);

  const handleSaveName = useCallback(async () => {
    if (!displayName.trim()) return;
    await onUpdateProfile({ display_name: displayName.trim() });
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }, [displayName, onUpdateProfile]);

  const handleAvatarUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    await onUploadAvatar(file);
    setAvatarUploading(false);
  }, [onUploadAvatar]);

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">{t('settings.account.title')}</h2>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative group">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center text-xl font-bold text-blue-700 dark:text-blue-300">
              {getInitials(profile?.display_name || user?.email)}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors"
          >
            <Camera size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('settings.account.avatar')}</p>
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="h-8 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {avatarUploading ? '...' : t('settings.account.uploadAvatar')}
            </button>
            {profile?.avatar_url && (
              <button
                onClick={onRemoveAvatar}
                className="h-8 px-3 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-xs font-bold transition-colors"
              >
                {t('settings.account.removeAvatar')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Display Name */}
      <form onSubmit={(e) => { e.preventDefault(); handleSaveName(); }} className="space-y-2 max-w-md">
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">{t('settings.account.displayName')}</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t('settings.account.displayNamePlaceholder')}
          autoComplete="name"
          className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-800/30"
        />
        <button
          type="submit"
          disabled={!displayName.trim() || displayName.trim() === profile?.display_name}
          className="h-9 px-4 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {nameSaved ? <><Check size={13} /> {t('settings.account.saved')}</> : t('settings.account.save')}
        </button>
      </form>
    </section>
  );
};

export default AccountSection;
