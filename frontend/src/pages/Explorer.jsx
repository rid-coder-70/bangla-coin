import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Search, CheckCircle2, XCircle, Lock, ArrowUp, Activity, ShieldAlert, ShieldCheck } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const STATUS_STYLE = { executed:'badge-executed', pending:'badge-pending', cancelled:'badge-cancelled' };

async function recomputeHash(tx) {
  try {
    const data = `${tx.tx_id}${tx.sender}${tx.recipient}${tx.amount}${tx.status}${tx.created_at}`;
    const buf  = new TextEncoder().encode(data + (tx.prevHash || '0'.repeat(64)));
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
  } catch { return null; }
}

export default function Explorer() {
  const { t } = useTranslation();
  const [txs, setTxs]           = useState([]);
  const [loading, setLoading]   = useState(true);
  const [verified, setVerified] = useState({});
  const [verifying, setVerifying] = useState({});

  useEffect(() => {
    fetch(`${API}/ledger/txs`)
      .then(r => r.json())
      .then(data => { setTxs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleVerify = async (tx) => {
    setVerifying(v => ({ ...v, [tx.id]: true }));
    const computed = await recomputeHash(tx);
    setVerified(v => ({ ...v, [tx.id]: computed === tx.hash }));
    setVerifying(v => ({ ...v, [tx.id]: false }));
  };

  const verifiedCount = Object.values(verified).filter(Boolean).length;

  const getStatusIcon = (status) => {
    if (status === 'executed') return <CheckCircle2 className="w-3.5 h-3.5" />;
    if (status === 'cancelled') return <XCircle className="w-3.5 h-3.5" />;
    return <Activity className="w-3.5 h-3.5" />;
  };

  return (
    <div className="space-y-6">
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-slate-800">{t('explorer_title')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('explorer_subtitle')}</p>
      </div>

      <div className="flex items-center gap-4 bg-indigo-50 border border-indigo-100 px-6 py-5 rounded-2xl animate-fade-in shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-xl flex-shrink-0 shadow-inner">
          <Link2 className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <p className="font-bold text-indigo-900 text-lg">{t('txs_in_ledger', { count: txs.length })}</p>
          <p className="text-sm text-indigo-600/80 font-medium">{t('verified_count', { count: verifiedCount })}</p>
        </div>
      </div>

      <div className="card overflow-x-auto animate-slide-up stagger-1 p-0 overflow-hidden border-slate-200">
        {loading ? (
          <div className="space-y-4 p-6">{[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-xl"/>)}</div>
        ) : txs.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-600 font-semibold">{t('no_txs')}</p>
            <p className="text-slate-400 text-sm mt-1">{t('no_txs_sub')}</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['col_id','col_from','col_to','col_amount','col_status','col_hash','col_verify','col_chain'].map(k => (
                  <th key={k} className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{t(k)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {txs.map((tx, i) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors duration-100 animate-fade-in group" style={{animationDelay:`${i*40}ms`}}>
                  <td className="px-4 py-4 font-mono text-slate-500 font-medium text-xs">{tx.tx_id}</td>
                  <td className="px-4 py-4">
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-200" title={tx.sender}>{tx.sender?.substring(0,8)}…</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg border border-slate-200" title={tx.recipient}>{tx.recipient?.substring(0,8)}…</span>
                  </td>
                  <td className="px-4 py-4 font-bold text-slate-800">{Number(tx.amount).toLocaleString()} <span className="text-[10px] font-bold text-slate-400">BDT</span></td>
                  <td className="px-4 py-4">
                    <span className={`badge ${STATUS_STYLE[tx.status]||'badge-pending'} shadow-sm`}>
                      {getStatusIcon(tx.status)} {t(`status_${tx.status}`) || tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-mono text-[11px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">{tx.hash?.substring(0,10)||'—'}…</span>
                  </td>
                  <td className="px-4 py-4">
                    {verified[tx.id] !== undefined ? (
                      <span className={`badge font-bold shadow-sm ${verified[tx.id] ? 'badge-executed' : 'badge-cancelled'}`}>
                        {verified[tx.id] ? <><ShieldCheck className="w-3.5 h-3.5"/> {t('valid')}</> : <><ShieldAlert className="w-3.5 h-3.5"/> {t('invalid')}</>}
                      </span>
                    ) : (
                      <button onClick={() => handleVerify(tx)} disabled={verifying[tx.id]}
                        className="btn bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs py-1.5 px-3 font-bold disabled:opacity-60 shadow-sm">
                        {verifying[tx.id] ? '…' : t('verify')}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-300 text-lg font-light flex items-center justify-center">
                    {i < txs.length - 1 ? <ArrowUp className="w-4 h-4 text-slate-300" /> : <Lock className="w-4 h-4 text-slate-400" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card text-xs text-slate-500 space-y-2 animate-slide-up stagger-2 bg-slate-50/50 border-slate-200">
        <p className="font-bold text-slate-700 mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> {t('how_verify_title')}
        </p>
        <p className="pl-6">{t('how_verify_1')}</p>
        <p className="pl-6">{t('how_verify_2')}</p>
        <p className="pl-6 text-emerald-700 font-semibold">{t('how_verify_3')}</p>
      </div>
    </div>
  );
}
