import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthorized } from '@/lib/auth';
import { collections } from '@/lib/db';
import { completeMatch, reviseMatchResult, skipNextBenchPlayer, undoLastMatch, validateLineup, DomainError, type Lineup, type Session, type MatchEvent } from '@/lib/domain';
export const dynamic='force-dynamic';
const id=z.string().uuid();
const lineup=z.object({A:z.array(id).min(1).max(2),B:z.array(id).min(1).max(2),bench:z.array(id)});
const gameMode=z.enum(['singles','pairs']);
const rules=z.object({preset:z.enum(['house','free']),version:z.literal(1)});
const events=z.array(z.object({id, type:z.enum(['goal','own_goal','penalty','technical','funny']),playerId:id.optional(),team:z.enum(['A','B']).optional(),minute:z.number().int().min(0).max(130).optional(),text:z.string().max(200).optional()})).max(100);
const technicalMinute=z.number().int().min(0).max(130).optional();
const action=z.discriminatedUnion('type',[
  z.object({type:z.literal('player.add'),name:z.string().trim().min(1).max(40),nickname:z.string().trim().max(40).optional()}),
  z.object({type:z.literal('player.update'),id,name:z.string().trim().min(1).max(40),nickname:z.string().trim().max(40).optional(),active:z.boolean()}),
  z.object({type:z.literal('group.save'),name:z.string().trim().min(1).max(50),playerIds:z.array(id).min(2)}),
  z.object({type:z.literal('session.start'),title:z.string().trim().min(1).max(80),playerIds:z.array(id).min(2),lineup,gameMode,rules}),
  z.object({type:z.literal('session.score'),sessionId:id,version:z.number().int(),scoreA:z.number().int().min(0).max(99),scoreB:z.number().int().min(0).max(99)}),
  z.object({type:z.literal('session.complete'),sessionId:id,version:z.number().int(),scoreA:z.number().int().min(0).max(99),scoreB:z.number().int().min(0).max(99),resultType:z.enum(['normal','penalties','golden_goal','technical']),selectedWinner:z.enum(['A','B']).optional(),technicalMinute,leavingPlayerId:id.optional(),enteringPlayerId:id.optional(),rotationTeam:z.enum(['A','B']).optional(),skipRotation:z.boolean().optional(),events:events.optional()}),
  z.object({type:z.literal('session.undo'),sessionId:id,version:z.number().int()}),
  z.object({type:z.literal('session.bench.skip'),sessionId:id,version:z.number().int()}),
  z.object({type:z.literal('session.player.add'),sessionId:id,version:z.number().int(),playerId:id}),
  z.object({type:z.literal('session.player.remove'),sessionId:id,version:z.number().int(),playerId:id}),
  z.object({type:z.literal('session.end'),sessionId:id,version:z.number().int()}),
  z.object({type:z.literal('session.lineup'),sessionId:id,version:z.number().int(),playerIds:z.array(id).min(2),lineup,rules:rules.optional()}),
  z.object({type:z.literal('quote.add'),sessionId:id,version:z.number().int(),playerId:id,text:z.string().trim().min(2).max(180)}),
  z.object({type:z.literal('quote.remove'),sessionId:id,version:z.number().int(),quoteId:id}),
  z.object({type:z.literal('match.edit'),sessionId:id,version:z.number().int(),matchId:id,scoreA:z.number().int().min(0).max(99),scoreB:z.number().int().min(0).max(99),resultType:z.enum(['normal','penalties','golden_goal','technical']),selectedWinner:z.enum(['A','B']).optional(),technicalMinute}),
]);
function jsonError(message:string,status=400){return NextResponse.json({error:message},{status});}
async function updateSession(sessionId:string, version:number, modify:(session:Session)=>Session) {
  const {sessions}=await collections(); const current=await sessions.findOne({id:sessionId});
  if(!current) return jsonError('הערב לא נמצא.',404);
  if(current.version!==version) return jsonError('הערב עודכן במכשיר אחר. רעננו ונסו שוב.',409);
  const next=modify(current);
  const {_id: ignoredId,...document}=next as Session & {_id?: unknown};
  void ignoredId;
  const result=await sessions.replaceOne({id:sessionId,version},document);
  if(!result.matchedCount) return jsonError('הערב עודכן במכשיר אחר. רעננו ונסו שוב.',409);
  return NextResponse.json({session:document});
}
export async function POST(request:Request) {
  if(!await isAuthorized()) return jsonError('יש להתחבר.',401);
  const origin=request.headers.get('origin');
  if(origin && new URL(origin).host!==new URL(request.url).host) return jsonError('בקשה ממקור לא מורשה.',403);
  const parsed=action.safeParse(await request.json().catch(()=>null));
  if(!parsed.success) return jsonError('פרטי הבקשה אינם תקינים.');
  const data=parsed.data;
  try {
    const db=await collections(); const now=new Date().toISOString();
    if(data.type==='player.add') {
      const player={id:crypto.randomUUID(),name:data.name,nickname:data.nickname||'',active:true,createdAt:now};
      await db.players.insertOne(player); return NextResponse.json({player});
    }
    if(data.type==='player.update') {
      const result=await db.players.findOneAndUpdate({id:data.id},{$set:{name:data.name,nickname:data.nickname||'',active:data.active}},{returnDocument:'after'});
      if(!result)return jsonError('השחקן לא נמצא.',404); const {_id,...player}=result;return NextResponse.json({player});
    }
    if(data.type==='group.save') {
      if(new Set(data.playerIds).size!==data.playerIds.length)return jsonError('יש שחקן כפול בקבוצה.');
      const group={id:crypto.randomUUID(),name:data.name,playerIds:data.playerIds,createdAt:now};
      if(await db.players.countDocuments({id:{$in:data.playerIds}})!==data.playerIds.length)return jsonError('אחד השחקנים לא נמצא.');
      await db.groups.insertOne(group);return NextResponse.json({group});
    }
    if(data.type==='session.start') {
      validateLineup(data.playerIds,data.lineup as Lineup,data.gameMode);
      if(await db.sessions.findOne({status:'active'}))return jsonError('כבר יש ערב פעיל. סיימו אותו או המשיכו בו.',409);
      const existing=await db.players.countDocuments({id:{$in:data.playerIds}});
      if(existing!==data.playerIds.length)return jsonError('אחד השחקנים לא נמצא.');
      const session:Session={id:crypto.randomUUID(),title:data.title,date:now.slice(0,10),startedAt:now,status:'active',playerIds:data.playerIds,lineup:data.lineup,gameMode:data.gameMode,rules:data.rules,scoreA:0,scoreB:0,matchStartedAt:now,matches:[],version:1,updatedAt:now};
      await db.sessions.insertOne(session);return NextResponse.json({session});
    }
    if(data.type==='session.score')return updateSession(data.sessionId,data.version,s=>{if(s.status!=='active')throw new DomainError('הערב הסתיים.');return {...s,scoreA:data.scoreA,scoreB:data.scoreB,version:s.version+1,updatedAt:now};});
    if(data.type==='session.complete')return updateSession(data.sessionId,data.version,s=>completeMatch(s,{scoreA:data.scoreA,scoreB:data.scoreB,resultType:data.resultType,selectedWinner:data.selectedWinner,technicalMinute:data.technicalMinute,leavingPlayerId:data.leavingPlayerId,enteringPlayerId:data.enteringPlayerId,rotationTeam:data.rotationTeam,skipRotation:data.skipRotation,events:data.events as MatchEvent[]|undefined},now));
    if(data.type==='session.undo')return updateSession(data.sessionId,data.version,s=>undoLastMatch(s,now));
    if(data.type==='session.bench.skip')return updateSession(data.sessionId,data.version,s=>{if(s.status!=='active')throw new DomainError('הערב הסתיים.');return {...s,lineup:skipNextBenchPlayer(s.lineup),version:s.version+1,updatedAt:now};});
    if(data.type==='session.player.add')return updateSession(data.sessionId,data.version,s=>{if(s.status!=='active')throw new DomainError('הערב הסתיים.');if(s.playerIds.includes(data.playerId))throw new DomainError('השחקן כבר משתתף בערב.');return {...s,playerIds:[...s.playerIds,data.playerId],lineup:{...s.lineup,bench:[...s.lineup.bench,data.playerId]},version:s.version+1,updatedAt:now};});
    if(data.type==='session.player.remove')return updateSession(data.sessionId,data.version,s=>{if(s.status!=='active')throw new DomainError('הערב הסתיים.');if(!s.lineup.bench.includes(data.playerId))throw new DomainError('אפשר להוציא מהערב רק שחקן שנמצא כרגע בפרנג׳ס.');if(s.playerIds.length<=(s.gameMode==='singles'?2:4))throw new DomainError('חייבים להישאר מספיק שחקנים למשחק.');return {...s,playerIds:s.playerIds.filter(id=>id!==data.playerId),lineup:{...s.lineup,bench:s.lineup.bench.filter(id=>id!==data.playerId)},version:s.version+1,updatedAt:now};});
    if(data.type==='session.end')return updateSession(data.sessionId,data.version,s=>({...s,status:'ended',endedAt:now,version:s.version+1,updatedAt:now}));
    if(data.type==='session.lineup')return updateSession(data.sessionId,data.version,s=>{if(s.status!=='active')throw new DomainError('הערב הסתיים.');if(data.rules&&s.matches.length)throw new DomainError('אפשר לשנות חוקים רק לפני המשחק הראשון.');validateLineup(data.playerIds,data.lineup,s.gameMode??'pairs');return {...s,playerIds:data.playerIds,lineup:data.lineup,rules:data.rules??s.rules,version:s.version+1,updatedAt:now};});
    if(data.type==='quote.add')return updateSession(data.sessionId,data.version,s=>{
      if(s.status!=='active')throw new DomainError('הערב הסתיים.');
      if(!s.playerIds.includes(data.playerId))throw new DomainError('השחקן אינו משתתף בערב.');
      return {...s,quotes:[...(s.quotes??[]),{id:crypto.randomUUID(),playerId:data.playerId,text:data.text,createdAt:now,matchNumber:s.matches.length+1}],version:s.version+1,updatedAt:now};
    });
    if(data.type==='quote.remove')return updateSession(data.sessionId,data.version,s=>{
      if(s.status!=='active')throw new DomainError('הערב הסתיים.');
      if(!s.quotes?.some(quote=>quote.id===data.quoteId))throw new DomainError('המשפט לא נמצא.');
      return {...s,quotes:s.quotes.filter(quote=>quote.id!==data.quoteId),version:s.version+1,updatedAt:now};
    });
    if(data.type==='match.edit')return updateSession(data.sessionId,data.version,s=>{
      const index=s.matches.findIndex(m=>m.id===data.matchId);if(index<0)throw new DomainError('המשחק לא נמצא.');
      const matches=[...s.matches];matches[index]=reviseMatchResult(matches[index],data.scoreA,data.scoreB,data.resultType,data.selectedWinner,data.technicalMinute,s.rules?.preset??'house');
      return {...s,matches,version:s.version+1,updatedAt:now};
    });
    return jsonError('פעולה לא נתמכת.');
  } catch(error) {
    if(error instanceof DomainError)return jsonError(error.message,400);
    if(error && typeof error==='object' && 'code' in error && error.code===11000)return jsonError('כבר יש ערב פעיל או רשומה זהה.',409);
    return jsonError('לא ניתן לשמור ב-MongoDB Atlas. בדקו את החיבור ונסו שוב.',503);
  }
}
