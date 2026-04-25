import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Send as SendIcon, Users, LogOut, Globe, Fingerprint,
         Phone, ShieldCheck, User, ArrowRight, ChevronLeft, Sparkles, Building2, Hash } from 'lucide-react';
import Home     from './pages/Home';
import Send     from './pages/Send';
import DAO      from './pages/DAO';
import AgentPage from './pages/Agent';
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const fadeUp = { initial:{opacity:0,y:24}, animate:{opacity:1,y:0}, exit:{opacity:0,y:-16}, transition:{duration:0.35,ease:[0.16,1,0.3,1]} };

function AuthBg({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
      style={{background:'linear-gradient(145deg,#020d07 0%,#021a10 30%,#032b17 60%,#064e3b 100%)'}}>

      <div className="absolute top-[-120px] left-[-80px] w-[400px] h-[400px] rounded-full opacity-20 blur-3xl"
        style={{background:'radial-gradient(circle,#10b981,transparent 70%)'}}/>
      <div className="absolute bottom-[-80px] right-[-60px] w-[350px] h-[350px] rounded-full opacity-15 blur-3xl"
        style={{background:'radial-gradient(circle,#34d399,transparent 70%)'}}/>
      <div className="absolute top-[40%] right-[10%] w-[200px] h-[200px] rounded-full opacity-10 blur-2xl"
        style={{background:'radial-gradient(circle,#6ee7b7,transparent 70%)'}}/>


      <div className="absolute inset-0 opacity-[0.03]"
        style={{backgroundImage:'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)',backgroundSize:'40px 40px'}}/>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[22px] mb-5 relative"
            style={{background:'linear-gradient(135deg,#059669,#10b981)'}}>
            <div className="absolute inset-0 rounded-[22px] animate-pulse-ring opacity-50"
              style={{boxShadow:'0 0 0 8px rgba(16,185,129,0.15),0 0 40px rgba(16,185,129,0.3)'}}/>
            <Fingerprint className="w-10 h-10 text-white drop-shadow-lg" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">বাংলা <span className="text-emerald-400">Coin</span></h1>
          <p className="text-emerald-300/60 mt-2 text-sm font-medium">Friction-First Blockchain Money</p>
        </div>
        {children}
        <p className="text-center text-emerald-100/20 text-xs mt-8 font-medium">Team SUST SONGLAP · Friction Hackathon 2026</p>
      </div>
    </div>
  );
}

function AuthCard({ children }) {
  return (
    <div className="rounded-[28px] p-8 border border-white/8 shadow-2xl"
      style={{background:'rgba(2,21,13,0.7)',backdropFilter:'blur(24px)'}}>
      {children}
    </div>
  );
}
function AuthInput({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400/60 pointer-events-none"/>}
      <input {...props}
        className={`w-full ${Icon ? 'pl-11' : 'pl-4'} pr-4 py-3.5 rounded-2xl border border-white/8 text-white placeholder:text-white/25 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-base font-medium`}
        style={{background:'rgba(0,0,0,0.3)'}}
      />
    </div>
  );
}

