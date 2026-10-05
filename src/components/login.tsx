'use client';
import { useState } from 'react';
import { ArrowLeft, LockKeyhole, ShieldCheck } from 'lucide-react';
export function Login({configured}:{configured:boolean}){
  const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const data=await response.json();if(!response.ok)throw new Error(data.error);location.reload();}catch(err){setError(err instanceof Error?err.message:'לא ניתן להתחבר.');setBusy(false);}}
  return <main className="login-wrap"><div className="login-mark">F<span>2</span></div><div className="login-card"><div className="eyebrow"><ShieldCheck size={15}/> כניסה למארח</div><h1>הערב מתחיל כאן.</h1><p>תוצאה, חילוף, משחק הבא. הכל מהטלפון.</p>{configured?<form onSubmit={submit}><label htmlFor="password">סיסמת מארח</label><div className="input-icon"><LockKeyhole size={18}/><input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="הסיסמה שלך" required/></div>{error&&<p className="error-text">{error}</p>}<button className="primary-btn" disabled={busy}>{busy?'מתחבר…':'כניסה לערב'}<ArrowLeft size={18}/></button></form>:<div className="notice">יש להגדיר HOST_PASSWORD ו־SESSION_SECRET בשרת לפני כניסה.</div>}</div></main>
}
