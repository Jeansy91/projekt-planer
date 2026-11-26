import { useState, useRef, useEffect } from 'react';
import { Edit2, FileCheck, Database, RefreshCw, Download, Globe, ChevronDown, Check, HelpCircle, Cloud, CloudUpload, User, Share2, Menu, Home, Settings, LogOut, Sun, Moon, Monitor, History, Undo2, Redo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getInitials } from '../utils/avatarUtils';

const LANGUAGES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
];

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500',
];

const getAvatarColor = (userId) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const ProjectHeader = ({
  projectTitle,
  isEditingTitle,
  onEditTitle,
  onSaveTitle,
  fileHandle,
  saveStatus,
  projectId,
  onExport,
  onInfo,
  storageType,
  user,
  isSupabaseConfigured,
  isCloudAvailable,
  onAuth,
  onShare,
  onConvertToCloud,
  isAuthenticated,
  profile,
  onHome,
  onHistory,
  onSettings,
  onSignOut,
  activeUsers = [],
  canEdit = true,
  theme,
  onThemeChange,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  undoDepth = 0,
}) => {
  const { t, i18n } = useTranslation();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const langRef = useRef(null);
  const overflowRef = useRef(null);
  const accountRef = useRef(null);

  useEffect(() => {
    if (isEditingTitle) setEditingTitleValue(projectTitle);
  }, [isEditingTitle]);

  useEffect(() => {
    const handleClick = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setShowLangMenu(false);
      if (overflowRef.current && !overflowRef.current.contains(e.target)) setShowOverflowMenu(false);
      if (accountRef.current && !accountRef.current.contains(e.target)) setShowAccountMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLang = LANGUAGES.find(l => i18n.language.startsWith(l.code)) || LANGUAGES[0];

  const actions = [
    { key: 'export', icon: Download, label: t('project.actions.export'), action: onExport },
    ...(storageType === 'cloud' && user ? [
      { key: 'share', icon: Share2, label: t('share.title'), action: onShare, testId: 'share-btn' },
    ] : []),
    ...(storageType !== 'cloud' && isAuthenticated && canEdit && isCloudAvailable ? [
      { key: 'convert', icon: CloudUpload, label: t('cloud.convertToCloud'), action: onConvertToCloud, testId: 'convert-to-cloud-btn' },
    ] : []),
    { key: 'history', icon: History, label: t('project.actions.history'), action: onHistory, testId: 'history-btn' },
    { key: 'info', icon: HelpCircle, label: t('project.actions.info'), action: onInfo, testId: 'info-btn' },
  ];

  // Other active users (exclude current user)
  const otherUsers = user ? activeUsers.filter(u => u.userId !== user.id) : [];

  return (
    <header className="mb-4 shrink-0 space-y-2">
      {/* Row 1: [Home + Title] always together | [Undo/Redo + actions] wrap to new line on mobile */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Left group: Home + Title (truncated) — row 1, never wraps */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onHome}
            className="h-8 flex items-center gap-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm shrink-0"
            aria-label={t('a11y.home')}
            title={t('a11y.home')}
          >
            <Home size={14} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
          </button>

          {isEditingTitle && canEdit ? (
            <input
              autoFocus
              data-testid="project-title-input"
              className="text-2xl font-bold bg-white dark:bg-slate-800 dark:text-slate-100 border-b-2 border-blue-500 outline-none px-1 min-w-0 flex-1"
              value={editingTitleValue}
              onChange={(e) => setEditingTitleValue(e.target.value)}
              onBlur={() => { onSaveTitle(editingTitleValue); onEditTitle(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            />
          ) : (
            <h1
              data-testid="project-title"
              className={`text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 min-w-0 truncate ${canEdit ? 'cursor-pointer group' : ''}`}
              onClick={canEdit ? () => onEditTitle(true) : undefined}
            >
              <span className="truncate">{projectTitle}</span>
              {canEdit && <Edit2 size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-blue-500 shrink-0" />}
            </h1>
          )}
        </div>

        {/* Row 2 on <md: Undo/Redo left | actions right — inline on md+ */}
        <div className="flex flex-1 items-center gap-1.5 w-full md:w-auto">
          {canEdit && (
            <div className="flex gap-0.5">
              <button
                data-testid="undo-btn"
                data-undo-depth={undoDepth}
                onClick={onUndo}
                disabled={!canUndo}
                className="h-8 w-8 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-all shadow-sm enabled:hover:border-blue-300 enabled:hover:bg-blue-50 dark:enabled:hover:bg-blue-900/30 disabled:opacity-30 disabled:cursor-default"
                aria-label={t('info.shortcuts.undoDesc')}
                title={t('info.shortcuts.undoDesc')}
              >
                <Undo2 size={14} className="text-slate-500 dark:text-slate-400" aria-hidden="true" />
              </button>
              <button
                data-testid="redo-btn"
                onClick={onRedo}
                disabled={!canRedo}
                className="h-8 w-8 flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-all shadow-sm enabled:hover:border-blue-300 enabled:hover:bg-blue-50 dark:enabled:hover:bg-blue-900/30 disabled:opacity-30 disabled:cursor-default"
                aria-label={t('info.shortcuts.redoDesc')}
                title={t('info.shortcuts.redoDesc')}
              >
                <Redo2 size={14} className="text-slate-500 dark:text-slate-400" aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="flex-1" />

          {/* Action buttons — visible on md+ screens */}
          <div className="hidden md:flex gap-1.5 items-center">
          {actions.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                data-testid={item.testId}
                onClick={item.action}
                className="h-8 flex items-center gap-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm"
                aria-label={item.label}
              >
                <Icon size={14} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <span className="hidden lg:inline">{item.label}</span>
              </button>
            );
          })}
          </div>

          {/* Overflow menu — visible on small screens only */}
          <div className="relative md:hidden" ref={overflowRef}>
          <button
            data-testid="main-menu-btn"
            onClick={() => setShowOverflowMenu(prev => !prev)}
            className="h-8 flex items-center gap-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm"
            aria-label={t('a11y.menu')}
            aria-expanded={showOverflowMenu}
            aria-haspopup="true"
          >
            <Menu size={14} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <ChevronDown size={12} className={`opacity-50 transition-transform ${showOverflowMenu ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {showOverflowMenu && (
            <div data-testid="main-menu" role="menu" className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-xl py-2 z-[100] min-w-[200px] animate-in fade-in zoom-in-95 duration-150 origin-top-right">
              {actions.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    role="menuitem"
                    data-testid={item.testId}
                    onClick={() => { item.action(); setShowOverflowMenu(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-3 transition-colors"
                  >
                    <Icon size={14} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
          </div>

          {/* Theme toggle */}
          {onThemeChange && (
            <button
              onClick={() => onThemeChange(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
              className="h-8 flex items-center gap-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm shrink-0"
              aria-label={t('settings.display.theme')}
              title={t('settings.display.theme')}
            >
              {theme === 'light' ? <Sun size={14} className="text-amber-500" /> : theme === 'dark' ? <Moon size={14} className="text-blue-400" /> : <Monitor size={14} className="text-slate-400 dark:text-slate-500" />}
            </button>
          )}

          {/* Language switcher */}
          <div className="relative" ref={langRef}>
          <button
            data-testid="language-toggle"
            onClick={() => setShowLangMenu(prev => !prev)}
            className="h-8 flex items-center gap-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm"
            aria-label={t('a11y.languageMenu')}
            aria-expanded={showLangMenu}
            aria-haspopup="true"
          >
            <Globe size={14} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <span>{currentLang.code.toUpperCase()}</span>
            <ChevronDown size={12} className={`opacity-50 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          {showLangMenu && (
            <div data-testid="language-menu" role="listbox" aria-label={t('a11y.languageMenu')} className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-xl p-3 z-[100] min-w-[180px] animate-in fade-in zoom-in-95 duration-150 origin-top-right">
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-1">{t('language.title')}</div>
              <div className="space-y-1">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    role="option"
                    aria-selected={i18n.language.startsWith(lang.code)}
                    data-testid={`lang-option-${lang.code}`}
                    onClick={() => { i18n.changeLanguage(lang.code); setShowLangMenu(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex justify-between items-center transition-colors ${
                      i18n.language.startsWith(lang.code)
                        ? 'bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-6 h-4 flex items-center justify-center rounded text-[10px] font-bold ${i18n.language.startsWith(lang.code) ? 'bg-blue-200 dark:bg-blue-700/40 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{lang.code.toUpperCase()}</span>
                      {lang.label}
                    </span>
                    {i18n.language.startsWith(lang.code) && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>

          {/* Auth button / Account dropdown */}
          {isSupabaseConfigured && (
            user ? (
              <div className="relative" ref={accountRef}>
                <button
                  data-testid="auth-btn"
                  onClick={() => setShowAccountMenu(prev => !prev)}
                  className="h-8 flex items-center gap-1.5 pl-1.5 pr-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all shadow-sm"
                  aria-label={t('a11y.accountMenu')}
                  aria-expanded={showAccountMenu}
                  aria-haspopup="true"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile?.display_name || user.email} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300" aria-hidden="true">
                      {getInitials(profile?.display_name || user.email)}
                    </span>
                  )}
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 hidden sm:inline max-w-[80px] truncate">
                    {profile?.display_name || user.email?.split('@')[0] || '?'}
                  </span>
                  <ChevronDown size={11} className={`text-slate-400 dark:text-slate-500 transition-transform ${showAccountMenu ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {showAccountMenu && (
                  <div role="menu" className="absolute right-0 top-full mt-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-xl py-2 z-[100] min-w-[180px] animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                    <button
                      role="menuitem"
                      onClick={() => { setShowAccountMenu(false); onSettings?.(); }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-3 transition-colors"
                    >
                      <Settings size={14} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                      {t('settings.title')}
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => { setShowAccountMenu(false); onSignOut?.(); }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-3 transition-colors"
                    >
                      <LogOut size={14} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                      {t('auth.signOut')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                data-testid="auth-btn"
                onClick={onAuth}
                disabled={!isCloudAvailable}
                className="h-8 flex items-center gap-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:cursor-not-allowed disabled:opacity-50 transition-all text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm"
                aria-label={t('a11y.signIn')}
              >
                <User size={14} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
              </button>
            )
          )}
        </div>{/* end right group */}
      </div>

      {/* Row 2: Storage badge (left) + Active members (right) */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md w-fit ${storageType === 'cloud' ? 'bg-purple-100 dark:bg-purple-800/30 text-purple-700 dark:text-purple-300' : fileHandle ? 'bg-emerald-100 dark:bg-emerald-800/30 text-emerald-700 dark:text-emerald-300' : 'bg-blue-100 dark:bg-blue-800/30 text-blue-700 dark:text-blue-300'}`} aria-live="polite">
          {storageType === 'cloud' ? (
            <>
              <Cloud size={12} aria-hidden="true" /> {t('cloud.badge')} ({projectId.slice(0, 8)}) {saveStatus === 'saving' && <RefreshCw size={10} className="animate-spin" aria-label={t('a11y.saving')} />}
            </>
          ) : fileHandle ? (
            <>
              <FileCheck size={12} aria-hidden="true" /> {fileHandle.name} {saveStatus === 'saving' && <RefreshCw size={10} className="animate-spin" aria-label={t('a11y.saving')} />}
            </>
          ) : (
            <>
              <Database size={12} aria-hidden="true" /> {t('project.storageBadge.localStorage', { id: projectId.slice(0, 8) })}
            </>
          )}
        </div>

        {/* Active members — small avatars */}
        {otherUsers.length > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
            <div className="flex -space-x-1.5">
              {otherUsers.slice(0, 5).map((u) => {
                const initial = getInitials(u.displayName);
                const color = getAvatarColor(u.userId);
                return u.avatarUrl ? (
                  <img
                    key={u.userId}
                    src={u.avatarUrl}
                    alt={u.displayName || u.email}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-white"
                    title={u.displayName || u.email}
                  />
                ) : (
                  <div
                    key={u.userId}
                    className={`w-5 h-5 rounded-full ${color} flex items-center justify-center text-[9px] font-bold text-white ring-1 ring-white`}
                    title={u.displayName || u.email}
                  >
                    {initial}
                  </div>
                );
              })}
              {otherUsers.length > 5 && (
                <div className="w-5 h-5 rounded-full bg-slate-400 flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-white">
                  +{otherUsers.length - 5}
                </div>
              )}
            </div>
            <span>{t('a11y.activeUsers', { count: otherUsers.length })}</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default ProjectHeader;
