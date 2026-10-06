import test from 'node:test';
import assert from 'node:assert/strict';
import { completeMatch, determineWinner, getCurrentCourtTenure, getHeadToHead, getPairStats, getPlayerStats, getRotationDecision, getRoundProgress, getTechnicalStats, getPlayerRecords, getAllTimeRecords, reviseMatchResult, rotateLineup, shuffleLineup, skipNextBenchPlayer, undoLastMatch, validateLineup, type Lineup, type Session } from '../src/lib/domain';
const lineup:Lineup={A:['a','b'],B:['c','d'],bench:['e']};
const now='2026-10-01T18:00:00.000Z';
function session():Session{return {id:'night',title:'Test',date:'2026-10-01',startedAt:now,status:'active',playerIds:['a','b','c','d','e'],lineup:{A:['a','b'],B:['c','d'],bench:['e']},scoreA:0,scoreB:0,matchStartedAt:now,matches:[],version:1,updatedAt:now}}
test('winner handles normal, draws, and manual outcomes',()=>{assert.equal(determineWinner(3,2,'normal'),'A');assert.equal(determineWinner(1,4,'normal'),'B');assert.equal(determineWinner(2,2,'normal'),null);assert.equal(determineWinner(2,2,'penalties','B'),'B');assert.throws(()=>determineWinner(2,2,'penalties'));});

