'use client';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SpeechButton } from '@/components/speech-button';

export function AiRecap({ sessionId }: { sessionId: string }) {
  const [recap, setRecap] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [nightQuote, setNightQuote] = useState('');

  async function generate() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/ai/recap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }), cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'לא ניתן ליצור סיכום כרגע.');
      setRecap(body.recap);
      setNightQuote(body.nightQuote || '');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'לא ניתן ליצור סיכום כרגע.'); }
    finally { setBusy(false); }
  }

  async function regenerateQuote() {
    setQuoteBusy(true); setError('');
    try {
      const response = await fetch('/api/ai/recap', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({sessionId,mode:'quote'}), cache:'no-store' });
      const body = await response.json(); if(!response.ok) throw new Error(body.error || 'לא ניתן ליצור משפט ערב כרגע.');
      setNightQuote(body.nightQuote || '');
    } catch(cause){ setError(cause instanceof Error ? cause.message : 'לא ניתן ליצור משפט ערב כרגע.'); }
    finally { setQuoteBusy(false); }
  }

  return <section className="section"><div className="section-head"><h2>סיכום AI של הערב</h2><Sparkles size={18} color="var(--gold)"/></div><div className="card ai-recap"><p className="small muted">סיכום קצר ומשעשע לפי התוצאות והאירועים שנשמרו.</p>{recap && <div className="speech-content"><p className="ai-recap-text" aria-live="polite">{recap}</p><SpeechButton text={recap} label="הקרא את הסיכום"/></div>}{nightQuote&&<div className="card" style={{marginTop:12}}><small className="muted">🎙️ משפט הערב</small><p className="ai-recap-text">״{nightQuote}״</p><div className="inline-actions"><SpeechButton text={nightQuote} label="הקרא את משפט הערב"/><button className="text-btn" disabled={quoteBusy} onClick={regenerateQuote}><Sparkles size={15}/>{quoteBusy?'מייצר…':'Regenerate משפט הערב'}</button></div></div>}{error && <p className="error-text" role="alert">{error}</p>}<button className="secondary-btn" disabled={busy} onClick={generate}><Sparkles size={17}/>{busy ? 'כותב סיכום…' : recap ? 'סיכום חדש' : 'צרו סיכום'}</button></div></section>;
}
