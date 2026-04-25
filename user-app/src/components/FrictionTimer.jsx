import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, Check, ShieldAlert, Clock } from 'lucide-react';

export default function FrictionTimer({ delaySeconds, onConfirm, onCancel, recipientName, amount, riskReasons }) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(delaySeconds);
  const isFlagged = riskReasons.some(r => r.toLowerCase().includes('flagged'));
  const pct = Math.max(0, ((delaySeconds - timeLeft) / delaySeconds) * 100);

  useEffect(() => {
    if (timeLeft <= 0) {
      const id = setTimeout(onConfirm, 2000);
      return () => clearTimeout(id);
    }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft, onConfirm]);

  const mins = String(Math.floor(Math.max(0, timeLeft) / 60)).padStart(2, '0');
  const secs = String(Math.max(0, timeLeft) % 60).padStart(2, '0');
  const color = timeLeft <= 0 ? '#10b981' : isFlagged ? '#ef4444' : '#059669';

  return (
    <div className={`card max-w-md mx-auto border-2 shadow-xl animate-scale-in
      ${timeLeft <= 0 ? 'border-emerald-300' : isFlagged ? 'border-red-400' : 'border-slate-200'}`}>

      {isFlagged && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl mb-6 animate-fade-in shadow-sm">
          <ShieldAlert className="w-6 h-6 text-red-600" />
          <div>
            <p className="font-bold text-sm">{t('risk_warning')}</p>
            <p className="text-[13px] opacity-80 font-medium mt-0.5">{t('risk_warning_sub')}</p>
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">{t('delay_active')}</p>
        <h2 className="text-xl font-black text-slate-800 flex items-center justify-center gap-2">
          {timeLeft <= 0 ? <Check className="w-6 h-6 text-emerald-500" /> : <Clock className="w-6 h-6 text-amber-500" />}
          {timeLeft <= 0 ? t('friction_done_title') : t('friction_timer_title')}
        </h2>
      </div>

      <div className="flex justify-center mb-8">
        <div className="relative w-44 h-44">
          <svg className="w-44 h-44 -rotate-90 drop-shadow-md" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="58" fill="none" stroke="#f1f5f9" strokeWidth="10"/>
            <circle cx="70" cy="70" r="58" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${2*Math.PI*58}`}
              strokeDashoffset={`${2*Math.PI*58*(1-pct/100)}`}
              style={{transition:'stroke-dashoffset 1s linear'}}/>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-mono font-black tracking-tighter
              ${timeLeft<=0?'text-emerald-600':isFlagged?'text-red-600':'text-slate-800'}
              ${timeLeft>0&&timeLeft<=10?'animate-countdown':''}`}>
              {mins}:{secs}
            </span>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">{t('remaining')}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-5 mb-6 border border-slate-100 shadow-inner space-y-3">
        <div className="flex justify-between items-start">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t('to')}</span>
          <span className="text-xs font-mono font-semibold text-slate-700 text-right max-w-[220px] break-all bg-white px-2 py-1 border border-slate-200 rounded-md">{recipientName}</span>
        </div>
        <div className="h-px bg-slate-200/60"/>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{t('amount')}</span>
          <span className="text-xl font-black text-slate-800">{Number(amount).toLocaleString()} <span className="text-sm font-bold text-slate-400">BDT</span></span>
        </div>
        {riskReasons.length > 0 && (
          <>
            <div className="h-px bg-slate-200/60"/>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('risk_factors')}</p>
            <ul className="space-y-1.5">
              {riskReasons.map((r,i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] font-medium text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" /> {r}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="btn btn-danger flex-1 py-3">
          <X className="w-4 h-4" />
          {t('cancel')}
        </button>
        <button onClick={onConfirm} disabled={timeLeft > 0}
          className={`btn flex-1 py-3 ${timeLeft > 0 ? 'btn-disabled' : 'btn-primary'}`}>
          <Check className="w-4 h-4" />
          {timeLeft > 0 ? `${t('wait_seconds', {count: timeLeft})}` : t('confirm')}
        </button>
      </div>

      {timeLeft <= 0 && (
        <p className="text-center text-[13px] text-emerald-600 mt-4 animate-fade-in font-bold">
          {t('auto_confirming')}
        </p>
      )}
    </div>
  );
}

