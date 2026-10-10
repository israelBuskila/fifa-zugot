export class DomainError extends Error {}
export type Team = 'A' | 'B';
export type RulePreset = 'house' | 'free';
export type GameMode = 'singles' | 'pairs';
export type ResultType = 'normal' | 'penalties' | 'golden_goal' | 'technical';
export type MatchEventType = 'goal' | 'own_goal' | 'penalty' | 'technical' | 'funny';
export interface Player { id: string; name: string; nickname?: string; avatar?: string; active: boolean; createdAt: string }
export interface Group { id: string; name: string; playerIds: string[]; createdAt: string }
export interface NightQuote { id: string; playerId: string; text: string; createdAt: string; matchNumber: number }
export interface Lineup { A: string[]; B: string[]; bench: string[] }
export interface MatchEvent { id: string; type: MatchEventType; playerId?: string; team?: Team; minute?: number; text?: string }
export interface MatchParticipant { playerId: string; team: Team }
export interface Match {
  id: string; sessionId: string; sequenceNumber: number; participants: MatchParticipant[];
  scoreA: number; scoreB: number; winner: Team | null; resultType: ResultType;
  technicalMinute?: number;
  punchline?: string;
  punchlineStyle?: number;
  events: MatchEvent[]; startedAt: string; endedAt: string;
  benchBefore: string[]; leavingPlayerId?: string; enteringPlayerId?: string; lineupBefore: Lineup; lineupAfter: Lineup;
}
export interface Session {
  id: string; title: string; date: string; startedAt: string; endedAt?: string; status: 'active' | 'ended';
  notes?: string; quotes?: NightQuote[]; playerIds: string[]; lineup: Lineup; scoreA: number; scoreB: number;
  matchStartedAt: string; matches: Match[]; version: number; updatedAt: string;
  rules?: { preset: RulePreset; version: number }; gameMode?: GameMode;
}
export const cloneLineup = (lineup: Lineup): Lineup => ({ A: [...lineup.A], B: [...lineup.B], bench: [...lineup.bench] });
export function shuffleLineup(playerIds: string[], previous?: Lineup, random = Math.random, teamSize: 1 | 2 = 2): Lineup {
  if (playerIds.length < teamSize * 2 || new Set(playerIds).size !== playerIds.length) throw new DomainError('אין מספיק שחקנים להרכב.');
  const pairings = (lineup: Lineup) => [lineup.A.slice().sort().join(':'), lineup.B.slice().sort().join(':')].sort().join('|');
  let shuffled = [...playerIds];
  for (let attempt = 0; attempt < 8; attempt++) {
    shuffled = [...playerIds];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
    }
    const candidate = { A: shuffled.slice(0, teamSize), B: shuffled.slice(teamSize, teamSize * 2), bench: shuffled.slice(teamSize * 2) };
    if (!previous || pairings(candidate) !== pairings(previous)) return candidate;
  }
  [shuffled[0], shuffled[teamSize]] = [shuffled[teamSize], shuffled[0]];
  return { A: shuffled.slice(0, teamSize), B: shuffled.slice(teamSize, teamSize * 2), bench: shuffled.slice(teamSize * 2) };
}
export function validateLineup(playerIds: string[], lineup: Lineup, gameMode: GameMode = 'pairs'): void {
  const all = [...lineup.A, ...lineup.B, ...lineup.bench];
  const teamSize = gameMode === 'singles' ? 1 : 2;
  if (lineup.A.length !== teamSize || lineup.B.length !== teamSize || playerIds.length < teamSize * 2 ||
      all.length !== playerIds.length || new Set(all).size !== all.length ||
      new Set(playerIds).size !== playerIds.length || all.some(id => !playerIds.includes(id))) {
    throw new DomainError(`יש לבחור ${teamSize * 2} שחקנים למגרש ולשבץ את השאר בספסל.`);
  }
}
export function determineWinner(scoreA: number, scoreB: number, resultType: ResultType, selected?: Team, enforceTechnical = true): Team | null {
  if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0 || scoreA > 99 || scoreB > 99) throw new DomainError('תוצאה לא תקינה.');
  if (scoreA === 3 && scoreB === 0 || scoreA === 0 && scoreB === 3) {
    if (resultType === 'golden_goal' || resultType === 'penalties') throw new DomainError('פנדלים וגול זהב אפשר לבחור רק כשהתוצאה בתיקו.');
    if (resultType !== 'technical' && enforceTechnical) throw new DomainError('משחק שמגיע ל־3:0 מסתיים בטכני.');
    if (resultType !== 'technical') return scoreA === 3 ? 'A' : 'B';
    const winner = scoreA === 3 ? 'A' : 'B';
    if (selected && selected !== winner) throw new DomainError('המנצח בטכני חייב להתאים לתוצאה.');
    return winner;
  }
  if (resultType === 'technical') throw new DomainError('טכני נרשם רק בתוצאה 3:0.');
  if (resultType === 'penalties' && scoreA !== scoreB) throw new DomainError('פנדלים אפשר לבחור רק כשהתוצאה בתיקו.');
  if (resultType === 'golden_goal' && scoreA !== scoreB) throw new DomainError('גול זהב אפשר לבחור רק כשהתוצאה בתיקו.');
  if (resultType !== 'normal') {
    if (!selected) throw new DomainError('יש לבחור קבוצה מנצחת.');
    return selected;
  }
  return scoreA === scoreB ? null : scoreA > scoreB ? 'A' : 'B';
}
export function validateTechnicalMinute(resultType: ResultType, minute?: number): void {
  if (minute !== undefined && (resultType !== 'technical' || !Number.isInteger(minute) || minute < 0 || minute > 130)) {
    throw new DomainError('דקת טכני חייבת להיות בין 0 ל־130 ורק במשחק טכני.');
  }
}
export function reviseMatchResult(match: Match, scoreA: number, scoreB: number, resultType: ResultType, selected?: Team, technicalMinute?: number, rulesPreset: RulePreset = 'house'): Match {
  const winner = determineWinner(scoreA, scoreB, resultType, selected, rulesPreset === 'house');
  validateTechnicalMinute(resultType, technicalMinute);
  const { punchline: ignoredPunchline, punchlineStyle: ignoredStyle, ...rest } = match;
  void ignoredPunchline;
  void ignoredStyle;
  return { ...rest, scoreA, scoreB, resultType, winner, technicalMinute: resultType === 'technical' ? technicalMinute : undefined };
}
export interface RotationDecision { loser: Team | null; candidates: string[]; tenures: Record<string, number>; leavingPlayerId?: string; requiresShuffle: boolean; nextBenchPlayerId?: string }
export interface TieRotationDecision extends RotationDecision { requiresGoldenGoal: boolean; pairTenures: Record<Team, number> }
export function getCurrentCourtTenure(matches: Match[], lineup: Lineup, playerId: string): number {
  if (![...lineup.A, ...lineup.B].includes(playerId)) return 0;
  let tenure = 0;
  for (let index = matches.length - 1; index >= 0; index--) {
    if (!matches[index].participants.some(participant => participant.playerId === playerId)) break;
    tenure++;
  }
  return Math.max(1, tenure + (matches.length === 0 ? 0 : 1));
}
export function getRotationDecision(matches: Match[], lineup: Lineup, winner: Team | null): RotationDecision {
  if (!winner || !lineup.bench.length) return { loser: null, candidates: [], tenures: {}, requiresShuffle: false };
  const loser: Team = winner === 'A' ? 'B' : 'A';
  return getTeamRotationDecision(matches, lineup, loser);
}
function getTeamRotationDecision(matches: Match[], lineup: Lineup, team: Team): RotationDecision {
  const candidates = [...lineup[team]];
  const tenures = Object.fromEntries(candidates.map(playerId => [playerId, getCurrentCourtTenure(matches, lineup, playerId)]));
  const [first, second] = candidates;
  const requiresShuffle = Boolean(second && tenures[first] === tenures[second]);
  const leavingPlayerId = requiresShuffle ? undefined : !second || tenures[first] > tenures[second] ? first : second;
  return { loser: team, candidates, tenures, leavingPlayerId, requiresShuffle, nextBenchPlayerId: lineup.bench[0] };
}
export function getCurrentPairTenure(matches: Match[], lineup: Lineup, team: Team): number {
  const pair = new Set(lineup[team]);
  let tenure = 0;
  for (let index = matches.length - 1; index >= 0; index--) {
    const participants = matches[index].participants.filter(participant => pair.has(participant.playerId));
    if (participants.length !== 2 || participants[0].team !== participants[1].team) break;
    tenure++;
  }
  return tenure;
}
export function getTieRotationDecision(matches: Match[], lineup: Lineup): TieRotationDecision {
  const singles = lineup.A.length === 1;
  const pairTenures = singles
    ? { A: getCurrentCourtTenure(matches, lineup, lineup.A[0]), B: getCurrentCourtTenure(matches, lineup, lineup.B[0]) }
    : { A: getCurrentPairTenure(matches, lineup, 'A'), B: getCurrentPairTenure(matches, lineup, 'B') };
  if (!lineup.bench.length || matches.length === 0 || pairTenures.A === pairTenures.B) {
    return { loser: null, candidates: [], tenures: {}, requiresShuffle: false, requiresGoldenGoal: true, pairTenures };
  }
  const veteranTeam: Team = pairTenures.A > pairTenures.B ? 'A' : 'B';
  return { ...getTeamRotationDecision(matches, lineup, veteranTeam), requiresGoldenGoal: false, pairTenures };
}
export function skipNextBenchPlayer(lineup: Lineup): Lineup {
  const next = cloneLineup(lineup);
  if (next.bench.length > 1) next.bench.push(next.bench.shift()!);
  return next;
}
export function rotateLineup(lineup: Lineup, winner: Team | null, leavingPlayerId?: string): Lineup {
  if (!winner) return cloneLineup(lineup);
  const loser: Team = winner === 'A' ? 'B' : 'A';
  return rotateTeamLineup(lineup, loser, leavingPlayerId);
}
function rotateTeamLineup(lineup: Lineup, team: Team, leavingPlayerId?: string, enteringPlayerId?: string): Lineup {
  const next = cloneLineup(lineup);
  if (!next.bench.length) return next;
  if (!leavingPlayerId || !next[team].includes(leavingPlayerId)) throw new DomainError('יש לבחור שחקן יוצא מהקבוצה שמתחלפת.');
  const entrantIndex = enteringPlayerId ? next.bench.indexOf(enteringPlayerId) : 0;
  if (entrantIndex < 0) throw new DomainError('השחקן הנכנס אינו בספסל.');
  next[team][next[team].indexOf(leavingPlayerId)] = next.bench.splice(entrantIndex, 1)[0];
  next.bench.push(leavingPlayerId);
  return next;
}
export function completeMatch(session: Session, input: { scoreA: number; scoreB: number; resultType: ResultType; selectedWinner?: Team; technicalMinute?: number; leavingPlayerId?: string; enteringPlayerId?: string; rotationTeam?: Team; skipRotation?: boolean; events?: MatchEvent[] }, now = new Date().toISOString()): Session {
  if (session.status !== 'active') throw new DomainError('הערב כבר הסתיים.');
  validateLineup(session.playerIds, session.lineup, session.gameMode ?? 'pairs');
  const freeMode = session.rules?.preset === 'free';
  const winner = determineWinner(input.scoreA, input.scoreB, input.resultType, input.selectedWinner, !freeMode);
  validateTechnicalMinute(input.resultType, input.technicalMinute);
  const before = cloneLineup(session.lineup);
  const isNormalDraw = input.resultType === 'normal' && !winner;
  let rotationTeam: Team | null = null;
  if (freeMode) {
    if (input.skipRotation) throw new DomainError('במצב חופשי בוחרים חילוף או ממשיכים עם אותו הרכב.');
    rotationTeam = input.rotationTeam ?? null;
    if (rotationTeam && !before.bench.length) throw new DomainError('אין שחקן ממתין לחילוף.');
    if (!rotationTeam && (input.leavingPlayerId || input.enteringPlayerId)) throw new DomainError('יש לבחור קבוצה לחילוף.');
  } else if (isNormalDraw) {
    const decision = getTieRotationDecision(session.matches, before);
    if (decision.requiresGoldenGoal) throw new DomainError('בתיקו הזה ממשיכים לגול זהב.');
    if (input.rotationTeam !== decision.loser) throw new DomainError('בתיקו הוותיקים הם הקבוצה שמתחלפת.');
    rotationTeam = decision.loser;
  } else {
    if (input.scoreA === input.scoreB) {
      const decision = getTieRotationDecision(session.matches, before);
      if (decision.requiresGoldenGoal && input.resultType !== 'golden_goal') throw new DomainError('בתיקו הזה ממשיכים לגול זהב.');
      if (!decision.requiresGoldenGoal) throw new DomainError('בתיקו הזה הוותיקים מתחלפים ללא הכרעה נוספת.');
    }
    if (input.rotationTeam) throw new DomainError('קבוצה מתחלפת נשלחת רק בתיקו רגיל.');
    rotationTeam = winner ? winner === 'A' ? 'B' : 'A' : null;
  }
  if (!freeMode && input.enteringPlayerId && input.enteringPlayerId !== before.bench[0]) throw new DomainError('בחוקי הבית נכנס הראשון בתור.');
  const after = input.skipRotation ? skipNextBenchPlayer(before) : rotationTeam ? rotateTeamLineup(before, rotationTeam, input.leavingPlayerId, input.enteringPlayerId) : before;
  const match: Match = { id: crypto.randomUUID(), sessionId: session.id, sequenceNumber: session.matches.length + 1,
    participants: [...before.A.map(playerId => ({playerId, team: 'A' as Team})), ...before.B.map(playerId => ({playerId, team: 'B' as Team}))],
    scoreA: input.scoreA, scoreB: input.scoreB, winner, resultType: input.resultType, technicalMinute: input.technicalMinute, events: input.events ?? [],
    startedAt: session.matchStartedAt, endedAt: now, benchBefore: before.bench,
    leavingPlayerId: !input.skipRotation && rotationTeam && before.bench.length ? input.leavingPlayerId : undefined,
    enteringPlayerId: !input.skipRotation && rotationTeam && before.bench.length ? input.enteringPlayerId ?? before.bench[0] : undefined,
    lineupBefore: before, lineupAfter: after };
  return { ...session, matches: [...session.matches, match], lineup: after, scoreA: 0, scoreB: 0, matchStartedAt: now, updatedAt: now, version: session.version + 1 };
}
export function undoLastMatch(session: Session, now = new Date().toISOString()): Session {
  if (session.status !== 'active' || !session.matches.length) throw new DomainError('אין משחק שאפשר לבטל.');
  const match = session.matches.at(-1)!;
  return { ...session, matches: session.matches.slice(0, -1), lineup: cloneLineup(match.lineupBefore),
    scoreA: match.scoreA, scoreB: match.scoreB, matchStartedAt: match.startedAt, updatedAt: now, version: session.version + 1 };
}
export interface RoundProgress { completed: { matchId: string; pair: [string, string] }[]; pair: [string, string] | null; beaten: number; required: number; opponents: {pair:[string,string]; beaten:boolean}[] }
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
  const remaining = pair ? rosterKey.split(':').filter(id => !pair!.includes(id)) : [];
  const opponents = remaining.flatMap((id, index) => remaining.slice(index + 1).map(other => {
    const rivalPair = [id, other].sort() as [string, string];
    return {pair:rivalPair, beaten:beaten.has(key(rivalPair))};
  }));
  return { completed, pair, beaten: beaten.size, required, opponents };
}
export function getTechnicalStats(matches: Match[], playerId: string) {
  const own = matches.filter(match => match.participants.some(p => p.playerId === playerId));
  const technicals = own.filter(match => match.resultType === 'technical' && (match.scoreA === 3 && match.scoreB === 0 || match.scoreA === 0 && match.scoreB === 3));
  const given = technicals.filter(match => match.participants.some(p => p.playerId === playerId && p.team === match.winner));
  const received = technicals.length - given.length;
  const fastest = given.map(match => match.technicalMinute).filter((minute):minute is number => minute !== undefined).sort((a,b) => a-b)[0];
  return {given:given.length, received, fastest};
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


export interface PlayerRecords {
  playerId: string;
  benchGames: number;
  ownGoals: number;
  funnyEvents: number;
  technicalsGiven: number;
  technicalsReceived: number;
  fastestTechnical?: number;
  biggestWinMargin: number;
  biggestLossMargin: number;
}
export function getPlayerRecords(matches: Match[], playerId: string): PlayerRecords {
  let benchGames=0, ownGoals=0, funnyEvents=0, biggestWinMargin=0, biggestLossMargin=0;
  for (const match of matches) {
    if (match.benchBefore.includes(playerId)) benchGames++;
    const participant=match.participants.find(p=>p.playerId===playerId);
    if (!participant) continue;
    ownGoals += match.events.filter(event=>event.type==='own_goal'&&event.playerId===playerId).length;
    funnyEvents += match.events.filter(event=>event.type==='funny'&&event.playerId===playerId).length;
    const ownScore=participant.team==='A'?match.scoreA:match.scoreB;
    const otherScore=participant.team==='A'?match.scoreB:match.scoreA;
    const margin=Math.abs(ownScore-otherScore);
    if (match.winner===participant.team) biggestWinMargin=Math.max(biggestWinMargin,margin);
    else if (match.winner) biggestLossMargin=Math.max(biggestLossMargin,margin);
  }
  const technicals=getTechnicalStats(matches,playerId);
  return {playerId,benchGames,ownGoals,funnyEvents,technicalsGiven:technicals.given,technicalsReceived:technicals.received,fastestTechnical:technicals.fastest,biggestWinMargin,biggestLossMargin};
}
export function getAllTimeRecords(matches: Match[], playerIds: string[]) {
  const records=playerIds.map(id=>getPlayerRecords(matches,id));
  const by=(pick:(record:PlayerRecords)=>number)=>[...records].sort((a,b)=>pick(b)-pick(a))[0];
  const biggestMatch=[...matches].sort((a,b)=>Math.abs(b.scoreA-b.scoreB)-Math.abs(a.scoreA-a.scoreB))[0];
  const fastestTechnical=[...matches].filter(match=>match.resultType==='technical'&&match.technicalMinute!==undefined).sort((a,b)=>a.technicalMinute!-b.technicalMinute!)[0];
  return {
    benchKing: by(record=>record.benchGames),
    ownGoalKing: by(record=>record.ownGoals),
    technicalKing: by(record=>record.technicalsGiven),
    technicalCustomer: by(record=>record.technicalsReceived),
    biggestMatch,
    fastestTechnical,
  };
}
