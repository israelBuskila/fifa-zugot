import { existsSync } from 'node:fs';
import { completeMatch, type Lineup, type Player, type Session } from '../src/lib/domain';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const { collections, ensureIndexes } = await import('../src/lib/db');
await ensureIndexes();
const { players, groups, sessions } = await collections();
if (await players.countDocuments({}) || await sessions.countDocuments({})) {
  console.log('Database already contains data; seed skipped.'); process.exit(0);
}
const names=['ישראל','נתי','יעקב','גילעד','דניאל'];
const ids=names.map(()=>crypto.randomUUID());
const createdAt=new Date().toISOString();
const samplePlayers:Player[]=names.map((name,i)=>({id:ids[i],name,nickname:name,active:true,createdAt}));
await players.insertMany(samplePlayers);
await groups.insertOne({id:crypto.randomUUID(),name:'החמישייה הקבועה',playerIds:ids,createdAt});
function night(daysAgo:number,title:string,results:Array<[number,number,0|1]>) {
  const start=new Date(Date.now()-daysAgo*86400000).toISOString();
  const lineup:Lineup={A:[ids[0],ids[1]],B:[ids[2],ids[3]],bench:[ids[4]]};
  let session:Session={id:crypto.randomUUID(),title,date:start.slice(0,10),startedAt:start,status:'active',playerIds:ids,lineup,scoreA:0,scoreB:0,matchStartedAt:start,matches:[],version:1,updatedAt:start};
  for(let i=0;i<results.length;i++){
    const [scoreA,scoreB,loserIndex]=results[i];
    const loser=scoreA>scoreB?'B':'A';
    const leavingPlayerId=session.lineup[loser][loserIndex];
    session=completeMatch(session,{scoreA,scoreB,resultType:'normal',leavingPlayerId},new Date(Date.parse(start)+(i+1)*18*60000).toISOString());
  }
  session.status='ended';session.endedAt=new Date(Date.parse(start)+(results.length+1)*18*60000).toISOString();
  return session;
}
await sessions.insertMany([
  night(14,'ערב FIFA · המחזור הראשון',[[3,2,0],[1,4,1],[5,3,0],[2,1,1]]),
  night(7,'ערב FIFA · משחקי שישי',[[2,0,1],[4,3,0],[1,2,0],[3,1,1],[2,3,0]])
]);
console.log('Seeded five players, one saved group, and two sample nights.');
process.exit(0);
