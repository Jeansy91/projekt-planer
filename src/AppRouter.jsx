import { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import i18next from 'i18next';
import { useAuth } from './hooks/useAuth';
import { useSupabaseProject } from './hooks/useSupabaseProject';
import { useCloudAvailability } from './hooks/useCloudAvailability';
import { useTheme } from './hooks/useTheme';
import { loadProjectList } from './utils/localStorage';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import App from './App';
import SettingsPage from './components/settings';
import { AuthModal } from './components/dialogs';

const AppRouter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const auth = useAuth();
  const { isAvailable: isCloudAvailable, isChecked: isCloudAvailabilityChecked } = useCloudAvailability();
  const { user, profile, isAuthenticated, mfaRequired, isSupabaseConfigured, passwordRecovery, checkEmailExists, signInWithPassword, signUp, signOut, resetPasswordForEmail, updatePassword, updateEmail, updateProfile, uploadAvatar, removeAvatar, deleteAccount, getMfaFactors, enrollMfa, verifyMfa, unenrollMfa, verifyPassword } = auth;
  const sbProject = useSupabaseProject(user);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState(null);
  const [localProjects, setLocalProjects] = useState([]);
  const [cloudProjects, setCloudProjects] = useState([]);

  // Ref so imperative calls always use the latest sbProject instance
  const sbRef = useRef(sbProject);
  sbRef.current = sbProject;

  const refreshCloudProjects = useCallback(() => {
    if (!isCloudAvailable) {
      setCloudProjects([]);
    } else if (sbRef.current && user) {
      sbRef.current.listProjects()
        .then((projects) => setCloudProjects(projects))
        .catch((err) => console.error('listProjects failed:', err));
    }
  }, [user, isCloudAvailable]);

  // Refresh project lists when home page is shown
  useEffect(() => {
    if (location.pathname !== '/') return;
    setLocalProjects(loadProjectList());
    if (isAuthenticated) {
      refreshCloudProjects();
    } else {
      setCloudProjects([]);
    }
  }, [location.pathname, isAuthenticated, refreshCloudProjects]);

  // After auth callback, redirect to project if invited
  useEffect(() => {
    if (!user || location.pathname !== '/') return;
    const params = new URLSearchParams(location.search);
    const redirectProject = params.get('project');
    if (redirectProject) {
      navigate(`/project/${redirectProject}`, { replace: true });
    }
  }, [user, location]);

  const handleNewLocal = useCallback((existingId) => {
    if (existingId) {
      navigate(`/project/${existingId}`);
      return existingId;
    }
    const id = crypto.randomUUID();
    navigate(`/project/${id}`, { state: { newLocal: true } });
    return id;
  }, [navigate]);

  const handleNewFile = useCallback(() => {
    const id = crypto.randomUUID();
    navigate(`/project/${id}`, { state: { newFile: true } });
    return id;
  }, [navigate]);

  const handlePickAndOpenFile = useCallback(async () => {
    try {
      const [handle] = await window.showOpenFilePicker({ types: [{ accept: { 'application/json': ['.json'] } }] });
      const file = await handle.getFile();
      const content = JSON.parse(await file.text());
      const id = crypto.randomUUID();
      // Pass file handle via transient global — cannot be serialized in navigation state
      window.__pendingFileHandle = handle;
      navigate(`/project/${id}`, { state: { openFileData: content } });
      return id;
    } catch {
      return null;
    }
  }, [navigate]);

  const handleNewCloud = useCallback(async () => {
    if (!isCloudAvailable) return null;
    const title = i18next.t('project.newTitle');
    const project = await sbProject.createProject(title);
    return project?.id || null;
  }, [isCloudAvailable, sbProject]);

  const handleOpenFile = useCallback((json) => {
    const id = crypto.randomUUID();
    navigate(`/project/${id}`, { state: { importedJson: json } });
    return id;
  }, [navigate]);

  const handleDeleteCloud = useCallback(async (id) => {
    if (!isCloudAvailable) return;
    await sbProject.deleteProject(id);
    setCloudProjects(prev => prev.filter(p => p.id !== id));
  }, [isCloudAvailable, sbProject]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    setCloudProjects([]);
    setLocalProjects(loadProjectList());
  }, [signOut]);

  const isFileSystemApiSupported = 'showOpenFilePicker' in window;

  const homePage = isAuthenticated ? (
    <Dashboard
      user={user}
      profile={profile}
      isAuthenticated={isAuthenticated}
      isCloudAvailable={isCloudAvailable}
      onSignOut={handleSignOut}
      theme={theme}
      onThemeChange={setTheme}
      localProjects={localProjects}
      cloudProjects={cloudProjects}
      onRefreshProjects={refreshCloudProjects}
      onNewLocal={handleNewLocal}
      onNewCloud={handleNewCloud}
      onNewFile={handleNewFile}
      onOpenFile={handleOpenFile}
      onPickAndOpenFile={handlePickAndOpenFile}
      onLoadLocal={(id) => navigate(`/project/${id}`)}
      onLoadCloud={(id) => navigate(`/project/${id}`)}
      onDeleteCloud={handleDeleteCloud}
      isFileSystemApiSupported={isFileSystemApiSupported}
    />
  ) : (
    <LandingPage
      isSupabaseConfigured={isSupabaseConfigured}
      isCloudAvailable={isCloudAvailable}
      isCloudAvailabilityChecked={isCloudAvailabilityChecked}
      theme={theme}
      onThemeChange={setTheme}
      onAuth={(email) => { setInviteEmail(typeof email === 'string' ? email : null); setShowAuthModal(true); }}
      onNewLocal={handleNewLocal}
      onNewFile={handleNewFile}
      onOpenFile={handleOpenFile}
      onPickAndOpenFile={handlePickAndOpenFile}
      isFileSystemApiSupported={isFileSystemApiSupported}
    />
  );

  return (
    <>
      <Routes>
        <Route path="/" element={homePage} />
        <Route
          path="/project/:projectId"
          element={<App auth={auth} sbProject={sbProject} theme={theme} onThemeChange={setTheme} isCloudAvailable={isCloudAvailable} isCloudAvailabilityChecked={isCloudAvailabilityChecked} />}
        />
        {isAuthenticated && (
          <Route
            path="/settings"
            element={
              <SettingsPage
                user={user}
                profile={profile}
                theme={theme}
                onThemeChange={setTheme}

                onUpdateProfile={updateProfile}
                onUploadAvatar={uploadAvatar}
                onRemoveAvatar={removeAvatar}
                onUpdatePassword={updatePassword}
                onUpdateEmail={updateEmail}
                onDeleteAccount={deleteAccount}
                onGetMfaFactors={getMfaFactors}
                onEnrollMfa={enrollMfa}
                onVerifyMfa={verifyMfa}
                onUnenrollMfa={unenrollMfa}
                onVerifyPassword={verifyPassword}
                onSignOut={signOut}
              />
            }
          />
        )}
      </Routes>

      <AuthModal
        show={showAuthModal}
        onClose={() => { setShowAuthModal(false); setInviteEmail(null); }}
        initialEmail={inviteEmail}
        user={user}
        profile={profile}
        mfaRequired={mfaRequired}
        passwordRecovery={passwordRecovery}
        onCheckEmail={checkEmailExists}
        onSignIn={signInWithPassword}
        onSignUp={signUp}
        onSignOut={signOut}
        onResetPassword={resetPasswordForEmail}
        onUpdatePassword={updatePassword}
        onUpdateProfile={updateProfile}
        onGetMfaFactors={getMfaFactors}
        onVerifyMfa={verifyMfa}
      />
    </>
  );
};

export default AppRouter;
