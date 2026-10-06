'use client';

import { useState } from 'react';
import { ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';
import type { Match, Player } from '@/lib/domain';

const nameOf = (players: Player[], id: string) => players.find(player => player.id === id)?.nickname || players.find(player => player.id === id)?.name || 'שחקן';

export function MatchPunchline({ match, players, onClose, onGenerated }: {
  match: Match;
  players: Player[];
  onClose: () => void;
  onGenerated: (matchId: string, punchline: string, punchlineStyle: number, version: number) => void;
}) {
  const [punchline, setPunchline] = useState(match.punchline || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function generate(regenerate = false) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/ai/punchline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: match.sessionId, matchId: match.id, regenerate }),
        cache: 'no-store',
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'לא ניתן ליצור פאנץ׳ כרגע.');
      setPunchline(body.punchline);
      onGenerated(match.id, body.punchline, body.punchlineStyle, body.version);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'לא ניתן ליצור פאנץ׳ כרגע.');
    } finally {
      setBusy(false);
    }
  }

  const teamA = match.lineupBefore.A.map(id => nameOf(players, id)).join(' + ');
  const teamB = match.lineupBefore.B.map(id => nameOf(players, id)).join(' + ');

  return <div className="sheet-backdrop" onClick={onClose}>
    <section className="sheet punchline-sheet" role="dialog" aria-modal="true" aria-labelledby="punchline-title" onClick={event => event.stopPropagation()}>
      <div className="sheet-grip"/>
      <div className="eyebrow"><Sparkles size={15}/> שריקת הסיום · משחק #{match.sequenceNumber}</div>
      <h2 id="punchline-title">נגמר. עכשיו אפשר לדבר.</h2>
      <div className="punchline-result">
        <span>{teamA}</span><strong dir="ltr">{match.scoreA} : {match.scoreB}</strong><span>{teamB}</span>
      </div>
      {punchline ? <div className="commentator-card"><span>🎙️ פרשן הבית</span><p className="punchline-text" aria-live="polite">{punchline}</p></div> : <div className="commentator-card muted-card"><span>🎙️ פרשן הבית</span><p>התוצאה בפנים. עכשיו תנו ל־AI לפתוח את הפה.</p></div>}
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="primary-btn" disabled={busy} onClick={() => generate(Boolean(punchline))}>{punchline?<RefreshCw size={18}/>:<Sparkles size={18}/>} {busy ? 'הפרשן מתחמם…' : punchline ? '🔥 תן עקיצה אחרת' : '🎙️ תן לפרשן לדבר'}</button>
      <button className="sheet-close" onClick={onClose}>למשחק הבא <ArrowLeft size={16}/></button>
    </section>
  </div>;
}
