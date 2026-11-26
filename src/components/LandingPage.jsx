import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Plus, Cloud, FolderOpen, BarChart3, Users, Upload, Globe, ChevronDown, Check, LogIn, Moon, Sun, Monitor } from 'lucide-react';
import { NewProjectDialog, OpenProjectDialog, DeleteConfirmDialog } from './dialogs';
import LicenseNotice from './LicenseNotice';
import { loadProjectList, deleteProjectFromLS } from '../utils/localStorage';

const LANGUAGES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
];

const FEATURES = [
  { icon: BarChart3, color: 'blue', key: 'featureGantt', screenshot: '/screenshots/gantt-overview.png', screenshotDark: '/screenshots/gantt-overview-dark.png' },
  { icon: Users, color: 'emerald', key: 'featureTeams', screenshot: '/screenshots/swimlane-view.png', screenshotDark: '/screenshots/swimlane-view-dark.png' },
  { icon: Cloud, color: 'violet', key: 'featureCloud', screenshot: '/screenshots/cloud-collab.png', screenshotDark: '/screenshots/cloud-collab-dark.png' },
  { icon: Upload, color: 'yellow', key: 'featureExport', screenshot: '/screenshots/import-export.png', screenshotDark: '/screenshots/import-export-dark.png' },
  { icon: Moon, color: 'slate', key: 'featureDarkMode' },
];

const FEATURE_COLORS = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', ring: 'ring-blue-200 dark:ring-blue-800', icon: 'bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400', accent: 'text-blue-600 dark:text-blue-400' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', ring: 'ring-emerald-200 dark:ring-emerald-800', icon: 'bg-emerald-100 dark:bg-emerald-800/30 text-emerald-600 dark:text-emerald-400', accent: 'text-emerald-600 dark:text-emerald-400' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', ring: 'ring-violet-200 dark:ring-violet-800', icon: 'bg-violet-100 dark:bg-violet-800/30 text-violet-600 dark:text-violet-400', accent: 'text-violet-600 dark:text-violet-400' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', ring: 'ring-yellow-200 dark:ring-yellow-800', icon: 'bg-yellow-100 dark:bg-yellow-800/30 text-yellow-600 dark:text-yellow-400', accent: 'text-yellow-600 dark:text-yellow-400' },
  slate: { bg: 'bg-slate-50 dark:bg-slate-800', ring: 'ring-slate-200 dark:ring-slate-700', icon: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400', accent: 'text-slate-600 dark:text-slate-400' },
};

const DarkModeSplitPreview = () => (
  <div className="rounded-xl overflow-hidden shadow-xl ring-1 ring-slate-200 dark:ring-slate-700 relative">
    {/* Left image (full background) — dark in light mode, light in dark mode */}
    <img src="/screenshots/dark-mode-dark.png" alt="Dark Mode" className="w-full block dark:hidden" />
    <img src="/screenshots/dark-mode-light.png" alt="Light Mode" className="w-full hidden dark:block" />
    {/* Right image (clipped diagonally) — light in light mode, dark in dark mode */}
    <div className="absolute inset-0" style={{ clipPath: 'polygon(40% 0, 100% 0, 100% 100%, 60% 100%)' }}>
      <img src="/screenshots/dark-mode-light.png" alt="Light Mode" className="w-full h-full object-cover dark:hidden" />
      <img src="/screenshots/dark-mode-dark.png" alt="Dark Mode" className="w-full h-full object-cover hidden dark:block" />
    </div>
    {/* Diagonal divider */}
    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
      <line x1="40" y1="0" x2="60" y2="100" stroke="white" strokeWidth="0.5" className="dark:stroke-slate-600" />
    </svg>
  </div>
);

