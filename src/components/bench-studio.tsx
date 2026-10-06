'use client';

import { useState } from 'react';
import { ArrowLeft, Clipboard, MessageSquareText, Mic2, Trophy, X } from 'lucide-react';
import { getRoundProgress, getTechnicalStats, type Player, type Session } from '@/lib/domain';
import { banterMemories, suggestBanterMemories } from '@/lib/banter-memory';

const playerName = (players: Player[], id: string) => players.find(player => player.id === id)?.nickname || players.find(player => player.id === id)?.name || 'שחקן';
const pairName = (players: Player[], ids: string[]) => ids.map(id => playerName(players, id)).join(' + ');

export function liveLine(session: Session, players: Player[]): string {
  const { scoreA, scoreB, matches } = session;
  if (scoreA === 3 && scoreB === 0 || scoreA === 0 && scoreB === 3) {
    return `3:0 ל${pairName(players, scoreA === 3 ? session.lineup.A : session.lineup.B)}. הוועדה מבקשת את דקת הטכני.`;
  }
  const round = getRoundProgress(matches);
  if (round.pair && round.beaten > 0) {
    return `${pairName(players, round.pair)} ניצחו ${round.beaten} מתוך ${round.required} צמדים בדרך לסבב. עכשיו כבר אפשר לדבר.`;
  }
  const latest = matches.at(-1);
  const recentQuote = [...(session.quotes ?? [])].reverse().find(quote => quote.matchNumber === matches.length + 1);
  if (recentQuote) return `״${recentQuote.text}״ — ${playerName(players,recentQuote.playerId)}. המשפט נשמר, עכשיו נשאר לשחק.`;
  if (latest?.resultType === 'technical' && latest.winner) {
    return `${pairName(players, latest.lineupBefore[latest.winner])} חילקו טכני. בצד השני נרשמו שני בורקסים.`;
  }
  if (session.quotes?.length) return `המשפט האחרון כבר נשמר. נראה אם התוצאה תסכים איתו.`;
  return 'הפרנג׳ס מוכן. תנו למשחק הראשון לספק לו עובדות.';
}

export function CommentaryStrip({ session, players, onOpen }: { session: Session; players: Player[]; onOpen: () => void }) {
  const archive = suggestBanterMemories(session)[0]?.memory;
  return <button className="commentary-strip" onClick={onOpen}>
    <span className="commentary-icon"><Mic2 size={19}/></span>
    <span className="commentary-copy"><small>מהספסל · הפרנג׳ס מדבר</small><strong>{liveLine(session, players)}</strong>{archive && <em>מהארכיון: ״{archive.text}״ · {archive.speaker}</em>}</span>
    <ArrowLeft size={19} className="commentary-arrow"/>
  </button>;
}

function ArchiveLibrary({session,sessions,players}:{session:Session|null;sessions:Session[];players:Player[]}) {
  const [search,setSearch] = useState('');
  const suggested = session ? suggestBanterMemories(session) : [];
  const savedQuotes = sessions.flatMap(night => (night.quotes ?? []).map(quote => ({
    id: `night-${night.id}-${quote.id}`,
    text: quote.text,
    speaker: playerName(players, quote.playerId),
    date: night.date,
    context: `${night.title} · לפני משחק ${quote.matchNumber}`
  })));
  const archive = [...savedQuotes, ...banterMemories];
  const matching = archive.filter(memory => `${memory.text} ${memory.speaker} ${memory.context}`.includes(search.trim()));
  return <section className="section"><div className="section-head"><h2>מהארכיון של החבורה</h2><span className="badge">{archive.length} משפטים</span></div>
    <p className="small muted">משפטים שנשמרו בערבי FIFA יחד עם המשפטים הנבחרים מהצ׳אט, עם מקור ותאריך.</p>
    {suggested.length > 0 && <div className="archive-suggestions">{suggested.map(({memory,reason}) => <article className="archive-memory" key={memory.id}><span className="archive-reason">{reason}</span><blockquote>״{memory.text}״</blockquote><small>{memory.speaker} · {memory.date}</small></article>)}</div>}
    <details className="archive-all"><summary>כל {archive.length} המשפטים בארכיון</summary><div className="archive-all-content"><label htmlFor="archive-search">חיפוש לפי משפט, שם או נושא</label><input id="archive-search" className="input" value={search} onChange={event => setSearch(event.target.value)} placeholder="למשל: סבב, טכני, גלעד"/><div className="archive-all-list">{matching.length ? matching.map(memory => <div key={memory.id}><strong>״{memory.text}״</strong><small>{memory.speaker} · {memory.date} · {memory.context}</small></div>) : <div className="empty">לא נמצא משפט מתאים. נסו מילה אחרת.</div>}</div></div></details>
  </section>;
}

