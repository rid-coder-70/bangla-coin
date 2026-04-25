import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link2, Search, CheckCircle2, Clock, XCircle, ShieldAlert, Hash, RefreshCw, ChevronDown } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STATUS_STYLE = {
  executed:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  pending:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: <Clock className="w-3.5 h-3.5" /> },
  cancelled: { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     icon: <XCircle className="w-3.5 h-3.5" /> },
};

function RiskBar({ score }) {
  const color = score >= 45 ? 'bg-red-500' : score >= 25 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-600 w-6">{score}</span>
    </div>
  );
}

function TxCard({ tx, index }) {
  const [expanded, setExpanded] = useState(false);
  const s = STATUS_STYLE[tx.status] || STATUS_STYLE.pending;
  const reasons = (() => { try { return JSON.parse(tx.risk_reasons || '[]'); } catch { return []; } })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="border border-slate-100 rounded-2xl overflow-hidden hover:border-emerald-200 hover:shadow-sm transition-all"
    >
      {/* Main row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Chain link icon */}
        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
          <Link2 className="w-4 h-4 text-slate-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-400">#{tx.id}</span>
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
              {s.icon} {tx.status}
            </span>
            {tx.risk_score >= 40 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                <ShieldAlert className="w-3 h-3" /> High Risk
              </span>
            )}
          </div>
          <div className="flex gap-3 mt-1.5 text-xs text-slate-500 font-mono flex-wrap">
            <span className="truncate max-w-[120px]" title={tx.sender}>{tx.sender?.slice(0, 10)}…</span>
            <span className="text-slate-300">→</span>
            <span className="truncate max-w-[120px]" title={tx.recipient}>{tx.recipient?.slice(0, 10)}…</span>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-slate-800">{Number(tx.amount).toLocaleString()} <span className="text-xs font-medium text-slate-400">BDT</span></p>
          <p className="text-[11px] text-slate-400 mt-0.5">{new Date(tx.created_at).toLocaleString()}</p>
        </div>

        <ChevronDown className={`w-4 h-4 text-slate-300 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-50 bg-slate-50/50 p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Risk Score</p>
              <RiskBar score={tx.risk_score} />
            </div>
            <div>
              <p className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Delay</p>
              <p className="font-bold text-slate-700">{tx.delay_seconds}s</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Chain TX ID</p>
              <p className="font-mono text-slate-600">{tx.tx_id >= 0 ? `#${tx.tx_id}` : 'Off-chain'}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Settled At</p>
              <p className="text-slate-600">{tx.executed_at ? new Date(tx.executed_at).toLocaleTimeString() : tx.cancelled_at ? new Date(tx.cancelled_at).toLocaleTimeString() : '—'}</p>
            </div>
          </div>

          {/* Risk reasons */}
          {reasons.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Risk Flags</p>
              <div className="flex flex-wrap gap-1.5">
                {reasons.map((r, i) => (
                  <span key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-lg font-medium">{r}</span>
                ))}
              </div>
            </div>
          )}

          {/* Hash chain */}
          {tx.hash && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1"><Hash className="w-3 h-3" /> Block Hash</p>
              <p className="text-xs font-mono text-slate-500 break-all bg-white px-3 py-2 rounded-lg border border-slate-100">{tx.hash}</p>
              {tx.prev_hash && (
                <p className="text-[10px] text-slate-400 mt-1 font-mono">← prev: {tx.prev_hash.slice(0, 40)}…</p>
              )}
            </div>
          )}

          {/* Full addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">From</p>
              <p className="text-xs font-mono text-slate-600 break-all">{tx.sender}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-0.5">To</p>
              <p className="text-xs font-mono text-slate-600 break-all">{tx.recipient}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function Explorer({ token }) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchTxs = async () => {
    try {
      const r = await fetch(`${API}/ledger`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setTxs(await r.json());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTxs(); }, [token]);

  const filtered = txs
    .filter(tx => filter === 'all' || tx.status === filter)
    .filter(tx => !search || tx.sender?.includes(search) || tx.recipient?.includes(search) || String(tx.id).includes(search));

  const counts = { all: txs.length, pending: txs.filter(t => t.status === 'pending').length, executed: txs.filter(t => t.status === 'executed').length, cancelled: txs.filter(t => t.status === 'cancelled').length };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Block Explorer</h1>
          <p className="text-sm text-slate-500 mt-0.5">Hash-linked transaction ledger — full chain of custody</p>
        </div>
        <button onClick={fetchTxs} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-emerald-600 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'pending', 'executed', 'cancelled'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all capitalize ${filter === f ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            {f} <span className="ml-1 text-xs opacity-70">({counts[f]})</span>
          </button>
        ))}

        {/* Search */}
        <div className="ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search address or ID…"
            className="pl-8 pr-3 py-1.5 text-sm rounded-xl border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all w-56"
          />
        </div>
      </div>

      {/* Tx list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl">
          <Hash className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">No transactions found</p>
          <p className="text-slate-400 text-sm mt-1">Transactions will appear here once sent</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx, i) => <TxCard key={tx.id} tx={tx} index={i} />)}
        </div>
      )}
    </motion.div>
  );
}
