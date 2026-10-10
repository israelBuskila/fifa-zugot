import test from 'node:test';
import assert from 'node:assert/strict';
import { completeMatch, determineWinner, getCurrentCourtTenure, getCurrentPairTenure, getHeadToHead, getPairStats, getPlayerStats, getRotationDecision, getRoundProgress, getTechnicalStats, getPlayerRecords, getAllTimeRecords, getTieRotationDecision, resolveSessionGroupId, reviseMatchResult, rotateLineup, shuffleLineup, skipNextBenchPlayer, undoLastMatch, validateLineup, type Group, type Lineup, type Session } from '../src/lib/domain';
const lineup:Lineup={A:['a','b'],B:['c','d'],bench:['e']};
const now='2026-10-01T18:00:00.000Z';
function session():Session{return {id:'night',title:'Test',date:'2026-10-01',startedAt:now,status:'active',playerIds:['a','b','c','d','e'],lineup:{A:['a','b'],B:['c','d'],bench:['e']},scoreA:0,scoreB:0,matchStartedAt:now,matches:[],version:1,updatedAt:now}}
function singles(playerIds=['a','b','c'],preset:'house'|'free'='free'):Session{return {...session(),playerIds,lineup:{A:['a'],B:['b'],bench:playerIds.slice(2)},gameMode:'singles',rules:{preset,version:1}}}
test('session crew scope prefers an explicit group and supports exact legacy rosters',()=>{
  const groups:Group[]=[
    {id:'home',name:'החבורה',playerIds:['a','b','c','d','e'],createdAt:now,crew:'home'},
    {id:'friends',name:'חברים',playerIds:['a','b','c','d','e'],createdAt:now,crew:'other'},
  ];
  assert.equal(resolveSessionGroupId({...session(),playerIds:['a','b','c','d','guest'],groupId:'friends'},groups),'friends');
  assert.equal(resolveSessionGroupId(session(),groups),'home');
  assert.equal(resolveSessionGroupId({...session(),playerIds:['a','b','c','d']},groups),undefined);
});
test('two-player free night can save a normal draw without a rotation',()=>{
  const start=singles(['a','b']);validateLineup(start.playerIds,start.lineup,'singles');
  const done=completeMatch(start,{scoreA:2,scoreB:2,resultType:'normal'});
  assert.equal(done.matches[0].winner,null);assert.deepEqual(done.lineup,start.lineup);
});
test('three-player singles night rotates the chosen player and records the entrant',()=>{
  const start=singles();const done=completeMatch(start,{scoreA:2,scoreB:1,resultType:'normal',rotationTeam:'A',leavingPlayerId:'a',enteringPlayerId:'c'});
  assert.deepEqual(done.lineup,{A:['c'],B:['b'],bench:['a']});
  assert.equal(done.matches[0].enteringPlayerId,'c');assert.equal(done.matches[0].leavingPlayerId,'a');
});
test('free mode permits a regular 3:0 and a specific player from a longer bench',()=>{
  const start={...session(),playerIds:['a','b','c','d','e','f'],lineup:{A:['a','b'],B:['c','d'],bench:['e','f']},rules:{preset:'free' as const,version:1}};
  const done=completeMatch(start,{scoreA:3,scoreB:0,resultType:'normal',rotationTeam:'B',leavingPlayerId:'d',enteringPlayerId:'f'});
  assert.equal(done.matches[0].resultType,'normal');assert.deepEqual(done.lineup,{A:['a','b'],B:['c','f'],bench:['e','d']});
});
test('house singles draw first needs golden goal, then rotates the veteran on a later draw',()=>{
  let s=singles(['a','b','c'],'house');
  assert.throws(()=>completeMatch(s,{scoreA:1,scoreB:1,resultType:'normal'}),/גול זהב/);
  s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'b'});
  assert.equal(getTieRotationDecision(s.matches,s.lineup).loser,'A');
  s=completeMatch(s,{scoreA:2,scoreB:2,resultType:'normal',rotationTeam:'A',leavingPlayerId:'a'});
  assert.deepEqual(s.lineup,{A:['b'],B:['c'],bench:['a']});
});
test('winner handles normal, draws, and manual outcomes',()=>{assert.equal(determineWinner(3,2,'normal'),'A');assert.equal(determineWinner(1,4,'normal'),'B');assert.equal(determineWinner(2,2,'normal'),null);assert.equal(determineWinner(2,2,'penalties','B'),'B');assert.throws(()=>determineWinner(2,2,'penalties'));});

