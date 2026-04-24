import { useTranslation } from 'react-i18next';
import { ShieldAlert, AlertTriangle, AlertCircle } from 'lucide-react';

export default function FlagWarning({ flagCount, address, onReport, canReport }) {
  const { t } = useTranslation();
  if (flagCount === 0) return null;

  const level = flagCount >= 5 ? 'critical' : flagCount >= 3 ? 'high' : 'warn';
  const styles = {
    critical: 'bg-red-50 border-red-300 text-red-800 shadow-sm shadow-red-100',
    high:     'bg-orange-50 border-orange-300 text-orange-800 shadow-sm shadow-orange-100',
    warn:     'bg-yellow-50 border-yellow-300 text-yellow-800 shadow-sm shadow-yellow-100',
  };
  
  const icons = { 
    critical: <ShieldAlert className="w-5 h-5 text-red-600" />, 
    high: <AlertTriangle className="w-5 h-5 text-orange-600" />, 
    warn: <AlertCircle className="w-5 h-5 text-yellow-600" /> 
  };
  
  const labels = { critical: t('flag_critical'), high: t('flag_high'), warn: t('flag_warn') };

  return (
    <div className={`border-2 rounded-xl p-4 animate-fade-in ${styles[level]}`}>
      <div className="flex items-center gap-2 mb-1.5">
        {icons[level]}
        <p className="font-bold text-sm">{labels[level]}</p>
      </div>
      <p className="text-[13px] opacity-90 font-medium ml-7">
        {flagCount === 1 ? t('flagged_times', {count:flagCount}) : t('flagged_times_plural', {count:flagCount})}
      </p>
      {canReport && onReport && (
        <button onClick={onReport} className="mt-3 ml-7 text-xs font-bold underline hover:no-underline px-2 py-1 bg-white/50 rounded-md border border-black/5 hover:bg-white/80 transition-all">{t('report_account')}</button>
      )}
    </div>
  );
}
