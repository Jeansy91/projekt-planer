import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Shield, ShieldCheck, ShieldOff, AlertTriangle } from 'lucide-react';
import { PasswordConfirmModal } from '../dialogs';

const SecuritySection = ({
  user,
  onUpdateEmail,
  onUpdatePassword,
  onDeleteAccount,
  onGetMfaFactors,
  onEnrollMfa,
  onVerifyMfa,
  onUnenrollMfa,
  onVerifyPassword,
  onSignOut,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Email
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // 2FA
  const [mfaFactors, setMfaFactors] = useState([]);
  const [mfaEnrolling, setMfaEnrolling] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  // Delete Account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Password confirm modal
  const [passwordModal, setPasswordModal] = useState(null);

  useEffect(() => {
    onGetMfaFactors?.().then(factors => setMfaFactors(factors || []));
  }, []);

  const requirePassword = useCallback((title) => {
    return new Promise((resolve) => {
      setPasswordModal({
        title,
        onConfirm: async (password) => {
          const result = await onVerifyPassword(password);
          if (result.error) return result;
          setPasswordModal(null);
          resolve(password);
          return { error: null };
        },
      });
    });
  }, [onVerifyPassword]);

  // Email handler
  const handleUpdateEmail = useCallback(async () => {
    setEmailError('');
    setEmailSuccess(false);
    if (!newEmail.trim() || newEmail.trim() === user?.email) return;
    const password = await requirePassword(t('settings.security.changeEmail'));
    const { error } = await onUpdateEmail(newEmail.trim(), password);
    if (error) {
      setEmailError(error.message || error);
      return;
    }
    setEmailSuccess(true);
    setNewEmail('');
    setTimeout(() => setEmailSuccess(false), 5000);
  }, [newEmail, user, onUpdateEmail, requirePassword, t]);

  // Password handler
  const handleUpdatePassword = useCallback(async () => {
    setPasswordError('');
    setPasswordSuccess(false);
    if (newPassword.length < 6) {
      setPasswordError(t('settings.security.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('settings.security.passwordMismatch'));
      return;
    }
    const oldPassword = await requirePassword(t('settings.security.changePassword'));
    const { error } = await onUpdatePassword(newPassword, oldPassword);
    if (error) {
      setPasswordError(error.message || error);
      return;
    }
    setPasswordSuccess(true);
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(false), 3000);
  }, [newPassword, confirmPassword, onUpdatePassword, requirePassword, t]);

  // 2FA handlers
  const handleEnrollMfa = useCallback(async () => {
    setMfaError('');
    const result = await onEnrollMfa();
    if (result.error) {
      setMfaError(result.error);
      return;
    }
    setMfaEnrolling(result);
    setMfaCode('');
  }, [onEnrollMfa]);

  const handleVerifyMfa = useCallback(async () => {
    setMfaError('');
    if (mfaCode.length !== 6) return;
    const { error } = await onVerifyMfa(mfaEnrolling.factorId, mfaCode);
    if (error) {
      setMfaError(error);
      return;
    }
    setMfaEnrolling(null);
    setMfaCode('');
    const factors = await onGetMfaFactors();
    setMfaFactors(factors || []);
  }, [mfaCode, mfaEnrolling, onVerifyMfa, onGetMfaFactors]);

  const handleUnenrollMfa = useCallback(async (factorId) => {
    await requirePassword(t('settings.security.disable2FA'));
    const { error } = await onUnenrollMfa(factorId);
    if (!error) {
      const factors = await onGetMfaFactors();
      setMfaFactors(factors || []);
    }
  }, [onUnenrollMfa, onGetMfaFactors, requirePassword, t]);

  // Delete account
  const handleDeleteAccount = useCallback(async () => {
    await requirePassword(t('settings.security.deleteAccount'));
    setDeleting(true);
    const { error } = await onDeleteAccount();
    if (error) {
      setDeleting(false);
      return;
    }
    onSignOut();
    navigate('/');
  }, [onDeleteAccount, onSignOut, navigate, requirePassword, t]);

  const hasMfa = mfaFactors.some(f => f.status === 'verified');
  const confirmWord = t('settings.security.confirmWord');

  return (
    <>
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">{t('settings.security.title')}</h2>

        {/* Email */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t('settings.security.changeEmail')}</h3>
          <form onSubmit={(e) => { e.preventDefault(); handleUpdateEmail(); }} className="space-y-2 max-w-md">
            <div className="text-xs text-slate-400 dark:text-slate-500">{t('settings.security.currentEmail')}: <span className="font-medium text-slate-600 dark:text-slate-300">{user?.email}</span></div>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t('settings.security.newEmailPlaceholder')}
              autoComplete="email"
              className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-800/30"
            />
            {emailError && <p className="text-xs text-red-500">{emailError}</p>}
            {emailSuccess && <p className="text-xs text-emerald-600 flex items-center gap-1"><Check size={12} /> {t('settings.security.emailUpdated')}</p>}
            <button
              type="submit"
              disabled={!newEmail.trim() || newEmail.trim() === user?.email}
              className="h-9 px-4 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('settings.security.updateEmail')}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="mb-8 border-t border-slate-100 dark:border-slate-700/50 pt-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t('settings.security.changePassword')}</h3>
          <form onSubmit={(e) => { e.preventDefault(); handleUpdatePassword(); }} className="space-y-2 max-w-md">
            <input type="email" autoComplete="username" value={user?.email || ''} readOnly className="hidden" tabIndex={-1} aria-hidden="true" />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('settings.security.newPassword')}
              autoComplete="new-password"
              className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-800/30"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('settings.security.confirmNewPassword')}
              autoComplete="new-password"
              className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:focus:ring-blue-800/30"
            />
            {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
            {passwordSuccess && <p className="text-xs text-emerald-600 flex items-center gap-1"><Check size={12} /> {t('settings.security.passwordUpdated')}</p>}
            <button
              type="submit"
              disabled={!newPassword || !confirmPassword}
              className="h-9 px-4 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('settings.security.updatePassword')}
            </button>
          </form>
        </div>

        {/* 2FA */}
        <div className="mb-8 border-t border-slate-100 dark:border-slate-700/50 pt-6">
          <div className="flex items-start gap-3 mb-3">
            {hasMfa ? <ShieldCheck size={18} className="text-emerald-600 mt-0.5" /> : <Shield size={18} className="text-slate-400 mt-0.5" />}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('settings.security.twoFactor')}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t('settings.security.twoFactorDesc')}</p>
            </div>
          </div>

          {hasMfa ? (
            <div className="ml-7 space-y-2">
              <p className="text-xs text-emerald-600 font-medium flex items-center gap-1"><ShieldCheck size={12} /> {t('settings.security.twoFactorEnabled')}</p>
              {mfaFactors.filter(f => f.status === 'verified').map(f => (
                <button
                  key={f.id}
                  onClick={() => handleUnenrollMfa(f.id)}
                  className="h-8 px-3 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-xs font-bold transition-colors"
                >
                  {t('settings.security.disable2FA')}
                </button>
              ))}
            </div>
          ) : mfaEnrolling ? (
            <div className="ml-7 space-y-3">
              <p className="text-xs text-slate-600">{t('settings.security.scanQR')}</p>
              <img src={mfaEnrolling.qr} alt="QR Code" className="w-48 h-48 border border-slate-200 rounded-lg" />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setShowSecret(s => !s); setSecretCopied(false); }}
                  className="h-8 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  {showSecret ? t('settings.security.hideSecret') : t('settings.security.showSecret')}
                </button>
              </div>
              {showSecret && (
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 font-mono tracking-wider text-slate-700 dark:text-slate-300 select-all">
                    {mfaEnrolling.secret}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(mfaEnrolling.secret); setSecretCopied(true); setTimeout(() => setSecretCopied(false), 2000); }}
                    className="h-8 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
                  >
                    {secretCopied ? t('settings.security.copied') : t('settings.security.copySecret')}
                  </button>
                </div>
              )}
              <div className="flex gap-2 max-w-xs">
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder={t('settings.security.codePlaceholder')}
                  autoComplete="one-time-code"
                  className="flex-1 h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono tracking-widest bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-400"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyMfa(); }}
                />
                <button
                  onClick={handleVerifyMfa}
                  disabled={mfaCode.length !== 6}
                  className="h-9 px-4 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {t('settings.security.verify')}
                </button>
              </div>
              {mfaError && <p className="text-xs text-red-500">{mfaError}</p>}
            </div>
          ) : (
            <div className="ml-7">
              <p className="text-xs text-slate-400 mb-2 flex items-center gap-1"><ShieldOff size={12} /> {t('settings.security.twoFactorDisabled')}</p>
              <button
                onClick={handleEnrollMfa}
                className="h-8 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                {t('settings.security.enable2FA')}
              </button>
            </div>
          )}
        </div>

        {/* Delete Account */}
        <div className="border-t border-red-100 dark:border-red-900/30 pt-6">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle size={18} className="text-red-500 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">{t('settings.security.deleteAccount')}</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t('settings.security.deleteAccountDesc')}</p>
            </div>
          </div>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="ml-7 h-8 px-3 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg text-xs font-bold transition-colors"
            >
              {t('settings.security.deleteAccount')}
            </button>
          ) : (
            <div className="ml-7 space-y-2 max-w-sm">
              <p className="text-xs text-red-600">{t('settings.security.deleteAccountConfirm')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.security.typeConfirm')}</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                autoComplete="off"
                className="w-full h-9 px-3 border border-red-200 rounded-lg text-sm focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-100"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== confirmWord || deleting}
                  className="h-9 px-4 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? '...' : t('settings.security.deleteAccountBtn')}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  className="h-9 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors"
                >
                  {t('dialogs.delete.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Password Confirmation Modal */}
      <PasswordConfirmModal
        open={!!passwordModal}
        title={passwordModal?.title}
        email={user?.email}
        onConfirm={passwordModal?.onConfirm || (() => {})}
        onCancel={() => setPasswordModal(null)}
      />
    </>
  );
};

export default SecuritySection;