export function BenchStudio({ session, sessions, players, onSaveQuote, onRemoveQuote, busy }: {
  session: Session | null;
  sessions: Session[];
  players: Player[];
  onSaveQuote: (playerId: string, text: string) => Promise<void>;
  onRemoveQuote: (quoteId: string) => Promise<void>;
  busy: boolean;
}) {
  const [speaker, setSpeaker] = useState('');
  const [quote, setQuote] = useState('');
  const [copied, setCopied] = useState(false);
  if (!session) return <main className="bench-page"><div className="eyebrow"><MessageSquareText size={15}/> מהספסל</div><h1 className="page-title">הפרנג׳ס עוד לא התיישב.</h1><p className="page-sub">כשיתחיל ערב, כאן יהיו העובדות שאפשר להוציא באמצע המשחק.</p><ArchiveLibrary session={null} sessions={sessions} players={players}/></main>;

  const bench = session.lineup.bench;
  const round = getRoundProgress(session.matches);
  const latest = session.matches.at(-1);
  const shareText = `${session.title}\n${pairName(players, session.lineup.A)} ${session.scoreA}:${session.scoreB} ${pairName(players, session.lineup.B)}\n${liveLine(session, players)}`;

  async function saveQuote(event: React.FormEvent) {
    event.preventDefault();
    if (!speaker || !quote.trim() || busy) return;
    try { await onSaveQuote(speaker, quote.trim()); setQuote(''); }
    catch { /* The parent shows the save error and the draft stays in the input. */ }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(shareText); setCopied(true); window.setTimeout(() => setCopied(false), 2500); }
    catch { setCopied(false); }
  }

  return <main className="bench-page">
    <div className="eyebrow"><MessageSquareText size={15}/> פרשנות מהספסל</div>
    <h1 className="page-title">הפרנג׳ס מדבר.</h1>
    <p className="page-sub">המספרים על המגרש. הפה שלכם בחוץ.</p>

    <section className="bench-lead">
      <div className="bench-lead-top"><span>כרגע על הספסל</span><span className="bench-live">ערב פעיל</span></div>
      <div className="bench-names">{bench.length ? bench.map(id => <span key={id}>{playerName(players, id)}</span>) : <span>כולם משחקים · אין פרנג׳ס כרגע</span>}</div>
      <div className="bench-statement"><Mic2 size={23}/><p>{liveLine(session, players)}</p></div>
      <button className="bench-copy" onClick={copy}><Clipboard size={16}/>{copied ? 'הועתק לקבוצה' : 'העתקת התוצאה והעקיצה'}</button>
    </section>

    <section className="section bench-facts"><div className="section-head"><h2>עד כאן העובדות</h2><span className="badge">משחק {session.matches.length + 1}</span></div>
      <div className="bench-fact-grid">
        <div><small>על המגרש</small><strong>{pairName(players, session.lineup.A)}</strong><span>מול {pairName(players, session.lineup.B)}</span></div>
        <div><small>סבב בדרך</small><strong>{round.pair ? `${round.beaten} / ${round.required}` : 'עוד לא'}</strong><span>{round.pair ? pairName(players, round.pair) : 'מחכים לניצחון הראשון'}</span></div>
        <div><small>טכני בערב</small><strong>{session.matches.filter(match => match.resultType === 'technical').length}</strong><span>כל טכני הוא גם בורקס לצד השני</span></div>
        <div><small>משחקים שנשמרו</small><strong>{session.matches.length}</strong><span>{latest ? `האחרון: ${latest.scoreA}:${latest.scoreB}` : 'הערב רק התחיל'}</span></div>
      </div>
    </section>

    <ArchiveLibrary session={session} sessions={sessions} players={players}/>

    {bench.length > 0 && <section className="section"><div className="section-head"><h2>התיק של הפרנג׳ס</h2></div><div className="bench-player-list">{bench.map(id => {
      const technicals = getTechnicalStats(session.matches, id);
      return <div className="bench-player" key={id}><span className="bench-player-avatar">{playerName(players,id).slice(0,1)}</span><div><strong>{playerName(players,id)}</strong><small>{technicals.given} טכני שחילק · {technicals.received} בורקסים שקיבל{technicals.fastest !== undefined ? ` · טכני מהיר: דקה ${technicals.fastest}` : ''}</small></div></div>;
    })}</div></section>}

    <section className="section"><div className="section-head"><h2>אמרת? שמרנו.</h2></div><p className="small muted">תעדו הבטחה או משפט מהערב. בפעם הבאה יהיה עם מה לעבוד.</p>
      <form className="quote-form" onSubmit={saveQuote}>
        <label htmlFor="quote-speaker">מי אמר?</label>
        <select id="quote-speaker" className="input" value={speaker} onChange={event => setSpeaker(event.target.value)} required><option value="">בחרו שחקן</option>{session.playerIds.map(id => <option key={id} value={id}>{playerName(players,id)}</option>)}</select>
        <label htmlFor="quote-text">מה הוא אמר?</label>
        <input id="quote-text" className="input" value={quote} onChange={event => setQuote(event.target.value)} maxLength={180} placeholder="למשל: היום אתם לא שמים לנו גול" required/>
        <button className="secondary-btn" disabled={busy || !speaker || quote.trim().length < 2} type="submit">שמירת המשפט <ArrowLeft size={16}/></button>
      </form>
      <div className="quote-list">{session.quotes?.length ? [...session.quotes].reverse().map(item => <div className="quote-card" key={item.id}><div><span>״{item.text}״</span><small>{playerName(players,item.playerId)} · לפני משחק {item.matchNumber}</small></div><button type="button" aria-label={`מחיקת המשפט של ${playerName(players,item.playerId)}`} disabled={busy} onClick={() => onRemoveQuote(item.id)}><X size={17}/></button></div>) : <div className="empty">כאן יופיעו המשפטים שתשמרו בערב.</div>}</div>
    </section>

    {round.completed.length > 0 && <section className="section"><div className="section-head"><h2>סבבים שכבר נלקחו</h2><Trophy size={19}/></div><div className="bench-rounds">{round.completed.map((item,index) => <span key={item.matchId}>סבב {index+1} · {pairName(players,item.pair)}</span>)}</div></section>}
  </main>;
}