test('golden goal resolves a tied score as one match with a selected winner',()=>{assert.equal(determineWinner(2,2,'golden_goal','B'),'B');assert.throws(()=>determineWinner(2,2,'golden_goal'));const done=completeMatch(session(),{scoreA:2,scoreB:2,resultType:'golden_goal',selectedWinner:'B',leavingPlayerId:'a'});assert.equal(done.matches.length,1);assert.equal(done.matches[0].winner,'B');assert.equal(done.matches[0].resultType,'golden_goal');assert.equal(done.matches[0].scoreA,2);assert.equal(done.matches[0].scoreB,2);});
test('loser replacement preserves teammate and makes leaver next bench',()=>{const next=rotateLineup(lineup,'B','a');assert.deepEqual(next,{A:['e','b'],B:['c','d'],bench:['a']});assert.deepEqual(lineup,{A:['a','b'],B:['c','d'],bench:['e']});assert.throws(()=>rotateLineup(lineup,'B','c'));});
test('bench queue supports more than five participants',()=>{const next=rotateLineup({A:['a','b'],B:['c','d'],bench:['e','f']},'A','c');assert.deepEqual(next.bench,['f','c']);assert.deepEqual(next.B,['e','d']);});
test('draw or no bench keeps lineup',()=>{assert.deepEqual(rotateLineup(lineup,null),lineup);assert.deepEqual(rotateLineup({A:['a','b'],B:['c','d'],bench:[]},'A'),{A:['a','b'],B:['c','d'],bench:[]});});
test('lineup validation rejects duplicates and missing bench players',()=>{validateLineup(['a','b','c','d','e'],lineup);assert.throws(()=>validateLineup(['a','b','c','d','e'],{A:['a','a'],B:['c','d'],bench:['e']}));});
test('shuffle keeps every selected player and changes partners on another click',()=>{const ids=['a','b','c','d','e'];const first=shuffleLineup(ids,lineup,()=>0);const second=shuffleLineup(ids,first,()=>0);validateLineup(ids,first);validateLineup(ids,second);const pairings=(value:Lineup)=>[value.A.slice().sort().join(''),value.B.slice().sort().join('')].sort().join('|');assert.notEqual(pairings(first),pairings(lineup));assert.notEqual(pairings(second),pairings(first));assert.deepEqual(ids,['a','b','c','d','e']);});
test('match completion records raw participants and undo restores score and lineup',()=>{const start={...session(),scoreA:3,scoreB:2};const done=completeMatch(start,{scoreA:3,scoreB:2,resultType:'normal',leavingPlayerId:'c'},'2026-10-01T18:20:00.000Z');assert.equal(done.matches[0].participants.length,4);assert.deepEqual(done.lineup,{A:['a','b'],B:['e','d'],bench:['c']});assert.equal(done.matches[0].winner,'A');const restored=undoLastMatch(done);assert.deepEqual(restored.lineup,start.lineup);assert.equal(restored.scoreA,3);assert.equal(restored.scoreB,2);assert.equal(restored.matches.length,0);});
test('editing a result clears its saved punchline while preserving the played lineup',()=>{const done=completeMatch(session(),{scoreA:3,scoreB:1,resultType:'normal',leavingPlayerId:'c'},'2026-10-01T18:20:00.000Z');const original={...done.matches[0],punchline:'בדיחה על 3:1',punchlineStyle:2};const edited=reviseMatchResult(original,1,4,'normal');assert.equal(edited.punchline,undefined);assert.equal(edited.punchlineStyle,undefined);assert.equal(edited.winner,'B');assert.equal(edited.scoreB,4);assert.deepEqual(edited.lineupBefore,original.lineupBefore);});
test('a pair completes a round only after beating every distinct opposing pair',()=>{let s=session();s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'c'});s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'d'});assert.deepEqual(getRoundProgress(s.matches).completed,[]);assert.equal(getRoundProgress(s.matches).beaten,2);s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'e'});const progress=getRoundProgress(s.matches);assert.equal(progress.completed.length,1);assert.deepEqual(progress.completed[0].pair,['a','b']);assert.equal(progress.beaten,0);assert.equal(progress.required,3);});
test('a draw interrupts a pairs round streak',()=>{let s=session();s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'c'});s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'d'});s=completeMatch(s,{scoreA:0,scoreB:0,resultType:'normal'});s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'e'});const progress=getRoundProgress(s.matches);assert.equal(progress.completed.length,0);assert.equal(progress.beaten,1);assert.equal(progress.required,3);});
test('pair, opponent and streak calculations use match history',()=>{let s=session();s=completeMatch(s,{scoreA:3,scoreB:1,resultType:'normal',leavingPlayerId:'c'},'2026-10-01T18:20:00.000Z');s=completeMatch(s,{scoreA:1,scoreB:2,resultType:'normal',leavingPlayerId:'a'},'2026-10-01T18:40:00.000Z');const a=getPlayerStats(s.matches,'a');assert.equal(a.played,2);assert.equal(a.wins,1);assert.equal(a.losses,1);assert.equal(a.longestWinningStreak,1);assert.equal(a.losingStreak,1);const pair=getPairStats(s.matches,'a','b');assert.equal(pair.played,2);assert.equal(pair.wins,1);const h2h=getHeadToHead(s.matches,'a','d');assert.deepEqual(h2h,{played:2,firstWins:1,secondWins:1,draws:0});});
test('technical is exactly 3:0, ends with the matching winner, and preserves its match minute',()=>{
  assert.throws(()=>determineWinner(3,0,'normal'));
  assert.throws(()=>determineWinner(4,1,'technical','A'));
  assert.throws(()=>determineWinner(3,0,'technical','B'));
  let s=session();
  s=completeMatch(s,{scoreA:3,scoreB:0,resultType:'technical',technicalMinute:19,leavingPlayerId:'c'});
  assert.equal(s.matches[0].technicalMinute,19);
  assert.equal(s.matches[0].winner,'A');
  assert.deepEqual(getTechnicalStats(s.matches,'a'),{given:1,received:0,fastest:19});
  assert.deepEqual(getTechnicalStats(s.matches,'c'),{given:0,received:1,fastest:undefined});
  assert.deepEqual(getTechnicalStats(s.matches,'d'),{given:0,received:1,fastest:undefined});
  assert.throws(()=>completeMatch(session(),{scoreA:3,scoreB:0,resultType:'technical',technicalMinute:131,leavingPlayerId:'c'}));
  const edited=reviseMatchResult(s.matches[0],2,1,'normal');
  assert.equal(edited.technicalMinute,undefined);
});
test('round progress names each opposing pair and only marks distinct beaten pairs',()=>{
  let s=session();
  s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'c'});
  const first=getRoundProgress(s.matches);
  assert.deepEqual(first.opponents,[
    {pair:['c','d'],beaten:true},
    {pair:['c','e'],beaten:false},
    {pair:['d','e'],beaten:false},
  ]);
  s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'d'});
  assert.equal(getRoundProgress(s.matches).beaten,2);
});

