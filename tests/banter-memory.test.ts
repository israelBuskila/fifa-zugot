import test from 'node:test';
import assert from 'node:assert/strict';
import { banterMemories, suggestBanterMemories } from '../src/lib/banter-memory';
import { completeMatch, type Session } from '../src/lib/domain';

const now = '2026-10-06T19:00:00.000Z';
function session(): Session {
  return {id:'night',title:'ערב פיפא',date:'2026-10-06',startedAt:now,status:'active',playerIds:['a','b','c','d','e'],lineup:{A:['a','b'],B:['c','d'],bench:['e']},scoreA:0,scoreB:0,matchStartedAt:now,matches:[],version:1,updatedAt:now};
}

test('curated archive contains sources and selects a neutral opening before results', () => {
  assert.ok(banterMemories.length >= 70);
  assert.equal(new Set(banterMemories.map(item => item.id)).size,banterMemories.length);
  assert.ok(banterMemories.every(item => item.speaker && item.date && item.context));
  const selected = suggestBanterMemories(session());
  assert.ok(selected.some(item => item.memory.trigger === 'always'));
  assert.ok(selected.every(item => item.memory.trigger !== 'technical' && item.memory.trigger !== 'noRound'));
});

test('another crew never receives the home chat archive, even with the same players', () => {
  const other: Session = {...session(),crew:'other'};
  assert.deepEqual(suggestBanterMemories(other),[]);
  const played = completeMatch({...other,rules:{preset:'free',version:1}},{scoreA:1,scoreB:0,resultType:'normal'});
  assert.deepEqual(suggestBanterMemories(played,played.matches[0]),[]);
  assert.ok(suggestBanterMemories({...session(),crew:'home'}).length > 0);
});

test('technical and its recorded minute select relevant memories', () => {
  const completed = completeMatch(session(),{scoreA:3,scoreB:0,resultType:'technical',technicalMinute:19,leavingPlayerId:'c'});
  const selected = suggestBanterMemories(completed,completed.matches[0]);
  assert.ok(selected.some(item => item.memory.id === 'fastest'));
  assert.ok(selected.some(item => item.memory.id === 'how-many'));
});

test('a saved quote selects the talk-versus-play memory for its own match', () => {
  const current = session();
  current.quotes = [{id:'q',playerId:'a',text:'לא שמים לנו גול',createdAt:now,matchNumber:1}];
  assert.ok(suggestBanterMemories(current).some(item => item.memory.id === 'talk-vs-play'));
  const later = completeMatch(current,{scoreA:1,scoreB:0,resultType:'normal',leavingPlayerId:'c'});
  assert.ok(!suggestBanterMemories(later).some(item => item.memory.id === 'talk-vs-play'));
});
