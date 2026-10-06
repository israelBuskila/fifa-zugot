'use client';

import { Check, Copy, Share2, Trophy } from 'lucide-react';
import { useState } from 'react';
import { getPairStats, getPlayerStats, getTechnicalStats, type Player, type Session } from '@/lib/domain';

const nameOf=(players:Player[],id:string)=>players.find(p=>p.id===id)?.nickname||players.find(p=>p.id===id)?.name||'שחקן';
const names=(players:Player[],ids:string[])=>ids.map(id=>nameOf(players,id)).join(' + ');

export function NightPoster({session,players}:{session:Session;players:Player[]}){
  const [copied,setCopied]=useState(false);
  const stats=session.playerIds.map(id=>getPlayerStats(session.matches,id)).sort((a,b)=>b.wins-a.wins||b.winRate-a.winRate);
  const pairs=session.playerIds.flatMap((id,i)=>session.playerIds.slice(i+1).map(other=>getPairStats(session.matches,id,other))).filter(p=>p.played).sort((a,b)=>b.winRate-a.winRate||b.wins-a.wins);
  const technical=session.playerIds.map(id=>({id,...getTechnicalStats(session.matches,id)})).sort((a,b)=>b.given-a.given);
  const streak=[...stats].sort((a,b)=>b.longestWinningStreak-a.longestWinningStreak)[0];
  const biggest=[...session.matches].sort((a,b)=>Math.abs(b.scoreA-b.scoreB)-Math.abs(a.scoreA-a.scoreB))[0];
  const king=stats[0]?.wins?nameOf(players,stats[0].playerId):'—', pair=pairs[0]?names(players,pairs[0].playerIds):'—', borekas=technical[0]?.given?nameOf(players,technical[0].id):'—', streakName=streak?.longestWinningStreak?nameOf(players,streak.playerId):'—';
  const biggestText=biggest?`${names(players,biggest.lineupBefore.A)}  ${biggest.scoreA}:${biggest.scoreB}  ${names(players,biggest.lineupBefore.B)}`:'—';

  async function copyAiPosterPrompt(){
    const matchLines=session.matches.map(match=>{
      const teamA=names(players,match.lineupBefore.A),teamB=names(players,match.lineupBefore.B);
      const extras=[
        match.resultType==='technical'?`טכני 3:0`:undefined,
        match.technicalMinute!==undefined?`דקה ${match.technicalMinute}`:undefined,
        ...match.events.slice(0,5).map(event=>`${event.type}${event.playerId?` - ${nameOf(players,event.playerId)}`:''}${event.text?`: ${event.text}`:''}`)
      ].filter(Boolean);
      return `משחק ${match.sequenceNumber}: ${teamA} מול ${teamB} — ${match.scoreA}:${match.scoreB}${extras.length?` | ${extras.join(' | ')}`:''}`;
    }).join('\\n');
    const quotes=(session.quotes??[]).slice(-8).map(q=>`- ${nameOf(players,q.playerId)}: "${q.text}"${q.matchNumber?` (משחק ${q.matchNumber})`:''}`).join('\\n');
    const prompt=`צור פוסטר אנכי 9:16 מצחיק, מושקע וקולנועי לערב FIFA זוגות של חבורת חברים. הסגנון: שידור ספורט עתידני + EA FC + הומור של קבוצת WhatsApp, עם תאורה דרמטית, טיפוגרפיה ספורטיבית וקומפוזיציה שמתאימה לסטורי.\\n\\nשם הערב: ${session.title}\\nתאריך: ${session.date}\\nמספר משחקים: ${session.matches.length}\\nסה"כ שערים: ${session.matches.reduce((n,m)=>n+m.scoreA+m.scoreB,0)}\\nמלך הערב: ${king}\\nזוג הערב: ${pair}\\nמלך הבורקסים: ${borekas}\\nהרצף הבולט: ${streakName}\\nהתוצאה של הערב: ${biggestText}\\n\\nכל המשחקים:\\n${matchLines}\\n${quotes?`\\nציטוטים אמיתיים מהערב:\\n${quotes}\\n`:''}\\nהפוך את הנתונים לסצנה קומית אחת עם סיפור ברור והבלט את הרגע/היריבות הכי מצחיקים. מותר להמציא מטאפורות ויזואליות, כותרות עיתון ואלמנטים קומיים, אבל אסור להמציא תוצאות, שערים, אירועים או ציטוטים שלא מופיעים כאן. שמור את שמות השחקנים והתוצאות בדיוק. אם מצורפות תמונות reference של השחקנים, השתמש בהן כדי לשמור על הדמויות והפנים שלהם. אם אין תמונות, צור דמויות ספורטיביות כלליות ואל תטען שהן דומות לשחקנים האמיתיים. הטקסט המרכזי בפוסטר צריך להיות קצר וקריא בעברית.`;
    let ok=false; try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(prompt);ok=true}}catch{} if(!ok){const area=document.createElement('textarea');area.value=prompt;area.readOnly=true;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.focus();area.select();area.setSelectionRange(0,area.value.length);try{ok=document.execCommand('copy')}catch{}area.remove()} if(ok){setCopied(true);window.setTimeout(()=>setCopied(false),2200)}else{window.prompt('ההעתקה האוטומטית לא זמינה. העתק את הפרומפט מכאן:',prompt)}
  }

  async function sharePoster(){
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;const ctx=canvas.getContext('2d');if(!ctx)return;
    const bg=ctx.createLinearGradient(0,0,1080,1920);bg.addColorStop(0,'#15283f');bg.addColorStop(.55,'#0b1320');bg.addColorStop(1,'#211b29');ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1920);
    ctx.textAlign='center';ctx.direction='rtl';ctx.fillStyle='#efd48b';ctx.font='900 42px Arial';ctx.fillText('FIFA ZUGOT',540,150);ctx.fillStyle='#fff';ctx.font='900 76px Arial';ctx.fillText(session.title,540,270);ctx.fillStyle='#91a2b7';ctx.font='32px Arial';ctx.fillText(`${session.matches.length} משחקים · ${session.matches.reduce((n,m)=>n+m.scoreA+m.scoreB,0)} שערים`,540,335);
    const cards=[['👑','מלך הערב',king],['🤝','זוג הערב',pair],['🥐','מלך הבורקסים',borekas],['🔥','הרצף',streakName]];cards.forEach(([icon,label,value],i)=>{const x=i%2?560:80,y=430+Math.floor(i/2)*300;ctx.fillStyle='#182436';ctx.fillRect(x,y,440,240);ctx.fillStyle='#efd48b';ctx.font='52px Arial';ctx.fillText(icon,x+220,y+68);ctx.fillStyle='#91a2b7';ctx.font='900 25px Arial';ctx.fillText(label,x+220,y+118);ctx.fillStyle='#fff';ctx.font='900 38px Arial';ctx.fillText(value,x+220,y+178);});
    ctx.fillStyle='#182436';ctx.fillRect(80,1070,920,280);ctx.fillStyle='#efd48b';ctx.font='900 28px Arial';ctx.fillText('💀 התוצאה של הערב',540,1140);ctx.fillStyle='#fff';ctx.font='900 42px Arial';wrap(ctx,biggestText,540,1220,820,58);ctx.fillStyle='#91a2b7';ctx.font='900 26px Arial';ctx.fillText('אם אין פוסטר אין משחק.',540,1710);ctx.fillStyle='#efd48b';ctx.font='900 30px Arial';ctx.fillText('FIFA ZUGOT · NIGHT REPORT',540,1780);
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)return;const file=new File([blob],`fifa-zugot-${session.date}.png`,{type:'image/png'});
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){try{await navigator.share({files:[file],title:session.title});return}catch{}}
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  return <section className="section poster-section"><div className="section-head"><h2>פוסטר הערב</h2><Trophy size={18}/></div><div className="night-poster"><div className="poster-brand">FIFA ZUGOT</div><h3>{session.title}</h3><p>{session.matches.length} משחקים · {session.matches.reduce((n,m)=>n+m.scoreA+m.scoreB,0)} שערים</p><div className="poster-awards"><div>👑<small>מלך הערב</small><strong>{king}</strong></div><div>🤝<small>זוג הערב</small><strong>{pair}</strong></div><div>🥐<small>מלך הבורקסים</small><strong>{borekas}</strong></div><div>🔥<small>הרצף</small><strong>{streakName}</strong></div></div><div className="poster-demolition"><small>💀 התוצאה של הערב</small><strong>{biggestText}</strong></div><footer>אם אין פוסטר אין משחק.</footer></div><div className="poster-actions"><button className="primary-btn poster-share" onClick={sharePoster}><Share2 size={18}/> שתף בקבוצה</button><button className="secondary-btn poster-share" onClick={copyAiPosterPrompt}>{copied?<><Check size={18}/> הפרומפט הועתק ✓</>:<><Copy size={18}/> העתק פרומפט ל-ChatGPT / Gemini</>}</button></div></section>;
}
function wrap(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,max:number,line:number){const words=text.split(' '),rows:string[]=[];let row='';for(const word of words){const test=row?`${row} ${word}`:word;if(ctx.measureText(test).width>max&&row){rows.push(row);row=word}else row=test}if(row)rows.push(row);rows.slice(0,3).forEach((r,i)=>ctx.fillText(r,x,y+i*line));}
