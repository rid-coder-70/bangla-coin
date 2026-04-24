import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, ShieldAlert, ShieldCheck, Send as SendIcon, Loader2, ArrowLeft, Info } from 'lucide-react';
import FrictionTimer from '../components/FrictionTimer';
import FlagWarning from '../components/FlagWarning';
import Toast from '../components/Toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Send({ token }) {
  const { t } = useTranslation();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount]       = useState('');
  const [flagCount, setFlagCount] = useState(0);
  const [checking, setChecking]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [pendingTx, setPendingTx] = useState(null);
  const [success, setSuccess]     = useState('');
  const [error, setError]         = useState('');

  const checkFlags = async (addr) => {
    if (addr.length < 10) { setFlagCount(0); return; }
    setChecking(true);
    try {
      const res = await fetch(`${API}/flag/count/${addr}`);
      if (res.ok) { const d = await res.json(); setFlagCount(d.count || 0); }
    } catch { /* ignore */ }
    finally { setChecking(false); }
  };

  const handleSend = async (e) => {
    e.preventDefault(); setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/transfer/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipient, amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.delay === 0) {
        setSuccess(t('send_instant')); setRecipient(''); setAmount(''); setFlagCount(0);
      } else {
        setPendingTx({ txId: data.txId, delay: data.delay, recipient, amount, reasons: data.reasons || [] });
      }
    } catch (err) { setError(err.message || 'Transfer failed'); }
    finally { setLoading(false); }
  };

  const handleCancel = async () => {
    if (pendingTx?.txId >= 0) {
      try {
        await fetch(`${API}/transfer/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ txId: pendingTx.txId }),
        });
      } catch { /* ignore */ }
    }
    setPendingTx(null); setSuccess(t('cancel_success'));
  };

  const handleConfirm = () => {
    setPendingTx(null); setSuccess(t('send_success'));
    setRecipient(''); setAmount(''); setFlagCount(0);
  };

  if (pendingTx) {
    return (
      <div className="max-w-md mx-auto">
        <button onClick={handleCancel} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors animate-fade-in">
          <ArrowLeft className="w-4 h-4" /> {t('cancel')}
        </button>
        <FrictionTimer
          delaySeconds={pendingTx.delay}
          recipientName={pendingTx.recipient}
          amount={pendingTx.amount}
          riskReasons={pendingTx.reasons}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
        />
      </div>
    );
  }

  const amt = Number(amount);

  return (
    <div className="max-w-md mx-auto space-y-5">
      <Toast message={success} type="success" onClose={() => setSuccess('')} />
      <Toast message={error} type="error" onClose={() => setError('')} />

      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-slate-800">{t('send_money')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('send_subtitle')}</p>
      </div>

      <div className="card bg-emerald-50 border-emerald-100 animate-slide-up stagger-1 p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 border border-emerald-200">
            <Shield className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-bold text-emerald-900 text-sm">{t('friction_active')}</p>
            <p className="text-emerald-700/80 text-[13px] mt-1 leading-relaxed font-medium">{t('friction_desc')}</p>
          </div>
        </div>
      </div>

      {flagCount > 0 && <FlagWarning flagCount={flagCount} address={recipient} canReport={false}/>}

      <form onSubmit={handleSend} className="card space-y-6 animate-slide-up stagger-2 border-slate-100 shadow-md">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            {t('recipient')}
            {checking && <span className="ml-2 text-xs text-slate-400 font-medium animate-pulse flex items-center gap-1 inline-flex"><Loader2 className="w-3 h-3 animate-spin"/> {t('checking')}</span>}
          </label>
          <input type="text" value={recipient}
            onChange={e => { setRecipient(e.target.value); checkFlags(e.target.value); }}
            className={`input font-mono text-sm bg-slate-50 ${flagCount >= 3 ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder={t('recipient_placeholder')} required/>
          {recipient.length > 5 && flagCount === 0 && !checking && (
            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('address_clean')}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">{t('amount')}</label>
          <div className="relative">
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              className="input pr-16 text-lg font-bold bg-slate-50" placeholder={t('amount_placeholder')} required min="1"/>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">BDT</span>
          </div>
          {amt > 0 && (
            <p className={`text-xs mt-2 font-semibold flex items-center gap-1.5 ${amt>5000?'text-red-500':amt>=1000?'text-amber-500':'text-emerald-600'}`}>
              {amt>5000 ? <ShieldAlert className="w-3 h-3" /> : <Info className="w-3 h-3" />}
              {amt>5000 ? t('high_risk_hint') : amt>=1000 ? t('medium_risk_hint') : t('low_risk_hint')}
            </p>
          )}
        </div>

        <button type="submit" disabled={loading || !recipient || !amount}
          className="w-full btn btn-primary text-base py-3.5 disabled:opacity-60 disabled:cursor-not-allowed mt-2">
          {loading
            ? <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> {t('analysing')}</span>
            : <span className="flex items-center gap-2">{t('send')} <SendIcon className="w-4 h-4 ml-1" /></span>
          }
        </button>
      </form>

      <div className="card text-xs text-slate-500 space-y-2.5 animate-slide-up stagger-3 bg-slate-50 border-slate-100">
        <p className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> {t('risk_rules_title')}</p>
        {[
          ['R1','First-time recipient / নতুন প্রাপক','10s'],
          ['R2','1,000–5,000 BDT','30s'],
          ['R3','> 5,000 BDT','60s'],
          ['R4','Flagged ×3+ / ফ্ল্যাগড ×৩+','120s ⚠️'],
          ['R5','5 sends/hr / ঘণ্টায় ৫+','60s'],
          ['R6','Score > 70','180s max'],
        ].map(([id, desc, act]) => (
          <div key={id} className="flex items-center justify-between py-1 border-b border-slate-200/50 last:border-0">
            <span className="flex items-center gap-2">
              <span className="font-mono text-emerald-700 bg-emerald-100/50 px-1.5 py-0.5 rounded font-bold">{id}</span>
              <span className="font-medium text-slate-600">{desc}</span>
            </span>
            <span className="text-amber-600 font-bold">{act}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