const LandingPage = ({ isSupabaseConfigured, isCloudAvailable, isCloudAvailabilityChecked, onAuth, onNewLocal, onNewFile, onOpenFile, onPickAndOpenFile, isFileSystemApiSupported, theme, onThemeChange }) => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [localProjects, setLocalProjects] = useState([]);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const currentLang = LANGUAGES.find(l => i18n.language.startsWith(l.code)) || LANGUAGES[0];

  // Auto-open auth modal when arriving from a project invite link
  useEffect(() => {
    if (isSupabaseConfigured && isCloudAvailabilityChecked && isCloudAvailable && (searchParams.get('project') || searchParams.get('invite_email'))) {
      onAuth(searchParams.get('invite_email'));
    }
  }, [isSupabaseConfigured, isCloudAvailable, isCloudAvailabilityChecked]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewClick = () => {
    setShowNewDialog(true);
  };

  const handleOpenClick = () => {
    setLocalProjects(loadProjectList());
    setShowOpenDialog(true);
  };

  const handleNewLS = () => {
    onNewLocal();
    setShowNewDialog(false);
  };

  const handleNewFile = () => {
    onNewFile();
    setShowNewDialog(false);
  };

  const handleLoadLocal = (id) => {
    onNewLocal(id);
    setShowOpenDialog(false);
  };

  const handleDeleteLocal = (id) => {
    setPendingDeleteId(id);
  };

  const handleDeleteConfirm = () => {
    deleteProjectFromLS(pendingDeleteId);
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
        setShowOpenDialog(false);
      } catch (err) {
        console.error('Import failed', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col">
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
              >
                <Globe size={14} className="text-slate-400 dark:text-slate-500" />
                <span>{currentLang.code.toUpperCase()}</span>
                <ChevronDown size={11} className={`opacity-40 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
              </button>
              {showLangMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1.5 z-50 min-w-[140px]">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { i18n.changeLanguage(lang.code); setShowLangMenu(false); }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium flex justify-between items-center transition-colors ${i18n.language.startsWith(lang.code) ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      {lang.label}
                      {i18n.language.startsWith(lang.code) && <Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isSupabaseConfigured && (
              <button
                onClick={onAuth}
                disabled={!isCloudAvailable}
                className="h-8 flex items-center gap-2 px-3 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition-colors text-xs font-semibold"
              >
                <LogIn size={13} />
                {t('landing.signIn')}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 dark:from-blue-950/20 to-white dark:to-slate-900 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-10 sm:pb-12 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
            {t('landing.welcome')}
          </h1>
          <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 max-w-xl mx-auto mb-8">
            {t('landing.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <button
              data-testid="landing-new-project"
              onClick={handleNewClick}
              className="h-10 w-full sm:w-auto px-5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              <Plus size={16} /> {t('project.actions.new')}
            </button>
            <button
              data-testid="landing-open-project"
              onClick={handleOpenClick}
              className="h-10 w-full sm:w-auto px-5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <FolderOpen size={15} /> {t('project.actions.open')}
            </button>
          </div>
          {/* Hero screenshot */}
          <div className="relative max-w-4xl mx-auto">
            <div className="rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-200/60 dark:ring-slate-700/60">
              <img src="/screenshots/hero.png" alt="Gantt Chart" className="w-full dark:hidden" />
              <img src="/screenshots/hero-dark.png" alt="Gantt Chart" className="w-full hidden dark:block" />
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 h-8 w-3/4 bg-blue-600/5 blur-2xl rounded-full" />
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="space-y-12 sm:space-y-20">
          {FEATURES.map(({ icon: Icon, color, key, screenshot, screenshotDark }, i) => {
            const c = FEATURE_COLORS[color];
            const reversed = i % 2 === 1;
            const isDarkModeFeature = key === 'featureDarkMode';
            return (
              <div key={key} className={`flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-6 sm:gap-10 items-center`}>
                <div className="lg:w-5/12">
                  <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center mb-4`}>
                    <Icon size={20} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t(`landing.${key}`)}</h3>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{t(`landing.${key}Desc`)}</p>
                </div>
                <div className="lg:w-7/12">
                  {isDarkModeFeature ? (
                    <div className={`rounded-xl overflow-hidden shadow-xl ring-1 ${c.ring} ${c.bg} p-2`}>
                      <DarkModeSplitPreview />
                    </div>
                  ) : screenshot ? (
                    <div className={`rounded-xl overflow-hidden shadow-xl ring-1 ${c.ring} ${c.bg} p-2`}>
                      <img src={screenshot} alt={t(`landing.${key}`)} className={`w-full rounded-lg ${screenshotDark ? 'dark:hidden' : ''}`} />
                      {screenshotDark && <img src={screenshotDark} alt={t(`landing.${key}`)} className="w-full rounded-lg hidden dark:block" />}
                    </div>
                  ) : (
                    <div className={`rounded-xl ${c.bg} ${c.ring} ring-1 p-10 flex items-center justify-center h-64`}>
                      <div className="text-center">
                        <Icon size={48} className={`mx-auto mb-3 ${c.accent} opacity-30`} />
                        <p className={`text-sm font-medium ${c.accent} opacity-50`}>{t(`landing.${key}`)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA / Sign-in ─────────────────────────────────────────── */}
      {isSupabaseConfigured && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-6 sm:p-10 text-center ring-1 ring-slate-700/50 dark:ring-slate-600/50">
            <Cloud size={28} className="mx-auto mb-4 text-blue-400 dark:text-blue-300" />
            <h3 className="text-xl font-bold text-white mb-2">{t('landing.featureCloud')}</h3>
            <p className="text-slate-400 dark:text-slate-300 text-sm mb-6 max-w-md mx-auto">{t('landing.signInHint')}</p>
            <button
              onClick={onAuth}
              disabled={!isCloudAvailable}
              className="h-10 px-6 bg-blue-600 dark:bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 dark:hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-lg shadow-blue-600/30 dark:shadow-blue-500/20"
            >
              {t('landing.signIn')}
            </button>
            {!isCloudAvailable && <p className="mt-3 text-xs text-slate-400">{t('offline.cloudUnavailable')}</p>}
          </div>
        </section>
      )}

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 dark:border-slate-800 py-6 mt-auto">
        <LicenseNotice className="text-center text-xs text-slate-400 dark:text-slate-500" />
      </footer>

      {/* ── Dialogs ───────────────────────────────────────────────── */}
      <NewProjectDialog
        show={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onNewLS={handleNewLS}
        onNewFile={handleNewFile}
        isFileSystemApiSupported={isFileSystemApiSupported}
        isAuthenticated={false}
      />

      <OpenProjectDialog
        show={showOpenDialog}
        onClose={() => setShowOpenDialog(false)}
        localProjects={localProjects}
        onLoad={handleLoadLocal}
        onDelete={handleDeleteLocal}
        onFileInput={() => fileInputRef.current.click()}
        onFileOpen={() => { onPickAndOpenFile(); setShowOpenDialog(false); }}
        isFileSystemApiSupported={isFileSystemApiSupported}
        fileInputRef={fileInputRef}
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

export default LandingPage;
