import { generateText } from 'ai';
import { createGoogle } from '@ai-sdk/google';
import { NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/auth';
import { collections } from '@/lib/db';
import { getPairStats, getPlayerStats } from '@/lib/domain';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!await isAuthorized()) return NextResponse.json({ error: 'יש להתחבר.' }, { status: 401 });
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'יש להגדיר מפתח Gemini API במסלול החינמי.' }, { status: 503 });
  }

  let sessionId: unknown;
  try { sessionId = (await request.json()).sessionId; }
  catch { return NextResponse.json({ error: 'בקשה לא תקינה.' }, { status: 400 }); }
  if (typeof sessionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
    return NextResponse.json({ error: 'מזהה ערב לא תקין.' }, { status: 400 });
  }

  try {
    const { sessions, players } = await collections();
    const session = await sessions.findOne({ id: sessionId });
    if (!session) return NextResponse.json({ error: 'הערב לא נמצא.' }, { status: 404 });
    if (!session.matches.length) return NextResponse.json({ error: 'יש לסיים משחק לפני יצירת סיכום.' }, { status: 400 });
    const roster = await players.find({ id: { $in: session.playerIds } }).toArray();
    const name = (id: string) => roster.find(player => player.id === id)?.nickname || roster.find(player => player.id === id)?.name || 'שחקן';
    const facts = {
      title: session.title,
      date: session.date,
      recentMatches: session.matches.slice(-20).map(match => ({
        number: match.sequenceNumber,
        teamA: match.lineupBefore.A.map(name),
        teamB: match.lineupBefore.B.map(name),
        score: `${match.scoreA}:${match.scoreB}`,
        winner: match.winner,
        resultType: match.resultType,
        events: match.events.slice(0, 5).map(event => ({ type: event.type, player: event.playerId ? name(event.playerId) : undefined, text: event.text?.slice(0, 120) })),
      })),
      players: session.playerIds.map(id => {
        const stats = getPlayerStats(session.matches, id);
        return { name: name(id), played: stats.played, wins: stats.wins, losses: stats.losses, draws: stats.draws, goalsFor: stats.goalsFor, goalsAgainst: stats.goalsAgainst };
      }),
      pairs: session.playerIds.flatMap((id, index) => session.playerIds.slice(index + 1).map(other => {
        const stats = getPairStats(session.matches, id, other);
        return { names: [name(id), name(other)], played: stats.played, wins: stats.wins };
      })).filter(pair => pair.played),
    };
    const { text } = await generateText({
      model: createGoogle({ apiKey: process.env.GEMINI_API_KEY })('gemini-3.5-flash-lite'),
      instructions: 'כתוב בעברית טבעית, קלילה ומצחיקה סיכום של ערב FIFA זוגות ב-3 עד 5 משפטים. השתמש אך ורק בעובדות שב-JSON. אל תמציא משחקים, שערים, שמות או אירועים. אפשר עקיצה ידידותית קלה, בלי עלבונות. אל תציג JSON או Markdown.',
      prompt: JSON.stringify(facts),
      maxOutputTokens: 260,
      abortSignal: AbortSignal.timeout(15000),
    });
    return NextResponse.json({ recap: text.trim() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'יצירת הסיכום נכשלה. בדקו את חיבור MongoDB ואת מפתח Gemini ונסו שוב.' }, { status: 502 });
  }
}
