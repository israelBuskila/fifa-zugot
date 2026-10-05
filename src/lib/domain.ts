export class DomainError extends Error {}
export type Team = 'A' | 'B';
export type ResultType = 'normal' | 'penalties' | 'technical';
export type MatchEventType = 'goal' | 'own_goal' | 'penalty' | 'technical' | 'funny';
export interface Player { id: string; name: string; nickname?: string; avatar?: string; active: boolean; createdAt: string }
export interface Group { id: string; name: string; playerIds: string[]; createdAt: string }
export interface Lineup { A: string[]; B: string[]; bench: string[] }
export interface MatchEvent { id: string; type: MatchEventType; playerId?: string; team?: Team; minute?: number; text?: string }
export interface MatchParticipant { playerId: string; team: Team }
export interface Match {
  id: string; sessionId: string; sequenceNumber: number; participants: MatchParticipant[];
  scoreA: number; scoreB: number; winner: Team | null; resultType: ResultType;
  punchline?: string;
  punchlineStyle?: number;
  events: MatchEvent[]; startedAt: string; endedAt: string;
  benchBefore: string[]; leavingPlayerId?: string; lineupBefore: Lineup; lineupAfter: Lineup;
}
export interface Session {
  id: string; title: string; date: string; startedAt: string; endedAt?: string; status: 'active' | 'ended';
  notes?: string; playerIds: string[]; lineup: Lineup; scoreA: number; scoreB: number;
  matchStartedAt: string; matches: Match[]; version: number; updatedAt: string;
}
export const cloneLineup = (lineup: Lineup): Lineup => ({ A: [...lineup.A], B: [...lineup.B], bench: [...lineup.bench] });
export function validateLineup(playerIds: string[], lineup: Lineup): void {
  const all = [...lineup.A, ...lineup.B, ...lineup.bench];
  if (lineup.A.length !== 2 || lineup.B.length !== 2 || playerIds.length < 4 ||
      all.length !== playerIds.length || new Set(all).size !== all.length ||
      new Set(playerIds).size !== playerIds.length || all.some(id => !playerIds.includes(id))) {
    throw new DomainError('יש לבחור ארבעה שחקנים לשתי הקבוצות ולשבץ את השאר בספסל.');
  }
}
export function determineWinner(scoreA: number, scoreB: number, resultType: ResultType, selected?: Team): Team | null {
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0 || scoreA > 99 || scoreB > 99) throw new DomainError('תוצאה לא תקינה.');
  if (resultType !== 'normal') {
    if (!selected) throw new DomainError('יש לבחור קבוצה מנצחת.');
    return selected;
  }
  return scoreA === scoreB ? null : scoreA > scoreB ? 'A' : 'B';
}
export function reviseMatchResult(match: Match, scoreA: number, scoreB: number, resultType: ResultType, selected?: Team): Match {
  const winner = determineWinner(scoreA, scoreB, resultType, selected);
  const { punchline: ignoredPunchline, punchlineStyle: ignoredStyle, ...rest } = match;
  void ignoredPunchline;
  void ignoredStyle;
  return { ...rest, scoreA, scoreB, resultType, winner };
}
export function rotateLineup(lineup: Lineup, winner: Team | null, leavingPlayerId?: string): Lineup {
  const next = cloneLineup(lineup);
  if (!winner || !next.bench.length) return next;
  const loser: Team = winner === 'A' ? 'B' : 'A';
  if (!leavingPlayerId || !next[loser].includes(leavingPlayerId)) throw new DomainError('יש לבחור שחקן יוצא מהקבוצה המפסידה.');
  next[loser][next[loser].indexOf(leavingPlayerId)] = next.bench.shift()!;
  next.bench.push(leavingPlayerId);
  return next;
}
export function completeMatch(session: Session, input: { scoreA: number; scoreB: number; resultType: ResultType; selectedWinner?: Team; leavingPlayerId?: string; events?: MatchEvent[] }, now = new Date().toISOString()): Session {
  if (session.status !== 'active') throw new DomainError('הערב כבר הסתיים.');
  validateLineup(session.playerIds, session.lineup);
  const winner = determineWinner(input.scoreA, input.scoreB, input.resultType, input.selectedWinner);
  const before = cloneLineup(session.lineup);
  const after = rotateLineup(before, winner, input.leavingPlayerId);
  const match: Match = { id: crypto.randomUUID(), sessionId: session.id, sequenceNumber: session.matches.length + 1,
    participants: [...before.A.map(playerId => ({playerId, team: 'A' as Team})), ...before.B.map(playerId => ({playerId, team: 'B' as Team}))],
    scoreA: input.scoreA, scoreB: input.scoreB, winner, resultType: input.resultType, events: input.events ?? [],
    startedAt: session.matchStartedAt, endedAt: now, benchBefore: before.bench,
    leavingPlayerId: winner && before.bench.length ? input.leavingPlayerId : undefined,
    lineupBefore: before, lineupAfter: after };
  return { ...session, matches: [...session.matches, match], lineup: after, scoreA: 0, scoreB: 0, matchStartedAt: now, updatedAt: now, version: session.version + 1 };
}
export function undoLastMatch(session: Session, now = new Date().toISOString()): Session {
  if (session.status !== 'active' || !session.matches.length) throw new DomainError('אין משחק שאפשר לבטל.');
  const match = session.matches.at(-1)!;
  return { ...session, matches: session.matches.slice(0, -1), lineup: cloneLineup(match.lineupBefore),
    scoreA: match.scoreA, scoreB: match.scoreB, matchStartedAt: match.startedAt, updatedAt: now, version: session.version + 1 };
}
export interface RoundProgress { completed: { matchId: string; pair: [string, string] }[]; pair: [string, string] | null; beaten: number; required: number }
export function getRoundProgress(matches: Match[]): RoundProgress {
  const completed: RoundProgress['completed'] = [];
  let pair: [string, string] | null = null;
  let rosterKey = '';
  let required = 0;
  let beaten = new Set<string>();
  const key = (ids: string[]) => [...ids].sort().join(':');
  for (const match of [...matches].sort((a, b) => a.sequenceNumber - b.sequenceNumber)) {
    if (!match.winner) { pair = null; beaten = new Set(); required = 0; rosterKey = ''; continue; }
    const winners = match.participants.filter(player => player.team === match.winner).map(player => player.playerId);
    const opponents = match.participants.filter(player => player.team !== match.winner).map(player => player.playerId);
    const roster = [...new Set([...match.participants.map(player => player.playerId), ...match.benchBefore])];
    if (winners.length !== 2 || opponents.length !== 2 || roster.length < 4) continue;
    const nextPair = key(winners);
    const nextRoster = key(roster);
    if (!pair || key(pair) !== nextPair || rosterKey !== nextRoster) {
      pair = [...winners].sort() as [string, string];
      rosterKey = nextRoster;
      const otherCount = roster.length - 2;
      required = otherCount * (otherCount - 1) / 2;
      beaten = new Set();
    }
    beaten.add(key(opponents));
    if (beaten.size >= required) {
      completed.push({ matchId: match.id, pair });
      beaten = new Set();
    }
  }
  return { completed, pair, beaten: beaten.size, required };
}
export interface PlayerStats { playerId: string; played: number; wins: number; losses: number; draws: number; goalsFor: number; goalsAgainst: number; winRate: number; winningStreak: number; losingStreak: number; longestWinningStreak: number; longestLosingStreak: number }
export interface PairStats { playerIds: [string, string]; played: number; wins: number; losses: number; draws: number; goalsFor: number; goalsAgainst: number; winRate: number }
export function getPlayerStats(matches: Match[], playerId: string): PlayerStats {
  let wins=0, losses=0, draws=0, goalsFor=0, goalsAgainst=0, winningStreak=0, losingStreak=0, longestWinningStreak=0, longestLosingStreak=0;
  const own = matches.filter(m => m.participants.some(p => p.playerId === playerId)).sort((a,b)=>a.endedAt.localeCompare(b.endedAt));
  for (const m of own) {
    const team = m.participants.find(p => p.playerId === playerId)!.team;
    goalsFor += team === 'A' ? m.scoreA : m.scoreB; goalsAgainst += team === 'A' ? m.scoreB : m.scoreA;
    if (!m.winner) { draws++; winningStreak=0; losingStreak=0; }
    else if (m.winner === team) { wins++; winningStreak++; losingStreak=0; longestWinningStreak=Math.max(longestWinningStreak,winningStreak); }
    else { losses++; losingStreak++; winningStreak=0; longestLosingStreak=Math.max(longestLosingStreak,losingStreak); }
  }
  return { playerId, played:own.length, wins, losses, draws, goalsFor, goalsAgainst, winRate:own.length ? Math.round(wins/own.length*100) : 0, winningStreak, losingStreak, longestWinningStreak, longestLosingStreak };
}
export function getPairStats(matches: Match[], first: string, second: string): PairStats {
  let wins=0, losses=0, draws=0, goalsFor=0, goalsAgainst=0;
  const own=matches.filter(m => { const a=m.participants.find(p=>p.playerId===first), b=m.participants.find(p=>p.playerId===second); return a && b && a.team===b.team; });
  for (const m of own) { const team=m.participants.find(p=>p.playerId===first)!.team;
    goalsFor+=team==='A'?m.scoreA:m.scoreB; goalsAgainst+=team==='A'?m.scoreB:m.scoreA;
    if (!m.winner) draws++; else if(m.winner===team) wins++; else losses++;
  }
  return {playerIds:[first,second],played:own.length,wins,losses,draws,goalsFor,goalsAgainst,winRate:own.length?Math.round(wins/own.length*100):0};
}
export function getHeadToHead(matches: Match[], first: string, second: string) {
  let firstWins=0, secondWins=0, draws=0;
  const own=matches.filter(m=>{const a=m.participants.find(p=>p.playerId===first),b=m.participants.find(p=>p.playerId===second);return a&&b&&a.team!==b.team;});
  for (const m of own) { if(!m.winner)draws++; else if(m.participants.find(p=>p.playerId===first)!.team===m.winner)firstWins++;else secondWins++; }
  return {played:own.length,firstWins,secondWins,draws};
}