function LoginPage({ onLogin, onGoSignup }) {
  const { t } = useTranslation();
  const [phone, setPhone]   = useState('');
  const [otp, setOtp]       = useState('');
  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res  = await fetch(`${API}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep(2);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res  = await fetch(`${API}/auth/verify-otp`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone, otp }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.token);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <AuthBg>
      <motion.div {...fadeUp}>
        <AuthCard>
          <div className="mb-6">
            <h2 className="text-2xl font-black text-white">
              {step === 1 ? 'Welcome back' : 'Verify OTP'}
            </h2>
            <p className="text-emerald-200/50 text-sm mt-1 font-medium">
              {step === 1 ? 'Login to your Bangla Coin wallet' : `OTP sent to ${phone}`}
            </p>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-emerald-500' : 'bg-white/10'}`}/>
            <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-emerald-500' : 'bg-white/10'}`}/>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form key="step1" {...fadeUp} onSubmit={handleSendOtp} className="space-y-4">
                <AuthInput icon={Phone} value={phone} onChange={e=>setPhone(e.target.value)}
                  type="tel" required placeholder={t('phone_placeholder')}/>
                {error && <p className="text-red-300 text-sm bg-red-900/30 px-3 py-2 rounded-xl border border-red-500/20 font-medium">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-base transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/25 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                  {loading ? <span className="animate-pulse">Sending…</span> : <><span>Send OTP</span><ArrowRight className="w-4 h-4"/></>}
                </button>
              </motion.form>
            ) : (
              <motion.form key="step2" {...fadeUp} onSubmit={handleVerify} className="space-y-4">
                <AuthInput icon={ShieldCheck} value={otp} onChange={e=>setOtp(e.target.value)}
                  type="text" maxLength={6} required placeholder="• • • • • •"
                  style={{background:'rgba(0,0,0,0.3)',textAlign:'center',letterSpacing:'0.4em',fontSize:'1.4rem',fontWeight:800}}/>
                <p className="text-center text-emerald-300/40 text-xs font-medium">Demo OTP: <span className="text-emerald-300/70 font-bold">123456</span></p>
                {error && <p className="text-red-300 text-sm bg-red-900/30 px-3 py-2 rounded-xl border border-red-500/20 font-medium">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-base transition-all hover:shadow-xl hover:shadow-emerald-500/25 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                  {loading ? <span className="animate-pulse">Verifying…</span> : <><span>Verify &amp; Login</span><ArrowRight className="w-4 h-4"/></>}
                </button>
                <button type="button" onClick={() => { setStep(1); setOtp(''); setError(''); }}
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-emerald-200/40 hover:text-emerald-200/70 transition-colors py-1">
                  <ChevronLeft className="w-3.5 h-3.5"/> Change number
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-6 pt-5 border-t border-white/8 text-center">
            <p className="text-white/30 text-sm">Don't have an account?{' '}
              <button onClick={onGoSignup} className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">
                Create Wallet
              </button>
            </p>
          </div>
        </AuthCard>
      </motion.div>
    </AuthBg>
  );
}
function SignupPage({ onLogin, onGoLogin }) {
  const [name, setName]     = useState('');
  const [phone, setPhone]   = useState('');
  const [otp, setOtp]       = useState('');
  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res  = await fetch(`${API}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep(2);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res  = await fetch(`${API}/auth/verify-otp`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ phone, otp, name }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.token);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const steps = ['Details', 'Verify OTP', 'Wallet Ready'];

  return (
    <AuthBg>
      <motion.div {...fadeUp}>
        <AuthCard>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Sparkles className="w-4 h-4 text-emerald-400"/>
              </div>
              <span className="text-emerald-400 text-sm font-bold">New Account</span>
            </div>
            <h2 className="text-2xl font-black text-white">Create your Wallet</h2>
            <p className="text-emerald-200/50 text-sm mt-1 font-medium">
              A secure crypto wallet will be generated for you instantly
            </p>
          </div>


          <div className="flex items-center gap-2 mb-7">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 transition-all duration-400 ${i + 1 <= step ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/8 text-white/30'}`}>{i+1}</div>
                {i < steps.length - 1 && <div className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${i + 1 < step ? 'bg-emerald-500' : 'bg-white/8'}`}/>}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form key="s1" {...fadeUp} onSubmit={handleSendOtp} className="space-y-3">
                <AuthInput icon={User} value={name} onChange={e=>setName(e.target.value)}
                  type="text" placeholder="Your full name" />
                <AuthInput icon={Phone} value={phone} onChange={e=>setPhone(e.target.value)}
                  type="tel" required placeholder="Phone number (e.g. 01700000000)"/>
                {error && <p className="text-red-300 text-sm bg-red-900/30 px-3 py-2 rounded-xl border border-red-500/20">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold transition-all hover:shadow-xl hover:shadow-emerald-500/25 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-1">
                  {loading ? 'Sending OTP…' : <><span>Send Verification OTP</span><ArrowRight className="w-4 h-4"/></>}
                </button>
              </motion.form>
            )}
            {step === 2 && (
              <motion.form key="s2" {...fadeUp} onSubmit={handleVerify} className="space-y-4">
                <p className="text-emerald-100/60 text-sm">OTP sent to <strong className="text-white">{phone}</strong></p>
                <AuthInput icon={ShieldCheck} value={otp} onChange={e=>setOtp(e.target.value)}
                  type="text" maxLength={6} required placeholder="• • • • • •"
                  style={{background:'rgba(0,0,0,0.3)',textAlign:'center',letterSpacing:'0.4em',fontSize:'1.4rem',fontWeight:800}}/>
                <p className="text-center text-emerald-300/40 text-xs">Demo OTP: <span className="text-emerald-300/70 font-bold">123456</span></p>
                {error && <p className="text-red-300 text-sm bg-red-900/30 px-3 py-2 rounded-xl border border-red-500/20">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold transition-all hover:shadow-xl hover:shadow-emerald-500/25 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? 'Creating Wallet…' : <><Sparkles className="w-4 h-4"/><span>Create My Wallet</span></>}
                </button>
                <button type="button" onClick={() => { setStep(1); setOtp(''); setError(''); }}
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors py-1">
                  <ChevronLeft className="w-3.5 h-3.5"/> Back
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-6 pt-5 border-t border-white/8 text-center">
            <p className="text-white/30 text-sm">Already have an account?{' '}
              <button onClick={onGoLogin} className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">
                Login
              </button>
            </p>
          </div>
        </AuthCard>
      </motion.div>
    </AuthBg>
  );
}

function LangToggle() {
  const { i18n } = useTranslation();
  const isBn = i18n.language === 'bn';
  return (
    <button onClick={() => i18n.changeLanguage(isBn ? 'en' : 'bn')}
      className="nav-link flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all">
      <Globe className="w-3.5 h-3.5" />
      <span className="text-xs font-bold">{isBn ? 'English' : 'বাংলা'}</span>
    </button>
  );
}

function NavLink({ to, icon: Icon, label }) {
  const loc = useLocation();
  const active = loc.pathname === to;
  return (
    <Link to={to} className={`nav-link ${active ? 'nav-link-active' : ''}`}>
      <Icon className="w-4 h-4" /><span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

function AppShell({ token, onLogout }) {
  const { t } = useTranslation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const initials = user.name ? user.name[0].toUpperCase() : (user.phone || 'U').slice(-2);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50/50 text-slate-900">
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all duration-300 group-hover:scale-105">
                <Fingerprint className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-slate-800 text-lg hidden sm:inline tracking-tight">
                বাংলা <span className="gradient-text font-black">Coin</span>
              </span>
            </Link>

            <div className="flex items-center gap-1">
              <NavLink to="/"          icon={Wallet}   label={t('nav_wallet')} />
              <NavLink to="/send"      icon={SendIcon} label={t('nav_send')} />
              <NavLink to="/dao"       icon={Users}    label={t('nav_dao')} />
              {user.role === 'agent' && <NavLink to="/agent" icon={Building2} label="Agent" />}

              <div className="ml-2 pl-2 border-l border-slate-200 flex items-center gap-2">
                <LangToggle />
                <div className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center text-emerald-700 font-black text-xs select-none"
                  title={user.name || user.phone}>
                  {initials}
                </div>
                <button onClick={onLogout} title={t('logout')}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-5xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/"          element={<Home     token={token} />} />
            <Route path="/send"      element={<Send     token={token} />} />
            <Route path="/dao"       element={<DAO      token={token} />} />
            <Route path="/agent"     element={<AgentPage token={token} />} />
            <Route path="*"          element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default function App() {
  const [token, setToken]   = useState(() => localStorage.getItem('token'));
  const [page, setPage]     = useState('login'); 

  const handleLogin = (t) => {
    setToken(t);
    if (window.location.pathname !== '/') window.history.replaceState(null, '', '/');
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setPage('login');
  };

  if (token) return <AppShell token={token} onLogout={handleLogout} />;

  return (
    <AnimatePresence mode="wait">
      {page === 'login'
        ? <LoginPage  key="login"  onLogin={handleLogin} onGoSignup={() => setPage('signup')} />
        : <SignupPage key="signup" onLogin={handleLogin} onGoLogin={() => setPage('login')} />
      }
    </AnimatePresence>
  );
}
