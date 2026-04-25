import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Send, CheckCircle2, Clock, CheckCircle, Activity, LayoutGrid, XCircle, Building2 } from 'lucide-react';
import FreezeButton from '../components/FreezeButton';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function Skeleton({ className }) { return <div className={`skeleton ${className}`} />; }

function TxRow({ tx, userWallet, walletMap, index }) {
  const { t } = useTranslation();
  const isSend = tx.sender?.toLowerCase() === userWallet?.toLowerCase();
  
  const statusMap = { executed:'badge-executed', pending:'badge-pending', cancelled:'badge-cancelled' };
  
  const statusIcon = { 
    executed: <CheckCircle2 className="w-3.5 h-3.5" />, 
    pending: <Clock className="w-3.5 h-3.5" />, 
    cancelled: <XCircle className="w-3.5 h-3.5" /> 
  };
  
  const statusLabel = { 
    executed: t('status_executed'), 
    pending: t('status_pending'), 
    cancelled: t('status_cancelled') 
  };

  const counterAddr = isSend ? tx.recipient : tx.sender;
  const resolved = walletMap?.[counterAddr?.toLowerCase()];
  const displayLabel = resolved
    ? (resolved.name ? `${resolved.name} (${resolved.phone})` : resolved.phone)
    : (counterAddr === 'DAO Treasury' ? 'DAO Treasury' : counterAddr?.substring(0, 12) + '…');

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className={`flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors duration-150`}>
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${isSend?'bg-red-50 text-red-500 border border-red-100':'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
          {isSend ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {isSend ? t('sent_to') : t('received_from')}
          </p>
          <p className="text-xs text-slate-500 font-medium">{displayLabel}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{new Date(tx.created_at).toLocaleString()}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-base font-bold ${isSend?'text-red-500':'text-emerald-600'}`}>
          {isSend?'-':'+'}{Number(tx.amount).toLocaleString()} <span className="text-xs font-medium">BDT</span>
        </p>
        <div className="flex justify-end mt-1.5">
          <span className={`badge ${statusMap[tx.status]||'badge-pending'}`}>
            {statusIcon[tx.status]} {statusLabel[tx.status] || tx.status}
          </span>
        </div>
        {tx.delay_seconds > 0 && <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-end gap-1"><Clock className="w-3 h-3"/> {tx.delay_seconds}s</p>}
      </div>
    </motion.div>
  );
}

export default function Home({ token }) {
  const { t } = useTranslation();
  const [balance, setBalance]   = useState(null);
  const [txs, setTxs]           = useState([]);
  const [frozen, setFrozen]     = useState(false);
  const [loading, setLoading]   = useState(true);
  const [walletMap, setWalletMap] = useState({});
  const user = JSON.parse(localStorage.getItem('user') || '{}');

const walletCache = {};

  const fetchData = async () => {
    try {
      const [bRes, tRes] = await Promise.all([
        fetch(`${API}/wallet/balance`, { headers:{Authorization:`Bearer ${token}`} }),
        fetch(`${API}/wallet/txs`,     { headers:{Authorization:`Bearer ${token}`} }),
      ]);
      if (bRes.ok) { const d = await bRes.json(); setBalance(d.balance); }
      if (tRes.ok) {
        const data = await tRes.json();
        setTxs(data);
        const myWallet = user.wallet?.toLowerCase();
        const addrs = [...new Set(
          data.flatMap(tx => [tx.sender, tx.recipient])
            .filter(a => a && a !== 'DAO Treasury' && a.startsWith('0x') && a.toLowerCase() !== myWallet)
        )];
        const map = {};
        await Promise.all(addrs.map(async addr => {
          const lower = addr.toLowerCase();
          if (walletCache[lower] !== undefined) {
            if (walletCache[lower] !== null) map[lower] = walletCache[lower];
            return;
          }
          try {
            const r = await fetch(`${API}/auth/lookup-wallet/${addr}`, { headers:{Authorization:`Bearer ${token}`} });
            if (r.ok) { 
              const d = await r.json(); 
              map[lower] = d; 
              walletCache[lower] = d;
            } else {
              walletCache[lower] = null;
            }
          } catch { 
            walletCache[lower] = null;
          }
        }));
        setWalletMap(map);
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [token]);

  const pending  = txs.filter(t => t.status==='pending').length;
  const executed = txs.filter(t => t.status==='executed').length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} className="space-y-6">
      <AnimatePresence>
      {frozen && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 px-5 py-4 rounded-2xl shadow-sm overflow-hidden">
          <XCircle className="w-6 h-6 text-red-500" />
          <div>
            <p className="font-bold">{t('wallet_frozen')}</p>
            <p className="text-sm opacity-80">{t('wallet_frozen_sub')}</p>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      <motion.div layout transition={{ type: 'spring' }} className="rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl shadow-emerald-900/10"
        style={{background:'linear-gradient(135deg, #022c22 0%, #064e3b 40%, #059669 100%)'}}>
        <div className="absolute top-[-40px] right-[-40px] w-64 h-64 rounded-full bg-white/5 backdrop-blur-3xl pointer-events-none"/>
        <div className="absolute bottom-[-20px] right-[80px] w-48 h-48 rounded-full bg-white/5 backdrop-blur-xl pointer-events-none"/>
        
        <div className="relative z-10">
          <p className="text-emerald-200/80 text-sm font-semibold mb-1 uppercase tracking-wider">{t('balance')}</p>
          {loading
            ? <div className="skeleton h-14 w-64 bg-white/10 rounded-2xl mt-1 mb-5"/>
            : <p className="text-6xl font-black tracking-tight mb-5">
                {Number(balance||0).toLocaleString()}
                <span className="text-2xl font-bold text-emerald-300 ml-3">BDT</span>
              </p>
          }
          <div className="flex items-center gap-2 flex-wrap mb-8">
            {user.role === 'agent' && (
              <span className="flex items-center gap-1.5 bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                <Building2 className="w-3 h-3" /> Agent
              </span>
            )}
            <span className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 backdrop-blur-md">
              <span className="text-xs font-semibold text-emerald-100 opacity-90 tracking-wide">{user.phone}</span>
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/send"
              className="flex items-center justify-center gap-2 bg-white text-emerald-800 font-bold px-6 py-3 rounded-xl hover:bg-emerald-50 transition-all hover:shadow-lg hover:shadow-white/20 hover:-translate-y-0.5 text-sm w-full sm:w-auto">
              <Send className="w-4 h-4" />
              {t('send_money_btn')}
            </Link>
            <div className="flex-1 w-full sm:max-w-xs">
              <FreezeButton token={token} isFrozen={frozen} onStatusChange={setFrozen}/>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {icon: <LayoutGrid className="w-5 h-5"/>, label:t('total_transactions'), val:txs.length,  color:'bg-indigo-50 text-indigo-600', d:'stagger-1'},
          {icon: <Activity className="w-5 h-5"/>,   label:t('pending_label'),       val:pending,     color:'bg-amber-50 text-amber-600', d:'stagger-2'},
          {icon: <CheckCircle className="w-5 h-5"/>,label:t('completed'),            val:executed,    color:'bg-emerald-50 text-emerald-600', d:'stagger-3'},
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + (i * 0.1) }}
            className={`card border border-slate-100 hover:shadow-xl hover:border-emerald-200 cursor-default transition-all duration-300`}>
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3 shadow-sm`}>{s.icon}</div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{s.val}</p>
          </motion.div>
        ))}
      </motion.div>
      <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card border-slate-100">
        <div className="flex items-center justify-between mb-5 px-1">
          <h2 className="text-lg font-bold text-slate-800">{t('recent_transactions')}</h2>
          <button onClick={fetchData} className="text-xs font-semibold text-slate-400 hover:text-emerald-600 flex items-center gap-1.5 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> {t('refresh')}
          </button>
        </div>
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i=><div key={i} className="flex gap-4 p-2"><Skeleton className="w-10 h-10 rounded-2xl flex-shrink-0"/><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4 rounded-md"/><Skeleton className="h-3 w-1/2 rounded-md"/></div></div>)}</div>
        ) : txs.length===0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
              <Activity className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-600 font-semibold">{t('no_transactions')}</p>
            <p className="text-slate-400 text-sm mt-1 mb-6">{t('no_transactions_sub')}</p>
            <Link to="/send" className="btn btn-primary inline-flex"><Send className="w-4 h-4"/> {t('send_money_btn')}</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {txs.map((tx,i) => <TxRow key={tx.id} tx={tx} userWallet={user.wallet} walletMap={walletMap} index={i}/>)}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
