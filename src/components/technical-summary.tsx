import { Flame, ShieldAlert } from 'lucide-react';
import { getTechnicalStats, type Match, type Player } from '@/lib/domain';

export function TechnicalSummary({ matches, players, playerIds }: { matches: Match[]; players: Player[]; playerIds: string[] }) {
  const rows = playerIds.map(id => ({ id, name: players.find(player => player.id === id)?.nickname || players.find(player => player.id === id)?.name || 'שחקן', ...getTechnicalStats(matches, id) }));
  const total = matches.filter(match => match.resultType === 'technical' && (match.scoreA === 3 && match.scoreB === 0 || match.scoreA === 0 && match.scoreB === 3)).length;
  const fastest = rows.filter(row => row.fastest !== undefined).sort((a,b) => a.fastest! - b.fastest!)[0];

  return <section className="section technical-summary"><div className="section-head"><h2>טכני ובורקסים</h2><span className="badge">{total} משחקים טכניים</span></div>
    {total ? <><div className="technical-spotlight"><Flame size={19}/><span>{fastest ? `הטכני המהיר: ${fastest.name}, דקה ${fastest.fastest}` : 'הטכני הבא עם דקה יוכל לשבור שיא'}</span></div>
      <div className="technical-table"><div className="technical-table-head"><span>שחקן</span><span>חילק</span><span>קיבל</span></div>{rows.sort((a,b) => b.given-a.given || a.received-b.received).map(row => <div className="technical-table-row" key={row.id}><strong>{row.name}</strong><span>{row.given}</span><span>{row.received}</span></div>)}</div>
    </> : <div className="technical-empty"><ShieldAlert size={19}/><span>עוד לא היה טכני. משחק שמגיע ל־3:0 יופיע כאן.</span></div>}
    <p className="technical-note">בורקס = טכני שקיבלת. במשחק זוגות כל אחד מבני הזוג המפסיד מקבל בורקס.</p>
  </section>;
}