test('golden goal resolves a tied score as one match with a selected winner',()=>{assert.equal(determineWinner(2,2,'golden_goal','B'),'B');assert.throws(()=>determineWinner(2,2,'golden_goal'));assert.throws(()=>determineWinner(3,2,'golden_goal','A'));const done=completeMatch(session(),{scoreA:2,scoreB:2,resultType:'golden_goal',selectedWinner:'B',leavingPlayerId:'a'});assert.equal(done.matches.length,1);assert.equal(done.matches[0].winner,'B');assert.equal(done.matches[0].resultType,'golden_goal');assert.equal(done.matches[0].scoreA,2);assert.equal(done.matches[0].scoreB,2);});
test('loser replacement preserves teammate and makes leaver next bench',()=>{const next=rotateLineup(lineup,'B','a');assert.deepEqual(next,{A:['e','b'],B:['c','d'],bench:['a']});assert.deepEqual(lineup,{A:['a','b'],B:['c','d'],bench:['e']});assert.throws(()=>rotateLineup(lineup,'B','c'));});
test('bench queue supports more than five participants',()=>{const next=rotateLineup({A:['a','b'],B:['c','d'],bench:['e','f']},'A','c');assert.deepEqual(next.bench,['f','c']);assert.deepEqual(next.B,['e','d']);});
test('draw or no bench keeps lineup',()=>{assert.deepEqual(rotateLineup(lineup,null),lineup);assert.deepEqual(rotateLineup({A:['a','b'],B:['c','d'],bench:[]},'A'),{A:['a','b'],B:['c','d'],bench:[]});});
test('lineup validation rejects duplicates and missing bench players',()=>{validateLineup(['a','b','c','d','e'],lineup);assert.throws(()=>validateLineup(['a','b','c','d','e'],{A:['a','a'],B:['c','d'],bench:['e']}));});
test('shuffle keeps every selected player and changes partners on another click',()=>{const ids=['a','b','c','d','e'];const first=shuffleLineup(ids,lineup,()=>0);const second=shuffleLineup(ids,first,()=>0);validateLineup(ids,first);validateLineup(ids,second);const pairings=(value:Lineup)=>[value.A.slice().sort().join(''),value.B.slice().sort().join('')].sort().join('|');assert.notEqual(pairings(first),pairings(lineup));assert.notEqual(pairings(second),pairings(first));assert.deepEqual(ids,['a','b','c','d','e']);});
test('match completion records raw participants and undo restores score and lineup',()=>{const start={...session(),scoreA:3,scoreB:2};const done=completeMatch(start,{scoreA:3,scoreB:2,resultType:'normal',leavingPlayerId:'c'},'2026-10-01T18:20:00.000Z');assert.equal(done.matches[0].participants.length,4);assert.deepEqual(done.lineup,{A:['a','b'],B:['e','d'],bench:['c']});assert.equal(done.matches[0].winner,'A');const restored=undoLastMatch(done);assert.deepEqual(restored.lineup,start.lineup);assert.equal(restored.scoreA,3);assert.equal(restored.scoreB,2);assert.equal(restored.matches.length,0);});
test('editing a result clears its saved punchline while preserving the played lineup',()=>{const done=completeMatch(session(),{scoreA:3,scoreB:1,resultType:'normal',leavingPlayerId:'c'},'2026-10-01T18:20:00.000Z');const original={...done.matches[0],punchline:'בדיחה על 3:1',punchlineStyle:2};const edited=reviseMatchResult(original,1,4,'normal');assert.equal(edited.punchline,undefined);assert.equal(edited.punchlineStyle,undefined);assert.equal(edited.winner,'B');assert.equal(edited.scoreB,4);assert.deepEqual(edited.lineupBefore,original.lineupBefore);});
test('a pair completes a round only after beating every distinct opposing pair',()=>{let s=session();s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'c'});s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'d'});assert.deepEqual(getRoundProgress(s.matches).completed,[]);assert.equal(getRoundProgress(s.matches).beaten,2);s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'e'});const progress=getRoundProgress(s.matches);assert.equal(progress.completed.length,1);assert.deepEqual(progress.completed[0].pair,['a','b']);assert.equal(progress.beaten,0);assert.equal(progress.required,3);});
test('a draw interrupts a pairs round streak',()=>{let s=session();s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'c'});s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'d'});s=completeMatch(s,{scoreA:0,scoreB:0,resultType:'normal',rotationTeam:'A',leavingPlayerId:'a'});s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'e'});const progress=getRoundProgress(s.matches);assert.equal(progress.completed.length,0);assert.equal(progress.beaten,1);assert.equal(progress.required,3);});
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
  const decision=getRotationDecision(s.matches,s.lineup,'A');
  assert.equal(getCurrentCourtTenure(s.matches,s.lineup,'e'),2);
  assert.equal(getCurrentCourtTenure(s.matches,s.lineup,'c'),1);
  assert.equal(decision.requiresShuffle,false);
  assert.equal(decision.leavingPlayerId,'e');
});

