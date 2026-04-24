import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Landmark, Vote, Edit3, RefreshCw, ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react';
import Toast from '../components/Toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const GROUP_ID = 1;

function VoteBar({ yes, total }) {
  const pct = total > 0 ? Math.round((yes / total) * 100) : 0;
  const majority = pct > 50;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5 font-semibold">
        <span className={majority ? 'text-emerald-700' : 'text-slate-500'}>{yes} yes / {total - yes} no</span>
        <span className={majority ? 'text-emerald-700 font-bold' : 'text-slate-400'}>{pct}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner">
        <div className={`h-2.5 rounded-full transition-all duration-700 ${majority ? 'bg-emerald-500' : 'bg-amber-400'}`}
          style={{ width: `${pct}%` }}/>
      </div>
    </div>
  );
}

function ProposalCard({ p, onVote, index }) {
  const { t } = useTranslation();
  const majority = p.yes_votes * 2 > p.total_members;
  return (
    <div className={`card border-2 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 animate-slide-up stagger-${Math.min(index+1,4)} ${p.executed ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-bold text-slate-800 text-base">{p.description || t('community_spend')}</p>
          <p className="text-xs text-slate-500 font-mono mt-1 opacity-80">{p.recipient?.substring(0,16)}…</p>
        </div>
        <div className="text-right flex-shrink-0 ml-4 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
          <p className="text-lg font-black text-emerald-700">{Number(p.amount).toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">BDT</p>
        </div>
      </div>
      {p.executed && (
        <div className="flex items-center gap-2 bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl mb-4 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4" /> {t('funds_released')}
        </div>
      )}
      <VoteBar yes={p.yes_votes} total={p.total_members || 1}/>
      {!p.executed && (
        <div className="flex gap-3 mt-5">
          <button onClick={() => onVote(p.id, true)}
            className="flex-1 btn bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:shadow-emerald-100 border border-emerald-200 text-sm py-2 font-bold shadow-sm">
            <ThumbsUp className="w-4 h-4" /> {t('approve')}
          </button>
          <button onClick={() => onVote(p.id, false)}
            className="flex-1 btn bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-red-100 border border-red-200 text-sm py-2 font-bold shadow-sm">
            <ThumbsDown className="w-4 h-4" /> {t('reject')}
          </button>
        </div>
      )}
    </div>
  );
}

export default function DAO({ token }) {
  const { t } = useTranslation();
  const [proposals, setProposals] = useState([]);
  const [treasury, setTreasury]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount]       = useState('');
  const [desc, setDesc]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState('');
  const [error, setError]         = useState('');

  const fetchProposals = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        fetch(`${API}/dao/proposals/${GROUP_ID}`, { headers:{Authorization:`Bearer ${token}`} }),
        fetch(`${API}/dao/treasury/${GROUP_ID}`,  { headers:{Authorization:`Bearer ${token}`} }),
      ]);
      if (pRes.ok) setProposals(await pRes.json());
      if (tRes.ok) { const d = await tRes.json(); setTreasury(d.treasury); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchProposals();
    const interval = setInterval(fetchProposals, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const handlePropose = async (e) => {
    e.preventDefault(); setSubmitting(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/dao/propose`, {
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({ groupId:GROUP_ID, recipient, amount:Number(amount), description:desc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(t('proposal_success'));
      setRecipient(''); setAmount(''); setDesc('');
      fetchProposals();
    } catch(err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleVote = async (proposalId, approve) => {
    setError('');
    try {
      const res = await fetch(`${API}/dao/vote`, {
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({ proposalId, approve }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchProposals();
    } catch(err) { setError(err.message); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Toast message={success} type="success" onClose={() => setSuccess('')} />
      <Toast message={error} type="error" onClose={() => setError('')} />

      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-slate-800">{t('community_wallet')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('community_subtitle')}</p>
      </div>

      {/* Treasury */}
      <div className="rounded-[24px] p-6 text-white animate-slide-up stagger-1 shadow-lg"
        style={{background:'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'}}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-semibold uppercase tracking-wider">{t('community_treasury')}</p>
            <div className="flex items-end gap-3 mt-1">
              {treasury === null ? (
                <div className="skeleton h-10 w-32 bg-white/10 rounded-xl"/>
              ) : (
                <p className="text-4xl font-black">
                  {Number(treasury).toLocaleString()}
                  <span className="text-xl text-blue-200 font-bold ml-2">BDT</span>
                </p>
              )}
              {/* Live indicator */}
              <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1 mb-1 border border-white/15">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Live</span>
              </div>
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
            <Landmark className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="flex gap-4 mt-6 text-sm">
          <div className="bg-black/20 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10">
            <span className="text-blue-200">{t('proposals_label')}: </span>
            <span className="font-bold ml-1">{proposals.length}</span>
          </div>
          <div className="bg-black/20 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10">
            <span className="text-blue-200">{t('passed_label')}: </span>
            <span className="font-bold ml-1">{proposals.filter(p=>p.executed).length}</span>
          </div>
        </div>
      </div>

      {/* Create Proposal */}
      <div className="card animate-slide-up stagger-2 border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Edit3 className="w-5 h-5 text-emerald-600" /> {t('new_proposal')}
        </h2>
        <form onSubmit={handlePropose} className="space-y-4">
          <input value={recipient} onChange={e=>setRecipient(e.target.value)}
            className="input font-mono text-sm bg-slate-50" placeholder={t('proposal_recipient')} required/>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
                className="input pr-12 bg-slate-50 font-bold" placeholder={t('proposal_amount')} required min="1"/>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">BDT</span>
            </div>
            <input value={desc} onChange={e=>setDesc(e.target.value)}
              className="input bg-slate-50" placeholder={t('proposal_desc')} required/>
          </div>
          <button type="submit" disabled={submitting} className="w-full btn btn-primary disabled:opacity-60 text-base py-3">
            {submitting ? t('creating') : t('create_proposal')}
          </button>
        </form>
      </div>

      {/* Proposals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Vote className="w-5 h-5 text-emerald-600" /> {t('active_proposals')}
          </h2>
          <button onClick={fetchProposals} className="text-xs font-semibold text-slate-400 hover:text-emerald-600 flex items-center gap-1.5 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> {t('refresh')}
          </button>
        </div>
        {loading ? (
          <div className="space-y-4">{[1,2].map(i=><div key={i} className="card"><div className="skeleton h-24 rounded-xl"/></div>)}</div>
        ) : proposals.length===0 ? (
          <div className="card text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
              <Vote className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-600 font-semibold">{t('no_proposals')}</p>
            <p className="text-slate-400 text-sm mt-1">{t('no_proposals_sub')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((p,i)=><ProposalCard key={p.id} p={p} onVote={handleVote} index={i}/>)}
          </div>
        )}
      </div>
    </div>
  );
}
