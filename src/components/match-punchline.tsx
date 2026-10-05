'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
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
      <div className="eyebrow"><Sparkles size={15}/> משחק #{match.sequenceNumber} הסתיים</div>
      <h2 id="punchline-title">יש לנו תוצאה. יש גם פאנץ׳?</h2>
      <div className="punchline-result">
        <span>{teamA}</span><strong dir="ltr">{match.scoreA} : {match.scoreB}</strong><span>{teamB}</span>
      </div>
      {punchline ? <p className="punchline-text" aria-live="polite">{punchline}</p> : <p>אפשר ליצור פאנץ׳ מצחיק של כשלוש שורות על המשחק שנשמר. המשחק הבא כבר מוכן.</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="primary-btn" disabled={busy} onClick={() => generate(Boolean(punchline))}><Sparkles size={18}/>{busy ? 'מכין פאנץ׳…' : punchline ? 'עוד פאנץ׳ בסגנון אחר' : 'צרו פאנץ׳ למשחק'}</button>
      <button className="sheet-close" onClick={onClose}>{punchline ? 'למשחק הבא' : 'דלגו למשחק הבא'}</button>
    </section>
  </div>;
}
