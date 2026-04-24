import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Unlock, Lock, AlertTriangle, X } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function FreezeButton({ token, isFrozen, onStatusChange }) {
  const { t } = useTranslation();
  const [loading, setLoading]   = useState(false);
  const [showPin, setShowPin]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pin, setPin]           = useState('');
  const [error, setError]       = useState('');

  const executeFreeze = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const res  = await fetch(`${API}/freeze/lock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onStatusChange(true);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleUnfreeze = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res  = await fetch(`${API}/freeze/unlock`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onStatusChange(false); setShowPin(false); setPin('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  if (isFrozen) return (
    <div className="animate-fade-in">
      {!showPin ? (
        <button onClick={() => setShowPin(true)}
          className="w-full btn bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-200 transition-all hover:-translate-y-0.5 py-3 border border-red-500">
          <Unlock className="w-4 h-4" /> {t('unfreeze')}
        </button>
      ) : (
        <form onSubmit={handleUnfreeze} className="space-y-3 animate-slide-up bg-white p-4 rounded-2xl shadow-xl border border-red-100 absolute bottom-8 right-8 w-72 z-50">
          <div className="flex items-center gap-2 text-red-600 mb-2 font-bold">
            <Unlock className="w-4 h-4" /> <span>{t('unfreeze')}</span>
          </div>
          <input value={pin} onChange={e => setPin(e.target.value)} type="password" maxLength={4} required
            className="input text-center tracking-widest text-xl font-black bg-slate-50 py-4"
            placeholder={t('pin_placeholder')}/>
          {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 mt-2">
            <button type="submit" className="btn bg-red-600 hover:bg-red-500 text-white flex-1" disabled={loading}>
              {loading ? t('unfreezing') : t('confirm_pin')}
            </button>
            <button type="button" onClick={() => { setShowPin(false); setPin(''); }}
              className="btn bg-slate-100 text-slate-600 hover:bg-slate-200">{t('cancel')}</button>
          </div>
        </form>
      )}
    </div>
  );

  return (
    <>
      <button onClick={() => setShowConfirm(true)} disabled={loading}
        className="w-full btn bg-white/10 hover:bg-red-500 text-white border border-white/20 hover:border-red-500 backdrop-blur-md transition-all duration-300 py-3 disabled:opacity-60">
        <Shield className="w-4 h-4" />
        {loading ? t('freezing') : t('freeze')}
      </button>
      {error && <p className="text-red-300 text-[11px] font-medium mt-1.5 absolute">{error}</p>}

      {/* Beautiful Custom Confirmation Modal with React Portal */}
      {showConfirm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowConfirm(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-8 animate-scale-in border border-slate-100 text-center overflow-hidden">
            
            {/* Soft Background Glow */}
            <div className="absolute top-[-20px] left-1/2 -translate-x-1/2 w-48 h-48 bg-red-400/20 blur-3xl rounded-full pointer-events-none" />

            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-50 to-red-100 border-[6px] border-white rounded-full flex items-center justify-center mb-5 shadow-xl shadow-red-200/50 relative z-10">
              <AlertTriangle className="w-8 h-8 text-red-500 drop-shadow-sm" />
            </div>
            
            <h3 className="text-2xl font-black text-slate-800 relative z-10 mb-3 tracking-tight">
              {t('freeze_confirm_title', 'Emergency Freeze')}
            </h3>
            
            <p className="text-slate-500 text-[15px] font-medium leading-relaxed relative z-10 mb-8 px-2">
              {t('freeze_confirm')}
            </p>
            
            <div className="flex gap-3 relative z-10">
              <button onClick={() => setShowConfirm(false)} 
                className="flex-1 btn bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold py-4 rounded-2xl">
                {t('cancel')}
              </button>
              <button onClick={executeFreeze} 
                className="flex-1 btn bg-red-500 text-white hover:bg-red-600 shadow-xl shadow-red-200 font-bold py-4 rounded-2xl group flex items-center justify-center gap-2">
                <Lock className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
