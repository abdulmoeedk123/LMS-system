import { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import { api } from './api.js';

function Nav() {
  const { user, logout } = useAuth();
  return (
    <header className="nav"><Link to="/" className="brand">Lumen<span>LMS</span></Link>
      <nav>{user ? <><span className="hello">{user.name}</span><button className="btn ghost" onClick={logout}>Sign out</button></>
        : <><Link className="btn ghost" to="/login">Sign in</Link><Link className="btn" to="/login?mode=register">Create account</Link></>}</nav>
    </header>);
}

function Courses() {
  const [list, setList] = useState(null);
  const { user } = useAuth();
  useEffect(() => { api('/courses').then(setList); }, []);
  const owns = c => user?.purchased?.includes(c._id);
  return (
    <main className="wrap">
      <section className="hero"><h1>Learn at your own pace. Unlock premium when you're ready.</h1>
        <p>Free courses to start, premium programs with deep, project-based lessons.</p></section>
      <div className="grid">
        {!list && <p>Loading courses…</p>}
        {list?.map(c => (
          <article className={'card' + (c.premium ? ' premium' : '')} key={c._id}>
            <div className="tags"><span className="tag">{c.level}</span>{c.premium && <span className="tag gold">Premium</span>}</div>
            <h3>{c.title}</h3><p>{c.summary}</p>
            <div className="foot"><strong>{c.premium ? `$${c.price}` : 'Free'}</strong>
              {!c.premium || owns(c) ? <Link className="btn" to={`/learn/${c._id}`}>Start learning</Link>
                : <Link className="btn gold" to={`/checkout/${c._id}`}>Unlock course</Link>}</div>
          </article>))}
      </div>
    </main>);
}

function Login() {
  const { login, register } = useAuth();
  const nav = useNavigate(); const loc = useLocation();
  const [mode, setMode] = useState(new URLSearchParams(loc.search).get('mode') === 'register' ? 'register' : 'login');
  const [f, setF] = useState({ name: '', email: '', password: '' }); const [err, setErr] = useState('');
  const submit = async e => { e.preventDefault(); setErr('');
    try { await (mode === 'login' ? login(f) : register(f)); nav(loc.state?.from || '/'); } catch (x) { setErr(x.message); } };
  const set = k => e => setF({ ...f, [k]: e.target.value });
  return (
    <main className="wrap narrow"><form className="panel" onSubmit={submit}>
      <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
      {mode === 'register' && <label>Full name<input value={f.name} onChange={set('name')} required /></label>}
      <label>Email<input type="email" value={f.email} onChange={set('email')} required /></label>
      <label>Password<input type="password" minLength={6} value={f.password} onChange={set('password')} required /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn full">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
      <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}</button>
    </form></main>);
}

function Checkout() {
  const { courseId } = useParams(); const { user, ready, refresh } = useAuth(); const nav = useNavigate();
  const [course, setCourse] = useState(null); const [msg, setMsg] = useState('');
  useEffect(() => { api(`/courses/${courseId}`).then(setCourse).catch(e => setMsg(e.message)); }, [courseId]);
  if (!ready) return null;
  if (!user) return <Navigate to="/login" state={{ from: `/checkout/${courseId}` }} replace />;
  if (!course) return <main className="wrap narrow"><p>{msg || 'Loading…'}</p></main>;
  return (
    <main className="wrap checkout">
      <section className="panel"><h2>Order summary</h2>
        <div className="row"><span>{course.title}</span><strong>${course.price.toFixed(2)}</strong></div>
        <div className="row total"><span>Total (USD)</span><strong>${course.price.toFixed(2)}</strong></div>
        <ul className="perks"><li>Lifetime access to all lessons</li><li>Instant unlock after payment</li><li>Secure payment processed by PayPal</li></ul>
      </section>
      <section className="panel"><h2>Pay securely</h2>
        <PayPalScriptProvider options={{ clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture' }}>
          <PayPalButtons style={{ layout: 'vertical', shape: 'rect' }}
            createOrder={async () => (await api('/payments/create-order', { method: 'POST', body: { courseId } })).id}
            onApprove={async d => { await api('/payments/capture-order', { method: 'POST', body: { orderId: d.orderID } }); await refresh(); nav(`/learn/${courseId}`, { state: { paid: true } }); }}
            onCancel={() => setMsg('Payment cancelled. You have not been charged.')}
            onError={e => setMsg(e.message || 'Payment failed. Please try again.')} />
        </PayPalScriptProvider>
        {msg && <p className="err" role="alert">{msg}</p>}
      </section>
    </main>);
}

function Learn() {
  const { id } = useParams(); const loc = useLocation();
  const { user, ready } = useAuth(); const [c, setC] = useState(null); const [err, setErr] = useState(null);
  useEffect(() => { user && api(`/courses/${id}/content`).then(setC).catch(setErr); }, [id, user]);
  if (!ready) return null;
  if (!user) return <Navigate to="/login" state={{ from: `/learn/${id}` }} replace />;
  if (err?.code === 'PAYMENT_REQUIRED') return <main className="wrap narrow"><div className="panel center"><h2>Premium course</h2><p>{err.message}</p><Link className="btn gold" to={`/checkout/${id}`}>Unlock course</Link></div></main>;
  if (err) return <main className="wrap narrow"><p className="err">{err.message}</p></main>;
  if (!c) return <main className="wrap narrow"><p>Loading…</p></main>;
  return (
    <main className="wrap narrow">
      {loc.state?.paid && <div className="success" role="status">Payment received. {c.title} is now unlocked.</div>}
      <h1>{c.title}</h1>
      {c.content.map((l, i) => <article className="panel lesson" key={i}><h3>{l.title}</h3><p>{l.body}</p></article>)}
    </main>);
}

export default function App() {
  return (<AuthProvider><Nav />
    <Routes><Route path="/" element={<Courses />} /><Route path="/login" element={<Login />} />
      <Route path="/checkout/:courseId" element={<Checkout />} /><Route path="/learn/:id" element={<Learn />} /></Routes>
  </AuthProvider>);
}
