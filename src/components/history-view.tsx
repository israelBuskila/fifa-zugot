import { ArrowRight, CalendarDays, History, Pencil, Sparkles } from 'lucide-react';
import { AiRecap } from '@/components/ai-recap';
import { RoundStatus, SessionRow, SessionSummary, resultLabel } from '@/components/game-ui';
import { TechnicalSummary } from '@/components/technical-summary';
import { NightPoster } from '@/components/night-poster';
import { CrewFilter } from '@/components/crew-filter';
import type { Group, Match, Player, Session } from '@/lib/domain';

const nameOf=(players:Player[],id:string)=>players.find(p=>p.id===id)?.nickname||players.find(p=>p.id===id)?.name||'שחקן';
const names=(players:Player[],ids:string[])=>ids.map(id=>nameOf(players,id)).join(' + ');
const formatDate=(date:string)=>new Intl.DateTimeFormat('he-IL',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(date));
const scoreText=(match:Match)=>`${match.scoreA}:${match.scoreB}`;

export function HistoryView({sessions,players,groups,groupScope,showUngrouped,selected,onGroupScopeChange,onSelect,onPunchline,onEdit}:{sessions:Session[];players:Player[];groups:Group[];groupScope:string;showUngrouped:boolean;selected:Session|null;onGroupScopeChange:(value:string)=>void;onSelect:(sessionId:string|null)=>void;onPunchline:(matchId:string)=>void;onEdit:(sessionId:string,match:Match)=>void}){
  if(selected)return <main>
<div className="detail-top">
<button className="back-btn" onClick={()=>onSelect(null)}>
<ArrowRight size={19}/>
</button>
<span className="eyebrow">
<CalendarDays size={15}/> היסטוריה</span>
</div>
<h1 className="page-title">{selected.title}</h1>
<p className="page-sub">{formatDate(selected.date)} · {selected.playerIds.map(id=>nameOf(players,id)).join(' · ')}</p>
<SessionSummary session={selected} players={players}/>
<NightPoster session={selected} players={players}/>
<TechnicalSummary matches={selected.matches} players={players} playerIds={selected.playerIds}/>
<RoundStatus session={selected} players={players}/>
<AiRecap key={selected.id} sessionId={selected.id}/>
<section className="section">
<div className="section-head">
<h2>כל המשחקים</h2>
<span className="badge">{selected.matches.length}</span>
</div>{selected.matches.length?<div className="card">{selected.matches.map(m=>
<div key={m.id} className="game-row">
<div className="game-no">{m.sequenceNumber}</div>
<div className="game-teams">
<strong>{names(players,m.lineupBefore.A)}</strong>
<span>מול {names(players,m.lineupBefore.B)} · {resultLabel(m.resultType)}</span>
</div>
<div className="game-score">{scoreText(m)}</div>
<button className="text-btn" aria-label={`פאנץ׳ למשחק ${m.sequenceNumber}`} onClick={()=>onPunchline(m.id)}>
<Sparkles size={16}/>
</button>
<button className="text-btn" aria-label={`עריכת משחק ${m.sequenceNumber}`} onClick={()=>onEdit(selected.id,m)}>
<Pencil size={16}/>
</button>
</div>)}</div>:<div className="empty">לא נרשמו משחקים בערב הזה.</div>}</section>
</main>;
  return <main>
<div className="eyebrow">
<History size={15}/> כל הערבים</div>
<h1 className="page-title">כל משחק נשאר.</h1>
<p className="page-sub">התוצאות, הזוגות והרגעים של כל ערב.</p>
<CrewFilter groups={groups} value={groupScope} showUngrouped={showUngrouped} onChange={onGroupScopeChange}/>
<section className="section">{sessions.length?sessions.map(s=>
<SessionRow key={s.id} session={s} players={players} onClick={()=>onSelect(s.id)}/>):<div className="empty">אין ערבים בחבורה הזו עדיין.</div>}</section>
</main>;
}