test('a first-game draw or a draw without a bench must continue to golden goal',()=>{
  assert.throws(()=>completeMatch(session(),{scoreA:1,scoreB:1,resultType:'normal'}),/גול זהב/);
  const four={...session(),playerIds:['a','b','c','d'],lineup:{A:['a','b'],B:['c','d'],bench:[]}};
  assert.throws(()=>completeMatch(four,{scoreA:0,scoreB:0,resultType:'normal'}),/גול זהב/);
});

test('a later draw rotates the veteran pair and its most veteran player',()=>{
  let s=session();
  s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'c'});
  s=completeMatch(s,{scoreA:0,scoreB:1,resultType:'normal',leavingPlayerId:'a'});
  const decision=getTieRotationDecision(s.matches,s.lineup);
  assert.equal(getCurrentPairTenure(s.matches,s.lineup,'A'),0);
  assert.equal(getCurrentPairTenure(s.matches,s.lineup,'B'),1);
  assert.equal(decision.requiresGoldenGoal,false);
  assert.equal(decision.loser,'B');
  assert.equal(decision.leavingPlayerId,'d');
  s=completeMatch(s,{scoreA:2,scoreB:2,resultType:'normal',rotationTeam:'B',leavingPlayerId:'d'});
  assert.equal(s.matches.at(-1)?.winner,null);
  assert.deepEqual(s.lineup,{A:['c','b'],B:['e','a'],bench:['d']});
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


test('QA: five-player night tracks uninterrupted tenure and re-entry reset',()=>{
  let s=session();
  let decision=getRotationDecision(s.matches,s.lineup,'A');
  assert.equal(decision.requiresShuffle,true);
  s=completeMatch(s,{scoreA:2,scoreB:1,resultType:'normal',leavingPlayerId:'c'});
  assert.deepEqual(s.lineup,{A:['a','b'],B:['e','d'],bench:['c']});
  s=completeMatch(s,{scoreA:2,scoreB:1,resultType:'normal',leavingPlayerId:'d'});
  assert.deepEqual(s.lineup,{A:['a','b'],B:['e','c'],bench:['d']});
  decision=getRotationDecision(s.matches,s.lineup,'B');
  assert.deepEqual(decision.tenures,{a:3,b:3});
  assert.equal(decision.requiresShuffle,true);
  s=completeMatch(s,{scoreA:1,scoreB:2,resultType:'normal',leavingPlayerId:'a'});
  assert.deepEqual(s.lineup,{A:['d','b'],B:['e','c'],bench:['a']});
  assert.equal(getCurrentCourtTenure(s.matches,s.lineup,'d'),1);
  assert.equal(getCurrentCourtTenure(s.matches,s.lineup,'b'),4);
  decision=getRotationDecision(s.matches,s.lineup,'B');
  assert.equal(decision.leavingPlayerId,'b');
});

