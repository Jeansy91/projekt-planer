import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Sun, Moon, Monitor, Globe, ChevronDown, Check, LogOut } from 'lucide-react';
import { getInitials } from '../../utils/avatarUtils';
import AccountSection from './AccountSection';

import SecuritySection from './SecuritySection';

const LANGUAGES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
];

const SettingsPage = ({
  user,
  profile,
  theme,
  onThemeChange,

  onUpdateProfile,
  onUploadAvatar,
  onRemoveAvatar,
  onUpdatePassword,
  onUpdateEmail,
  onDeleteAccount,
  onGetMfaFactors,
  onEnrollMfa,
  onVerifyMfa,
  onUnenrollMfa,
  onVerifyPassword,
  onSignOut,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountRef = useRef(null);
  const langRef = useRef(null);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || '';

  useEffect(() => {
    const handleClick = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setShowAccountMenu(false);
      if (langRef.current && !langRef.current.contains(e.target)) setShowLangMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100">
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex justify-between items-center">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="h-8 flex items-center gap-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm"
              aria-label={t('settings.back')}
            >
              <ArrowLeft size={14} className="text-slate-400 dark:text-slate-500" />
            </button>
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-200">{t('settings.title')}</h1>
          </div>

          {/* Right: Theme toggle, Language, Account */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => onThemeChange(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
              className="h-8 flex items-center gap-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm"
              aria-label={t('settings.display.theme')}
            >
              {theme === 'light' ? <Sun size={14} className="text-amber-500" /> : theme === 'dark' ? <Moon size={14} className="text-blue-400" /> : <Monitor size={14} className="text-slate-400 dark:text-slate-500" />}
            </button>

            {/* Language selector */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setShowLangMenu(prev => !prev)}
                className="h-8 flex items-center gap-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm"
                aria-label={t('a11y.languageMenu')}
                aria-expanded={showLangMenu}
                aria-haspopup="listbox"
              >
                <Globe size={14} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <span>{(LANGUAGES.find(l => i18n.language.startsWith(l.code)) || LANGUAGES[0]).code.toUpperCase()}</span>
                <ChevronDown size={11} className={`opacity-40 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {showLangMenu && (
                <div role="listbox" aria-label={t('a11y.languageMenu')} className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1.5 z-50 min-w-[140px]">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      role="option"
                      aria-selected={i18n.language.startsWith(lang.code)}
                      onClick={() => { i18n.changeLanguage(lang.code); setShowLangMenu(false); }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex justify-between items-center transition-colors ${i18n.language.startsWith(lang.code) ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      {lang.label}
                      {i18n.language.startsWith(lang.code) && <Check size={12} aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Account menu */}
            <div className="relative" ref={accountRef}>
              <button
                onClick={() => setShowAccountMenu(prev => !prev)}
                className="h-8 flex items-center gap-1.5 pl-1.5 pr-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all shadow-sm"
                aria-label={t('a11y.accountMenu')}
                aria-expanded={showAccountMenu}
                aria-haspopup="true"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300" aria-hidden="true">
                    {getInitials(displayName)}
                  </span>
                )}
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 hidden sm:inline">{displayName}</span>
                <ChevronDown size={11} className={`text-slate-400 dark:text-slate-500 transition-transform ${showAccountMenu ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {showAccountMenu && (
                <div role="menu" className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-2 z-50 min-w-[180px]">
                  <button
                    role="menuitem"
                    onClick={() => { setShowAccountMenu(false); onSignOut(); navigate('/'); }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 flex items-center gap-3 transition-colors"
                  >
                    <LogOut size={14} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                    {t('auth.signOut')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <AccountSection
          user={user}
          profile={profile}
          onUpdateProfile={onUpdateProfile}
          onUploadAvatar={onUploadAvatar}
          onRemoveAvatar={onRemoveAvatar}
        />
        <SecuritySection
          user={user}
          onUpdateEmail={onUpdateEmail}
          onUpdatePassword={onUpdatePassword}
          onDeleteAccount={onDeleteAccount}
          onGetMfaFactors={onGetMfaFactors}
          onEnrollMfa={onEnrollMfa}
          onVerifyMfa={onVerifyMfa}
          onUnenrollMfa={onUnenrollMfa}
          onVerifyPassword={onVerifyPassword}
          onSignOut={onSignOut}
        />
      </div>
    </div>
  );
};

export default SettingsPage;