test('equal current court tenure requires shuffle',()=>{
  const decision=getRotationDecision([],lineup,'A');
  assert.equal(decision.requiresShuffle,true);
  assert.equal(decision.leavingPlayerId,undefined);
  assert.deepEqual(decision.tenures,{c:1,d:1});
  assert.equal(decision.nextBenchPlayerId,'e');
});
test('the loser with the longer current uninterrupted court run leaves',()=>{
  let s=session();
  s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'c'});
  s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'d'});
  const decision=getRotationDecision(s.matches,s.lineup,'B');
  assert.equal(getCurrentCourtTenure(s.matches,s.lineup,'a'),3);
  assert.equal(getCurrentCourtTenure(s.matches,s.lineup,'c'),1);
  assert.equal(decision.requiresShuffle,false);
  assert.equal(decision.leavingPlayerId,'a');
});
test('bench skip rotates the queue without changing the four players on court',()=>{
  const current={A:['a','b'],B:['c','d'],bench:['e','f','g']};
  const next=skipNextBenchPlayer(current);
  assert.deepEqual(next,{A:['a','b'],B:['c','d'],bench:['f','g','e']});
  assert.deepEqual(current,{A:['a','b'],B:['c','d'],bench:['e','f','g']});
});

test('records count bench appearances, own goals and biggest margins from existing match data',()=>{
  let s=session();
  s=completeMatch(s,{scoreA:4,scoreB:1,resultType:'normal',leavingPlayerId:'c',events:[{id:'og',type:'own_goal',playerId:'c'}]},'2026-10-01T18:20:00.000Z');
  const cRecord=getPlayerRecords(s.matches,'c');
  const eRecord=getPlayerRecords(s.matches,'e');
  assert.equal(cRecord.ownGoals,1);
  assert.equal(cRecord.biggestLossMargin,3);
  assert.equal(eRecord.benchGames,1);
  const records=getAllTimeRecords(s.matches,s.playerIds);
  assert.equal(records.benchKing?.playerId,'e');
  assert.equal(records.ownGoalKing?.playerId,'c');
  assert.equal(records.biggestMatch?.id,s.matches[0].id);
});

test('skipping rotation completes the match atomically and keeps the same four on court',()=>{
  const start={...session(),lineup:{A:['a','b'],B:['c','d'],bench:['e']}};
  const done=completeMatch(start,{scoreA:2,scoreB:1,resultType:'normal',skipRotation:true},'2026-10-01T18:20:00.000Z');
  assert.deepEqual(done.lineup.A,['a','b']);
  assert.deepEqual(done.lineup.B,['c','d']);
  assert.deepEqual(done.lineup.bench,['e']);
  assert.equal(done.matches.length,1);
  assert.equal(done.matches[0].leavingPlayerId,undefined);
});
test('skipping rotation advances a multi-player bench queue while keeping court players',()=>{
  const start={...session(),playerIds:['a','b','c','d','e','f','g'],lineup:{A:['a','b'],B:['c','d'],bench:['e','f','g']}};
  const done=completeMatch(start,{scoreA:2,scoreB:1,resultType:'normal',skipRotation:true});
  assert.deepEqual(done.lineup,{A:['a','b'],B:['c','d'],bench:['f','g','e']});
});