test('QA: seven-player queue preserves order across rotation and skip',()=>{
  let s={...session(),playerIds:['a','b','c','d','e','f','g'],lineup:{A:['a','b'],B:['c','d'],bench:['e','f','g']}};
  s=completeMatch(s,{scoreA:2,scoreB:1,resultType:'normal',leavingPlayerId:'c'});
  assert.deepEqual(s.lineup,{A:['a','b'],B:['e','d'],bench:['f','g','c']});
  s=completeMatch(s,{scoreA:1,scoreB:0,resultType:'normal',skipRotation:true});
  assert.deepEqual(s.lineup,{A:['a','b'],B:['e','d'],bench:['g','c','f']});
  s=completeMatch(s,{scoreA:0,scoreB:2,resultType:'normal',leavingPlayerId:'a'});
  assert.deepEqual(s.lineup,{A:['g','b'],B:['e','d'],bench:['c','f','a']});
});

test('QA: draw, penalties, golden goal and technical each record exactly one match',()=>{
  let s:Session={...session(),rules:{preset:'free',version:1}};
  s=completeMatch(s,{scoreA:1,scoreB:1,resultType:'golden_goal',selectedWinner:'A',rotationTeam:'B',leavingPlayerId:'c'});
  assert.equal(s.matches.length,1); assert.equal(s.matches[0].resultType,'golden_goal'); assert.equal(s.matches[0].winner,'A');
  s=completeMatch(s,{scoreA:2,scoreB:2,resultType:'penalties',selectedWinner:'A',rotationTeam:'B',leavingPlayerId:'d'});
  assert.equal(s.matches.length,2); assert.equal(s.matches[1].winner,'A');
  s=completeMatch(s,{scoreA:3,scoreB:3,resultType:'normal',rotationTeam:'A',leavingPlayerId:'a'});
  assert.equal(s.matches.length,3); assert.equal(s.matches[2].resultType,'normal'); assert.equal(s.matches[2].winner,null);
  const loser=s.lineup.A[0];
  s=completeMatch(s,{scoreA:0,scoreB:3,resultType:'technical',technicalMinute:12,rotationTeam:'A',leavingPlayerId:loser});
  assert.equal(s.matches.length,4); assert.equal(s.matches[3].resultType,'technical'); assert.equal(s.matches[3].technicalMinute,12);
});

test('QA: undo after a rotated match restores the exact pre-match queue and score',()=>{
  const start={...session(),playerIds:['a','b','c','d','e','f'],lineup:{A:['a','b'],B:['c','d'],bench:['e','f']},scoreA:4,scoreB:2};
  const done=completeMatch(start,{scoreA:4,scoreB:2,resultType:'normal',leavingPlayerId:'c'},'2026-10-01T18:20:00.000Z');
  assert.deepEqual(done.lineup,{A:['a','b'],B:['e','d'],bench:['f','c']});
  const restored=undoLastMatch(done,'2026-10-01T18:21:00.000Z');
  assert.deepEqual(restored.lineup,start.lineup);
  assert.equal(restored.scoreA,4); assert.equal(restored.scoreB,2); assert.equal(restored.matches.length,0);
});

test('QA: a player appended to a six-player night waits at the end of the bench queue',()=>{
  const s={...session(),playerIds:['a','b','c','d','e','f'],lineup:{A:['a','b'],B:['c','d'],bench:['e','f']}};
  validateLineup(s.playerIds,s.lineup);
  const joined={...s,playerIds:[...s.playerIds,'g'],lineup:{...s.lineup,bench:[...s.lineup.bench,'g']}};
  validateLineup(joined.playerIds,joined.lineup);
  assert.deepEqual(joined.lineup.bench,['e','f','g']);
});
