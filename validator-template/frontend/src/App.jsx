import { useState, useEffect } from 'react';
import {
  ShieldCheck, ShieldAlert, LogOut, Clock, Shield, Activity,
  AlertTriangle, RefreshCw, Zap, Database, Radio, DollarSign,
  Terminal, X
} from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('val_token'));
  const [nodeInfo, setNodeInfo] = useState(null);
  const [flags, setFlags] = useState([]);
  const [events, setEvents] = useState([]);
  const [votes, setVotes] = useState([]);
  const [earnings, setEarnings] = useState({ total: 0, earnings: [] });
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [voted, setVoted] = useState(new Set());

  const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const GATEWAY = 'http://localhost:5000';

  const fetchStatus = async (t) => {
    try {
      const [rn, rf, re, rv] = await Promise.all([
        fetch(`${API}/node-status`),
        fetch(`${API}/pending-flags`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API}/events`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API}/votes`, { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      if (rn.ok) {
        const info = await rn.json();
        setNodeInfo(info);
        // Fetch earnings for this node from gateway
        try {
          const er = await fetch(`${GATEWAY}/gateway/node-earnings/${info.validatorId}`);
          if (er.ok) setEarnings(await er.json());
        } catch {}
      }
      if (rf.ok) setFlags(await rf.json());
      if (re.ok) setEvents(await re.json());
      if (rv.ok) setVotes(await rv.json());
    } catch {}
  };

  useEffect(() => {
    if (token) { fetchStatus(token); const iv = setInterval(() => fetchStatus(token), 5000); return () => clearInterval(iv); }
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: e.target.u.value, password: e.target.p.value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('val_token', data.token); setToken(data.token);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleVote = async (txId) => {
    try {
      await fetch(`${API}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ txId, action: 'ban' })
      });
      setVoted(prev => new Set([...prev, txId]));
      fetchStatus(token);
    } catch {}
  };

  // ─── Login Screen ───
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(160deg, #020d07, #050e09 40%, #0d1a13)' }}>
        <div className="absolute top-[-100px] left-[-60px] w-[350px] h-[350px] rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />
        <form onSubmit={handleLogin} className="relative z-10 w-full max-w-sm">
          <div className="rounded-3xl border border-white/8 p-8 shadow-2xl" style={{ background: 'rgba(5,14,9,0.8)', backdropFilter: 'blur(24px)' }}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/30">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white">Validator Node</h1>
              <p className="text-emerald-500/40 text-sm mt-1">Authorized access only</p>
            </div>
            {error && <div className="flex items-center gap-2 bg-red-950/30 border border-red-500/20 text-red-400 text-sm px-4 py-2.5 rounded-xl mb-5"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="space-y-3">
              <input name="u" defaultValue="admin" className="w-full px-4 py-3.5 bg-black/40 border border-white/8 rounded-2xl text-white outline-none focus:border-emerald-500 text-sm" placeholder="Username" required />
              <input name="p" type="password" defaultValue="admin" className="w-full px-4 py-3.5 bg-black/40 border border-white/8 rounded-2xl text-white outline-none focus:border-emerald-500 text-sm" placeholder="Password" required />
              <button disabled={loading} className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-bold text-sm transition-all active:scale-[0.98]">
                {loading ? 'Authenticating…' : 'Authenticate'}
              </button>
            </div>
            <p className="text-center text-white/15 text-[11px] mt-6">Demo: admin / admin</p>
          </div>
        </form>
      </div>
    );
  }

  // ─── Dashboard ───
  const online = nodeInfo?.status === 'online';
  const activePending = flags.filter(t => !t.executed && !t.cancelled);

  const tabs = [
    { id: 'pending', label: 'Pending Review', count: activePending.length, icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'events', label: 'Events', count: events.length, icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'votes', label: 'Vote Log', count: votes.length, icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'earnings', label: 'Node Earnings', count: null, icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'logs', label: 'Node Logs', count: null, icon: <Terminal className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen relative z-10">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/5" style={{ background: 'rgba(5,14,9,0.88)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse-dot' : 'bg-red-500'}`} />
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">Validator <span className="text-emerald-400 font-black">#{nodeInfo?.validatorId || '?'}</span></span>
          </div>
          <div className="flex items-center gap-3">
            {online && (
              <div className="hidden md:flex items-center gap-4 text-[11px] text-white/30 font-mono mr-2">
                <span><Database className="w-3 h-3 inline mr-1" />Block <strong className="text-white/60">{nodeInfo?.blockHeight}</strong></span>
                <span><Zap className="w-3 h-3 inline mr-1" /><strong className="text-emerald-400/70">{nodeInfo?.latencyMs}ms</strong></span>
                <span><DollarSign className="w-3 h-3 inline mr-1" />Earned <strong className="text-amber-400">{earnings.total?.toFixed(3)} BDT</strong></span>
              </div>
            )}
            <button onClick={() => fetchStatus(token)} className="p-2 rounded-lg text-white/20 hover:text-emerald-400 hover:bg-white/5 transition-all"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={() => { localStorage.removeItem('val_token'); setToken(null); }} className="p-2 rounded-lg text-white/20 hover:text-red-400 transition-all"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Status', val: online ? 'Online' : 'Offline', classes: online ? 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20' : 'from-red-500/20 to-red-600/5 border-red-500/20' },
            { label: 'Pending', val: activePending.length, classes: activePending.length > 0 ? 'from-amber-500/20 to-amber-600/5 border-amber-500/20' : 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20' },
            { label: 'Events', val: events.length, classes: 'from-blue-500/20 to-blue-600/5 border-blue-500/20' },
            { label: 'Votes', val: votes.length, classes: 'from-purple-500/20 to-purple-600/5 border-purple-500/20' },
            { label: 'Earned', val: `${(earnings.total || 0).toFixed(3)}`, classes: 'from-amber-500/20 to-amber-600/5 border-amber-500/20' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-5 border bg-gradient-to-br ${s.classes} transition-all hover:scale-[1.02]`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-1">{s.label}</p>
              <p className="text-2xl font-black text-white">{s.val}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-white/5 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap
                ${tab === t.id ? 'text-emerald-400 border-emerald-400' : 'text-white/30 border-transparent hover:text-white/50'}`}>
              {t.icon} {t.label}
              {t.count != null && t.count > 0 && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white/10">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* PENDING — only Vote Ban, no reject */}
        {tab === 'pending' && (activePending.length === 0 ? (
          <EmptyState icon={<ShieldCheck />} title="All clear" sub="No pending transactions require validation" />
        ) : (
          <div className="space-y-4">
            {activePending.map((tx, i) => (
              <div key={tx.txId} className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 hover:border-amber-500/20 transition-all animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/15 px-2.5 py-1 rounded-lg">TX #{tx.txId}</span>
                  {tx.recipientFlagged && <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/15 px-2 py-1 rounded-lg"><AlertTriangle className="w-3 h-3" /> {tx.flagCount} Flags</span>}
                  {tx.riskScore >= 40 && <span className="text-xs font-bold text-red-300 bg-red-500/10 px-2 py-1 rounded-lg">Risk: {tx.riskScore}</span>}
                  {tx.source === 'gateway' && <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md uppercase">Via Gateway</span>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: 'From', val: tx.sender },
                    { label: 'To', val: tx.recipient },
                    { label: 'Amount', val: null, amt: tx.amount },
                  ].map(f => (
                    <div key={f.label} className="bg-white/[0.02] rounded-xl p-3 border border-white/5">
                      <p className="text-[10px] text-white/25 uppercase tracking-wider font-bold mb-1">{f.label}</p>
                      {f.amt != null
                        ? <p className="text-xl font-black text-white">{Number(f.amt).toLocaleString()} <span className="text-xs text-white/30">BDT</span></p>
                        : <p className="text-xs font-mono text-white/50 break-all">{f.val}</p>}
                    </div>
                  ))}
                </div>
                {tx.riskReasons?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {tx.riskReasons.map((r, i) => <span key={i} className="text-[11px] bg-amber-900/15 text-amber-300/80 border border-amber-800/20 px-2.5 py-1 rounded-lg">⚡ {r}</span>)}
                  </div>
                )}
                <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                  <button onClick={() => handleVote(tx.txId)} disabled={voted.has(tx.txId)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-30
                      bg-gradient-to-r from-red-600/20 to-red-700/10 hover:from-red-600/30 text-red-400 border border-red-500/20 hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/10">
                    <ShieldAlert className="w-4 h-4" /> {voted.has(tx.txId) ? '✓ Vote Recorded' : 'Vote to Ban'}
                  </button>
                  <span className="ml-auto text-[11px] text-white/15 font-mono">{tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* EVENTS — Timeline style (unique to validator) */}
        {tab === 'events' && (events.length === 0 ? (
          <EmptyState icon={<Activity />} title="No events yet" sub="Events appear when transactions are processed" />
        ) : (
          <div className="relative pl-8">
            {/* Timeline line */}
            <div className="absolute left-[13px] top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/30 via-white/10 to-transparent" />
            {events.slice(-50).reverse().map((tx, i) => {
              const status = tx.executed ? 'executed' : tx.cancelled ? 'cancelled' : (tx.status || 'pending');
              const colors = { executed: 'bg-emerald-500 shadow-emerald-500/40', cancelled: 'bg-red-500 shadow-red-500/40', pending: 'bg-amber-500 shadow-amber-500/40' };
              const labels = { executed: 'CONFIRMED', cancelled: 'REJECTED', pending: 'PENDING' };
              const borders = { executed: 'border-emerald-500/20', cancelled: 'border-red-500/20', pending: 'border-amber-500/20' };
              return (
                <div key={i} className="relative mb-4 animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                  {/* Timeline dot */}
                  <div className={`absolute -left-8 top-5 w-3 h-3 rounded-full ${colors[status]} shadow-lg ring-4 ring-[#050e09]`} />
                  {/* Card */}
                  <div className={`rounded-2xl border ${borders[status]} bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-all`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white/40">TX #{tx.txId}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${status === 'executed' ? 'bg-emerald-500/15 text-emerald-300' : status === 'cancelled' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>
                          {labels[status]}
                        </span>
                        {tx.source === 'gateway' && <span className="text-[9px] font-bold text-blue-400/60 bg-blue-500/8 px-1.5 py-0.5 rounded">GATEWAY</span>}
                      </div>
                      <span className="text-[11px] text-white/20 font-mono">{tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : ''}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs font-mono text-white/35">
                          <span className="truncate max-w-[120px]">{tx.sender?.slice(0, 14)}…</span>
                          <span className="text-emerald-500/40">→</span>
                          <span className="truncate max-w-[120px]">{tx.recipient?.slice(0, 14)}…</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-black text-white">{Number(tx.amount).toLocaleString(undefined, {minimumFractionDigits: 3, maximumFractionDigits: 3})} <span className="text-[10px] text-white/25">BDT</span></p>
                        {tx.fee > 0 && <p className="text-[10px] text-amber-400/60">fee: {tx.fee.toFixed(3)}</p>}
                      </div>
                      {tx.riskScore > 0 && (
                        <div className="flex-shrink-0 w-16">
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${tx.riskScore >= 45 ? 'bg-red-500' : tx.riskScore >= 25 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, tx.riskScore)}%` }} />
                          </div>
                          <p className="text-[9px] text-white/20 text-center mt-0.5">Risk {tx.riskScore}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* VOTES */}
        {tab === 'votes' && (votes.length === 0 ? (
          <EmptyState icon={<ShieldCheck />} title="No votes yet" sub="Your governance actions will appear here" />
        ) : (
          <div className="rounded-2xl border border-white/5 overflow-hidden bg-white/[0.01]">
            {votes.slice().reverse().map((v, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/3 last:border-0 hover:bg-white/[0.02]">
                <span className="text-xs font-black px-3 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/15">🛡 BAN</span>
                <span className="text-xs font-mono text-white/30">TX #{v.txId}</span>
                <span className="text-xs text-white/40 flex-1 truncate">{v.reason || '—'}</span>
                <span className="text-[11px] text-white/20 font-mono">{new Date(v.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        ))}

        {/* EARNINGS */}
        {tab === 'earnings' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-400/60 mb-1">Total Earned (Node #{nodeInfo?.validatorId})</p>
              <p className="text-4xl font-black text-white">{(earnings.total || 0).toFixed(3)} <span className="text-lg text-amber-400">BDT</span></p>
              <p className="text-xs text-white/30 mt-2">1% fee per transaction, split equally across 3 nodes</p>
            </div>
            {earnings.earnings?.length > 0 ? (
              <div className="rounded-2xl border border-white/5 overflow-hidden bg-white/[0.01]">
                <div className="px-5 py-3 bg-white/[0.02] text-[10px] text-white/25 uppercase tracking-wider font-bold border-b border-white/5 flex gap-4">
                  <span className="w-16">TX</span><span className="flex-1">Amount</span><span className="w-32 text-right">Time</span>
                </div>
                {earnings.earnings.map((e, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-white/3 last:border-0 text-sm">
                    <span className="text-xs font-mono text-white/30 w-16">#{e.tx_id}</span>
                    <span className="flex-1 font-bold text-amber-400">+{e.amount.toFixed(3)} BDT</span>
                    <span className="text-[11px] text-white/20 w-32 text-right">{new Date(e.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={<DollarSign />} title="No earnings yet" sub="Earnings appear when transactions are processed" />}
          </div>
        )}

        {/* LOGS */}
        {tab === 'logs' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/5 bg-black/40 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">Node Information</span>
              </div>
              <div className="font-mono text-xs space-y-2 text-emerald-400/80">
                <p><span className="text-white/30">Validator ID:</span> {nodeInfo?.validatorId || '—'}</p>
                <p><span className="text-white/30">RPC URL:</span> {nodeInfo?.rpcUrl || '—'}</p>
                <p><span className="text-white/30">Status:</span> <span className={online ? 'text-emerald-400' : 'text-red-400'}>{nodeInfo?.status || '—'}</span></p>
                <p><span className="text-white/30">Block Height:</span> {nodeInfo?.blockHeight ?? '—'}</p>
                <p><span className="text-white/30">Chain ID:</span> {nodeInfo?.chainId ?? '—'}</p>
                <p><span className="text-white/30">Latency:</span> {nodeInfo?.latencyMs ?? '—'}ms</p>
                <p><span className="text-white/30">On-chain TX Count:</span> {nodeInfo?.txCounter ?? '—'}</p>
                <p><span className="text-white/30">Pending in Memory:</span> {nodeInfo?.pendingCount ?? '—'}</p>
                <p><span className="text-white/30">Total Earned:</span> <span className="text-amber-400">{(earnings.total || 0).toFixed(3)} BDT</span></p>
                <p><span className="text-white/30">Gateway API:</span> {API}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-black/40 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-white">Contract Addresses</span>
              </div>
              <div className="font-mono text-[11px] space-y-2 text-blue-400/70 break-all">
                <p><span className="text-white/30">Transfer:</span> {import.meta.env.VITE_TRANSFER_CONTRACT || '0x5FbDB2315678afecb367f032d93F642f64180aa3'}</p>
                <p><span className="text-white/30">DAO:</span> {import.meta.env.VITE_DAO_CONTRACT || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'}</p>
                <p><span className="text-white/30">FlagRegistry:</span> {import.meta.env.VITE_FLAG_CONTRACT || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'}</p>
                <p><span className="text-white/30">Freeze:</span> {import.meta.env.VITE_FREEZE_CONTRACT || '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 py-5 mt-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-white/10">
          <span>Validator #{nodeInfo?.validatorId || '?'} · {nodeInfo?.rpcUrl || API}</span>
          <span>Bangla Coin · Team SUST SONGLAP</span>
        </div>
      </footer>
    </div>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 border border-white/5 rounded-3xl bg-white/[0.01]">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-500/30">{icon}</div>
      <p className="text-white/30 font-semibold text-sm">{title}</p>
      <p className="text-white/15 text-xs mt-1">{sub}</p>
    </div>
  );
}
