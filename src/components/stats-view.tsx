import { BarChart3 } from 'lucide-react';
import { getHeadToHead, getPairStats, getPlayerStats, getTechnicalStats, type Match, type Player } from '@/lib/domain';
import { TechnicalSummary } from '@/components/technical-summary';
import { CrewFilter } from '@/components/crew-filter';
import type { Group } from '@/lib/domain';

type StatsView = 'players' | 'pairs' | 'head';

const nameOf=(players:Player[],id:string)=>players.find(p=>p.id===id)?.nickname||players.find(p=>p.id===id)?.name||'שחקן';
const names=(players:Player[],ids:string[])=>ids.map(id=>nameOf(players,id)).join(' + ');

export function StatsView({players,matches,groups,groupScope,showUngrouped,view,h2h,onGroupScopeChange,onViewChange,onH2hChange,onPlayerClick}:{players:Player[];matches:Match[];groups:Group[];groupScope:string;showUngrouped:boolean;view:StatsView;h2h:[string,string]|null;onGroupScopeChange:(value:string)=>void;onViewChange:(view:StatsView)=>void;onH2hChange:(pair:[string,string])=>void;onPlayerClick:(playerId:string)=>void}){
  const playerStats=players.map(p=>({player:p,stats:getPlayerStats(matches,p.id)})).filter(x=>x.stats.played).sort((a,b)=>b.stats.wins-a.stats.wins||b.stats.winRate-a.stats.winRate);
  const pairs=players.flatMap((p,i)=>players.slice(i+1).map(q=>getPairStats(matches,p.id,q.id))).filter(p=>p.played).sort((a,b)=>b.winRate-a.winRate||b.wins-a.wins);
  const achievements=playerStats.length?[
    {icon:'👑',title:'מלך הניצחונות',name:playerStats[0].player.name,value:`${playerStats[0].stats.wins} ניצחונות`},
    {icon:'🔥',title:'Hot Streak',name:[...playerStats].sort((a,b)=>b.stats.longestWinningStreak-a.stats.longestWinningStreak)[0].player.name,value:`${[...playerStats].sort((a,b)=>b.stats.longestWinningStreak-a.stats.longestWinningStreak)[0].stats.longestWinningStreak} רצוף`},
    {icon:'🥐',title:'מלך הבורקסים',...(()=>{const x=playerStats.map(v=>({name:v.player.name,...getTechnicalStats(matches,v.player.id)})).sort((a,b)=>b.given-a.given)[0];return {name:x.name,value:`${x.given} טכניים`}})()},
    {icon:'🤝',title:'Power Couple',name:pairs[0]?names(players,pairs[0].playerIds):'—',value:pairs[0]?`${pairs[0].winRate}% ניצחונות`:'אין מספיק משחקים'},
    {icon:'🧾',title:'לקוח הבורקסייה',...(()=>{const x=playerStats.map(v=>({name:v.player.name,...getTechnicalStats(matches,v.player.id)})).sort((a,b)=>b.received-a.received)[0];return {name:x.name,value:`${x.received} טכניים קיבל`}})()},
    {icon:'🧊',title:'Cold Streak',...(()=>{const x=[...playerStats].sort((a,b)=>b.stats.longestLosingStreak-a.stats.longestLosingStreak)[0];return {name:x.player.name,value:`${x.stats.longestLosingStreak} הפסדים רצוף`}})()}
  ]:[];
  const first=h2h?.[0]||players[0]?.id;
  const second=h2h?.[1]||players[1]?.id;
  const duel=first&&second?getHeadToHead(matches,first,second):null;
  return <main>
<div className="eyebrow">
<BarChart3 size={15}/> לפי חבורה</div>
<h1 className="page-title">המספרים מדברים.</h1>
<p className="page-sub">כל נתון מחושב רק מהערבים של החבורה שבחרתם.</p>
<CrewFilter groups={groups} value={groupScope} showUngrouped={showUngrouped} onChange={onGroupScopeChange}/>{achievements.length>0&&<section className="achievement-grid">{achievements.map(a=>
<div className="achievement-card" key={a.title}>
<span className="achievement-icon">{a.icon}</span>
<span className="achievement-title">{a.title}</span>
<strong>{a.name}</strong>
<small>{a.value}</small>
</div>)}</section>}<TechnicalSummary matches={matches} players={players} playerIds={players.map(p=>p.id)}/>
<div className="subnav">
<button className={`toggle ${view==='players'?'active':''}`} onClick={()=>onViewChange('players')}>שחקנים</button>
<button className={`toggle ${view==='pairs'?'active':''}`} onClick={()=>onViewChange('pairs')}>זוגות</button>
<button className={`toggle ${view==='head'?'active':''}`} onClick={()=>onViewChange('head')}>ראש בראש</button>
</div>{view==='players'?<div className="stat-list">{playerStats.length?playerStats.map(({player:p,stats:s},index)=>
<button className="stat-player" key={p.id} style={{color:'inherit',textAlign:'right'}} onClick={()=>onPlayerClick(p.id)}>
<span className="small muted" style={{width:16}}>{index+1}</span>
<Avatar name={p.name} tone={index===0?'gold':'blue'}/>
<div className="main">
<strong>{p.name}</strong>
<span>{s.played} משחקים · {s.wins} ניצחונות · הפרש {s.goalsFor-s.goalsAgainst>=0?'+':''}{s.goalsFor-s.goalsAgainst}</span>
</div>
<div className="stat-value">{s.winRate}%<small>ניצחונות</small>
</div>
</button>):<div className="empty">כאן תראו את הדירוג אחרי המשחק הראשון.</div>}</div>:view==='pairs'?<div className="stat-list">{pairs.length?pairs.map((p,index)=>
<div className="stat-player" key={p.playerIds.join('-')}>
<span className="small muted" style={{width:16}}>{index+1}</span>
<Avatar name={nameOf(players,p.playerIds[0])} tone={index===0?'gold':'blue'}/>
<div className="main">
<strong>{names(players,p.playerIds)}</strong>
<span>{p.played} יחד · {p.wins} ניצחונות · {p.goalsFor}:{p.goalsAgainst} שערים</span>
</div>
<div className="stat-value">{p.winRate}%<small>ניצחונות</small>
</div>
</div>):<div className="empty">נתוני זוגות יופיעו אחרי המשחק הראשון.</div>}</div>:<div>
<div className="card">
<div className="row">
<select className="input" aria-label="שחקן ראשון" value={first||''} onChange={e=>onH2hChange([e.target.value,second||''])}>{players.map(p=>
<option key={p.id} value={p.id}>{p.name}</option>)}</select>
<span className="muted">מול</span>
<select className="input" aria-label="שחקן שני" value={second||''} onChange={e=>onH2hChange([first||'',e.target.value])}>{players.map(p=>
<option key={p.id} value={p.id}>{p.name}</option>)}</select>
</div>
</div>{duel&&first!==second?<>
<div className="rivalry-banner">
<span>⚔️ RIVALRY</span>
<strong>{nameOf(players,first)} <em>VS</em> {nameOf(players,second)}</strong>
<small>{duel.played?duel.firstWins===duel.secondWins?'הכול פתוח. אין בעל בית.':duel.firstWins>duel.secondWins?`${nameOf(players,first)} מוביל ${duel.firstWins}:${duel.secondWins}`:`${nameOf(players,second)} מוביל ${duel.secondWins}:${duel.firstWins}`:'עוד לא התחילה היריבות'}</small>
</div>
<div className="summary-grid" style={{marginTop:13}}>
<div className="summary-box">
<span className="label">{nameOf(players,first)} ניצח</span>
<strong>{duel.firstWins}</strong>
</div>
<div className="summary-box">
<span className="label">{nameOf(players,second)} ניצח</span>
<strong>{duel.secondWins}</strong>
</div>
<div className="summary-box">
<span className="label">משחקים זה מול זה</span>
<strong>{duel.played}</strong>
</div>
<div className="summary-box">
<span className="label">תיקו</span>
<strong>{duel.draws}</strong>
</div>
</div>
</>:<div className="empty" style={{marginTop:13}}>בחרו שני שחקנים שונים.</div>}</div>}</main>;
}

function Avatar({name,tone='blue'}:{name:string;tone?:'blue'|'coral'|'gold'}){return <span className={`avatar ${tone}`}>{name.trim().slice(0,1)}</span>}
