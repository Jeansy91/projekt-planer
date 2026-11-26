import { useState, useEffect } from 'react';
import { X, Loader2, Cloud, KeyRound, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmailStep from './EmailStep';
import LoginStep from './LoginStep';
import RegisterStep from './RegisterStep';
import ResetPasswordStep from './ResetPasswordStep';
import NewPasswordStep from './NewPasswordStep';
import MfaStep from './MfaStep';
import ProfileView from './ProfileView';

const AuthModal = ({ show, onClose, user, profile, mfaRequired, passwordRecovery, initialEmail, onCheckEmail, onSignIn, onSignUp, onSignOut, onResetPassword, onUpdatePassword, onUpdateProfile, onGetMfaFactors, onVerifyMfa }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mfaFactorId, setMfaFactorId] = useState(null);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    if (passwordRecovery) {
      setStep('newPassword');
      setPassword('');
      setPasswordConfirm('');
      setError(null);
    }
  }, [passwordRecovery]);

  useEffect(() => {
    if (mfaRequired && user) {
      setMfaCode('');
      setError(null);
      setLoading(true);
      onGetMfaFactors?.().then(factors => {
        const verified = factors?.filter(f => f.status === 'verified');
        if (verified?.length > 0) {
          setMfaFactorId(verified[0].id);
          setStep('mfa');
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [mfaRequired, user]);

  useEffect(() => {
    if (!show || !initialEmail || user) return;
    setEmail(initialEmail);
    setLoading(true);
    setError(null);
    onCheckEmail(initialEmail).then(({ exists, error: err }) => {
      setLoading(false);
      if (err) { setError(err.message); return; }
      setStep(exists ? 'login' : 'register');
    });
  }, [show, initialEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  const shouldShow = show || passwordRecovery || mfaRequired;
  if (!shouldShow) return null;

  const resetForm = () => {
    setStep('email');
    setEmail('');
    setPassword('');
    setPasswordConfirm('');
    setDisplayName('');
    setError(null);
    setLoading(false);
    setMfaFactorId(null);
    setMfaCode('');
  };

  const handleClose = () => {
    if (mfaRequired) return;
    resetForm();
    onClose();
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { exists, error: err } = await onCheckEmail(email.trim());
    setLoading(false);
    if (err) { setError(err.message); return; }
    setStep(exists ? 'login' : 'register');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError(null);
    const { error: err } = await onSignIn(email.trim(), password);
    if (err) { setLoading(false); setError(t('auth.invalidCredentials')); return; }
    setLoading(false);
    handleClose();
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    if (mfaCode.length !== 6 || !mfaFactorId) return;
    setLoading(true);
    setError(null);
    const { error: err } = await onVerifyMfa(mfaFactorId, mfaCode);
    setLoading(false);
    if (err) { setError(err); return; }
    resetForm();
    onClose();
  };

  const handleMfaSignOut = async () => {
    await onSignOut();
    resetForm();
    onClose();
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim() || !password) return;
    if (password !== passwordConfirm) { setError(t('auth.passwordMismatch')); return; }
    if (password.length < 6) { setError(t('auth.passwordTooShort')); return; }
    setLoading(true);
    setError(null);
    const { error: err } = await onSignUp(email.trim(), password, displayName.trim());
    setLoading(false);
    if (err) { setError(err.message); return; }
    handleClose();
  };

  const handleResetRequest = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error: err } = await onResetPassword(email.trim());
    setLoading(false);
    if (err) { setError(err.message); return; }
    setStep('resetSent');
  };

  const handleNewPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    if (password !== passwordConfirm) { setError(t('auth.passwordMismatch')); return; }
    if (password.length < 6) { setError(t('auth.passwordTooShort')); return; }
    setLoading(true);
    setError(null);
    const { error: err } = await onUpdatePassword(password);
    setLoading(false);
    if (err) { setError(err.message); return; }
    handleClose();
  };

  const handleBack = () => {
    setPassword('');
    setPasswordConfirm('');
    setDisplayName('');
    setError(null);
    setStep('email');
  };

  const getTitle = () => {
    if (step === 'mfa') return t('auth.mfaChallenge');
    if (user && step !== 'newPassword') return t('auth.account');
    if (step === 'register') return t('auth.register');
    if (step === 'resetRequest' || step === 'resetSent') return t('auth.resetPassword');
    if (step === 'newPassword') return t('auth.setNewPassword');
    return t('auth.login');
  };

  const canClose = step !== 'newPassword' && step !== 'mfa';
  const isResetStep = step === 'newPassword' || step === 'resetRequest' || step === 'resetSent';

  const renderStep = () => {
    if (step === 'mfa') {
      return <MfaStep mfaCode={mfaCode} setMfaCode={setMfaCode} error={error} loading={loading} onSubmit={handleMfaSubmit} onSignOut={handleMfaSignOut} />;
    }
    if (step === 'newPassword') {
      return <NewPasswordStep email={email} password={password} setPassword={setPassword} passwordConfirm={passwordConfirm} setPasswordConfirm={setPasswordConfirm} error={error} loading={loading} onSubmit={handleNewPasswordSubmit} />;
    }
    if (mfaRequired && step !== 'mfa') {
      return <div className="flex items-center justify-center py-8"><Loader2 size={24} className="animate-spin text-blue-500" /></div>;
    }
    if (user && !mfaRequired) {
      return <ProfileView user={user} profile={profile} onSignOut={onSignOut} onUpdateProfile={onUpdateProfile} />;
    }
    if (step === 'email') {
      return <EmailStep email={email} setEmail={setEmail} error={error} loading={loading} onSubmit={handleEmailSubmit} />;
    }
    if (step === 'login') {
      return <LoginStep email={email} password={password} setPassword={setPassword} error={error} loading={loading} onSubmit={handleLoginSubmit} onBack={handleBack} onForgotPassword={() => { setPassword(''); setError(null); setStep('resetRequest'); }} />;
    }
    if (step === 'resetRequest' || step === 'resetSent') {
      return <ResetPasswordStep email={email} error={error} loading={loading} sent={step === 'resetSent'} onSubmit={handleResetRequest} onBack={() => { setError(null); setStep('login'); }} onClose={handleClose} />;
    }
    return <RegisterStep email={email} displayName={displayName} setDisplayName={setDisplayName} password={password} setPassword={setPassword} passwordConfirm={passwordConfirm} setPasswordConfirm={setPasswordConfirm} error={error} loading={loading} onSubmit={handleRegisterSubmit} onBack={handleBack} />;
  };

  return (
    <div data-testid="auth-modal" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className={`px-5 py-4 border-b border-slate-100 dark:border-slate-700 ${isResetStep ? 'bg-amber-50/60 dark:bg-amber-900/20' : 'bg-blue-50/60 dark:bg-blue-900/20'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl ${isResetStep ? 'bg-amber-100 dark:bg-amber-800/30' : 'bg-blue-100 dark:bg-blue-800/30'} flex items-center justify-center shrink-0`}>
                {step === 'mfa' ? <Shield size={18} className="text-blue-600 dark:text-blue-400" />
                  : isResetStep ? <KeyRound size={18} className="text-amber-600 dark:text-amber-400" />
                  : <Cloud size={18} className="text-blue-600 dark:text-blue-400" />}
              </div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">{getTitle()}</h3>
            </div>
            {canClose && <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label={t('a11y.close')}><X size={16} aria-hidden="true" /></button>}
          </div>
        </div>

        <div className="p-6">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
