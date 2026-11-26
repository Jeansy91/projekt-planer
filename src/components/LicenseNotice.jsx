import { useTranslation } from 'react-i18next';
import { AUTHOR_NAME, AUTHOR_URL, SOURCE_CODE_URL } from '../utils/constants';

const linkClass = 'underline hover:text-slate-600 dark:hover:text-slate-300';

// AGPL-3.0 section 13: users of a hosted instance must be offered the source code.
const LicenseNotice = ({ className = '' }) => {
  const { t } = useTranslation();
  return (
    <p className={className}>
      © 2026{' '}
      <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer" className={linkClass} data-testid="author-link">
        {AUTHOR_NAME}
      </a>{' '}
      · {t('app.footer')} ·{' '}
      <a href={SOURCE_CODE_URL} target="_blank" rel="noopener noreferrer" className={linkClass} data-testid="source-code-link">
        {t('app.sourceCode')}
      </a>
    </p>
  );
};

export default LicenseNotice;
