import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Cloud, Database, Share2, Globe, ChevronDown, Check, FolderOpen, Upload, ArrowRight, LogOut, Trash2, Settings, Sun, Moon, Monitor } from 'lucide-react';
import { NewProjectDialog, DeleteConfirmDialog } from './dialogs';
import { getInitials } from '../utils/avatarUtils';
import LicenseNotice from './LicenseNotice';
import { loadProjectList, deleteProjectFromLS } from '../utils/localStorage';

const LANGUAGES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
];

const Dashboard = ({
  user, profile, isAuthenticated,
  onSignOut, onNewLocal, onNewCloud, onNewFile, onOpenFile, onPickAndOpenFile,
  onLoadLocal, onLoadCloud, onDeleteCloud,
  onRefreshProjects,
  isFileSystemApiSupported,
  isCloudAvailable,
  theme, onThemeChange,
  localProjects: initialLocalProjects,
  cloudProjects,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [localProjects, setLocalProjects] = useState(initialLocalProjects);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingDeleteType, setPendingDeleteType] = useState('local');
  const accountRef = useRef(null);
  const currentLang = LANGUAGES.find(l => i18n.language.startsWith(l.code)) || LANGUAGES[0];
  const currentLocale = i18n.language === 'en' ? 'en-GB' : 'de-DE';

  // Sync local projects when parent refreshes (e.g. navigating back)
  useEffect(() => {
    setLocalProjects(initialLocalProjects);
  }, [initialLocalProjects]);

  // Fetch cloud projects when Dashboard mounts
  useEffect(() => {
    onRefreshProjects?.();
  }, [onRefreshProjects]);

  useEffect(() => {
    const handleClick = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) setShowAccountMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const displayName = profile?.display_name || user?.email || '?';

  const handleNewClick = () => {
    setLocalProjects(loadProjectList());
    setShowNewDialog(true);
  };

  const handleNewLS = () => {
    onNewLocal();
    setShowNewDialog(false);
  };

  const handleNewFile = () => {
    onNewFile();
    setShowNewDialog(false);
  };

  const handleNewCloud = async () => {
    const id = await onNewCloud();
    if (id) navigate(`/project/${id}`);
    setShowNewDialog(false);
  };

  const handleDeleteRequest = (e, id, type = 'local') => {
    e.stopPropagation();
    setPendingDeleteId(id);
    setPendingDeleteType(type);
  };

  const handleDeleteConfirm = async () => {
    if (pendingDeleteType === 'cloud') {
      await onDeleteCloud(pendingDeleteId);
    } else {
      deleteProjectFromLS(pendingDeleteId);
    }
    setLocalProjects(loadProjectList());
    setPendingDeleteId(null);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        onOpenFile(JSON.parse(event.target.result));
      } catch (err) {
        console.error('Import failed', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const canDeleteCloud = (p) => p.role === 'owner' || p.role === 'admin';

  const sortedCloudProjects = [...cloudProjects].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  const sortedLocalProjects = [...localProjects].sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col">
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileInput} />
      {/* ── Navbar ────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.png" alt={t('a11y.logo')} className="w-7 h-7 rounded-lg" />
            <span className="text-base font-bold text-slate-800 dark:text-slate-200">Projekt-Planer</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            {onThemeChange && (
              <button
                onClick={() => onThemeChange(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
                className="h-8 flex items-center gap-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm"
                aria-label={t('settings.display.theme')}
            >
                {theme === 'light' ? <Sun size={14} className="text-amber-500" /> : theme === 'dark' ? <Moon size={14} className="text-blue-400" /> : <Monitor size={14} className="text-slate-400 dark:text-slate-500" />}
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(prev => !prev)}
                className="h-8 flex items-center gap-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm"
                aria-label={t('a11y.languageMenu')}
                aria-expanded={showLangMenu}
                aria-haspopup="listbox"
              >
                <Globe size={14} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                <span>{currentLang.code.toUpperCase()}</span>
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
                    onClick={() => { setShowAccountMenu(false); navigate('/settings'); }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-3 transition-colors"
                  >
                    <Settings size={14} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
                    {t('settings.title')}
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => { setShowAccountMenu(false); onSignOut(); }}
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

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('dashboard.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('dashboard.subtitle')}</p>
        </div>

        {/* ── Section 1: Open Project ──────────────────────────────── */}
        <section>
          <h2 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">{t('dashboard.openProject')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              data-testid="dashboard-new-project"
              onClick={handleNewClick}
              className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all text-left group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center shrink-0">
                <Plus size={15} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="font-semibold text-sm text-slate-700 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-400">{t('project.actions.new')}</div>
            </button>
            {isFileSystemApiSupported && (
              <button
                onClick={onPickAndOpenFile}
                className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-600 transition-all text-left group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center shrink-0">
                  <FolderOpen size={15} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="font-semibold text-sm text-slate-700 dark:text-slate-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">{t('dialogs.openProject.openFile')}</div>
              </button>
            )}
            <button
              onClick={() => fileInputRef.current.click()}
              className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600 transition-all text-left group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center shrink-0">
                <Upload size={15} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div className="font-semibold text-sm text-slate-700 dark:text-slate-300 group-hover:text-amber-700 dark:group-hover:text-amber-400">{t('dialogs.openProject.jsonImport')}</div>
            </button>
          </div>
        </section>

        {/* ── Section 2: Cloud Projects ────────────────────────────── */}
        <section aria-disabled={!isCloudAvailable}>
          <h2 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Cloud size={11} /> {t('cloud.cloudProjects')}
          </h2>
          {!isCloudAvailable ? (
            <p aria-live="polite" className="text-sm text-slate-400 dark:text-slate-500">{t('offline.cloudUnavailable')}</p>
          ) : sortedCloudProjects.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">{t('dashboard.noCloudProjects')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedCloudProjects.map(p => {
                const isShared = p.shared;
                const canDelete = canDeleteCloud(p);
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${t('a11y.openProject')}: ${p.title}`}
                    onClick={() => onLoadCloud(p.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLoadCloud(p.id); } }}
                    className={`flex items-start gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-all text-left group cursor-pointer ${isShared ? 'hover:border-indigo-300 dark:hover:border-indigo-600' : 'hover:border-purple-300 dark:hover:border-purple-600'}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isShared ? 'bg-indigo-100 dark:bg-indigo-800/30' : 'bg-purple-100 dark:bg-purple-800/30'}`}>
                      {isShared ? <Share2 size={15} className="text-indigo-600 dark:text-indigo-400" /> : <Cloud size={15} className="text-purple-600 dark:text-purple-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 min-w-0 ${isShared ? 'group-hover:text-indigo-700 dark:group-hover:text-indigo-400' : 'group-hover:text-purple-700 dark:group-hover:text-purple-400'}`}>
                        <span className="truncate" title={p.title}>{p.title}</span>
                        {isShared && <span className="text-[9px] bg-indigo-100 dark:bg-indigo-800/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">{p.role}</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('dialogs.openProject.lastModified', { date: new Date(p.updated_at).toLocaleString(currentLocale) })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mt-1">
                      {canDelete && (
                        <button
                          onClick={(e) => handleDeleteRequest(e, p.id, 'cloud')}
                          className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                          aria-label={`${t('a11y.deleteProject')}: ${p.title}`}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      )}
                      <ArrowRight size={14} className={`transition-colors ${isShared ? 'text-slate-300 dark:text-slate-600 group-hover:text-indigo-400' : 'text-slate-300 dark:text-slate-600 group-hover:text-purple-400'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Section 3: Local Projects ────────────────────────────── */}
        <section>
          <h2 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Database size={11} /> {t('dialogs.openProject.localProjects')}
          </h2>
          {sortedLocalProjects.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">{t('dashboard.noLocalProjects')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedLocalProjects.map(p => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${t('a11y.openProject')}: ${p.title}`}
                  onClick={() => onLoadLocal(p.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLoadLocal(p.id); } }}
                  className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all text-left group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-800/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Database size={15} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-700 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate" title={p.title}>{p.title}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {t('dialogs.openProject.lastModified', { date: new Date(p.lastModified).toLocaleString(currentLocale) })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 mt-1">
                    <button
                      onClick={(e) => handleDeleteRequest(e, p.id, 'local')}
                      className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
                      aria-label={`${t('a11y.deleteProject')}: ${p.title}`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                    <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 dark:border-slate-700/50 py-6 mt-auto">
        <LicenseNotice className="text-center text-xs text-slate-400 dark:text-slate-500" />
      </footer>

      {/* ── Dialogs ───────────────────────────────────────────────── */}
      <NewProjectDialog
        show={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onNewLS={handleNewLS}
        onNewFile={handleNewFile}
        onNewCloud={handleNewCloud}
        isFileSystemApiSupported={isFileSystemApiSupported}
        isAuthenticated={isAuthenticated}
        isCloudAvailable={isCloudAvailable}
      />

      <DeleteConfirmDialog
        show={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        message={t('dialogs.delete.projectMessage')}
      />
    </div>
  );
};

export default Dashboard;
