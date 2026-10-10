import { generateText } from 'ai';
import { createGoogle } from '@ai-sdk/google';
import { NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/auth';
import { collections } from '@/lib/db';
import { getPairStats, getPlayerStats, getRoundProgress, getTechnicalStats } from '@/lib/domain';
import { groupVoiceNotes, suggestBanterMemories } from '@/lib/banter-memory';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!await isAuthorized()) return NextResponse.json({ error: 'יש להתחבר.' }, { status: 401 });
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'יש להגדיר מפתח Gemini API במסלול החינמי.' }, { status: 503 });
  }

  let sessionId: unknown;
  let mode: unknown;
  try { const body=await request.json(); sessionId=body.sessionId; mode=body.mode; }
  catch { return NextResponse.json({ error: 'בקשה לא תקינה.' }, { status: 400 }); }
  if (typeof sessionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
    return NextResponse.json({ error: 'מזהה ערב לא תקין.' }, { status: 400 });
  }

  try {
    const { sessions, players } = await collections();
    const session = await sessions.findOne({ id: sessionId });
    if (!session) return NextResponse.json({ error: 'הערב לא נמצא.' }, { status: 404 });
    const humor = session.humor ?? (session.crew === 'other' ? 'neutral' : 'house');
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
        technicalMinute: match.technicalMinute,
        events: match.events.slice(0, 5).map(event => ({ type: event.type, player: event.playerId ? name(event.playerId) : undefined, text: event.text?.slice(0, 120) })),
      })),
      players: session.playerIds.map(id => {
        const stats = getPlayerStats(session.matches, id);
        return { name: name(id), played: stats.played, wins: stats.wins, losses: stats.losses, draws: stats.draws, goalsFor: stats.goalsFor, goalsAgainst: stats.goalsAgainst, technicals:getTechnicalStats(session.matches,id) };
      }),
      pairs: session.playerIds.flatMap((id, index) => session.playerIds.slice(index + 1).map(other => {
        const stats = getPairStats(session.matches, id, other);
        return { names: [name(id), name(other)], played: stats.played, wins: stats.wins };
      })).filter(pair => pair.played),
      completedRounds: getRoundProgress(session.matches).completed.map(round => round.pair.map(name)),
      quotesFromNight: (session.quotes ?? []).slice(-6).map(quote => ({player:name(quote.playerId),text:quote.text,matchNumber:quote.matchNumber})),
      archive: [
        ...suggestBanterMemories(session).slice(0,3).map(({memory,reason}) => ({text:memory.text,speaker:memory.speaker,date:memory.date,whyRelevant:reason})),
        ...(session.quotes ?? []).slice(-6).map(quote => ({text:quote.text,speaker:name(quote.playerId),date:quote.createdAt,whyRelevant:`נשמר באפליקציה לפני משחק ${quote.matchNumber}`})),
      ],
      writingVoices: humor === 'house' && session.crew !== 'other' ? groupVoiceNotes(roster) : [],
    };
    const quoteOnly=mode==='quote';
    const neutralInstructions = quoteOnly ? 'צור משפט ערב חדש, קצר ומצחיק בעברית, המבוסס על עובדה אמיתית מהערב. אל תשתמש בשפה הפנימית או בזיכרונות של החבורה הקבועה ואל תמציא ציטוט אמיתי. החזר רק את המשפט, בלי Markdown.' : 'כתוב סיכום של ערב FIFA בין חברים בעברית, 3 עד 5 משפטים קצרים המבוססים רק על הנתונים שסופקו. סיים בעקיצה קלילה על אירוע אמיתי. בשורה נפרדת שמתחילה בדיוק NIGHT_QUOTE: כתוב משפט ערב חדש שאינו ציטוט אמיתי. אל תשתמש בשפה הפנימית או בזיכרונות של החבורה הקבועה. בלי Markdown.';
    const borrowedHouseInstructions = quoteOnly ? 'צור משפט ערב חדש וקצר בסגנון החבורה הקבועה. מותר להשתמש בבורקס, פרנג׳ס, ועדת משמעת, ראיות וסבבים; אסור להשתמש בציטוטים, בשמות, בדמויות או בזיכרונות מארכיון החבורה. הסתמך רק על עובדות הערב ואל תמציא ציטוט אמיתי. בלי Markdown.' : 'כתוב סיכום ערב FIFA בעברית, 3 עד 5 משפטים קצרים, בסגנון החבורה הקבועה. מותר להשתמש בבורקס, פרנג׳ס, ועדת משמעת, ראיות וסבבים; אסור להשתמש בציטוטים, בשמות, בדמויות או בזיכרונות מארכיון החבורה. הסתמך רק על עובדות הערב. בשורה נפרדת שמתחילה בדיוק NIGHT_QUOTE: כתוב משפט חדש שאינו ציטוט אמיתי. בלי Markdown.';
    const homeInstructions = quoteOnly ? 'צור משפט ערב אחד בלבד בעברית, קצר, חד ומצחיק, בסגנון הטראש־טוק של archive ו-writingVoices. המשפט צריך להישען על עובדה אמיתית מהערב ולהיות ניסוח חדש, לא ציטוט אמיתי. החזר רק את המשפט בלי מרכאות ובלי Markdown.' : 'כתוב סיכום ערב FIFA בעברית של החבורה, 3 עד 5 משפטים קצרים המבוססים על עובדות הערב, וסיים בעקיצה אחת. בשורה חדשה שמתחילה בדיוק NIGHT_QUOTE: כתוב משפט ערב חדש בסגנון archive ו-writingVoices. אל תציג ציטוט או זיכרון ישן כאילו נאמר הערב ואל תמציא תוצאות או אירועים. בלי Markdown.';
    const aiInstructions = humor === 'neutral' ? neutralInstructions : session.crew === 'other' ? borrowedHouseInstructions : homeInstructions;
    const { text } = await generateText({
      model: createGoogle({ apiKey: process.env.GEMINI_API_KEY })('gemini-3.5-flash-lite'),
      instructions: aiInstructions,
      prompt: JSON.stringify(facts),
      maxOutputTokens: 260,
      abortSignal: AbortSignal.timeout(15000),
    });
    if(quoteOnly) return NextResponse.json({ nightQuote:text.trim() }, { headers:{'Cache-Control':'no-store'} });
    const marker='NIGHT_QUOTE:'; const index=text.lastIndexOf(marker); const recap=index>=0?text.slice(0,index).trim():text.trim(); const nightQuote=index>=0?text.slice(index+marker.length).trim():'';
    return NextResponse.json({ recap, nightQuote }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error && 'cause' in error ? String(error.cause ?? '') : '';
    const details = `${message} ${cause}`;
    console.error('[ai-recap] generation failed', { name: error instanceof Error ? error.name : typeof error, message, cause });

    if (/429|resource[_ -]?exhausted|quota|rate.?limit/i.test(details)) {
      return NextResponse.json({ error: 'נגמרה כרגע מכסת Gemini החינמית או שהגענו למגבלת הבקשות. נסו שוב אחרי איפוס המכסה.' }, { status: 429 });
    }
    if (/abort|timeout|timed out/i.test(details)) {
      return NextResponse.json({ error: 'Gemini לא הספיק לענות בזמן. נסו שוב בעוד רגע.' }, { status: 504 });
    }
    if (/api.?key|permission|403|401|unauth/i.test(details)) {
      return NextResponse.json({ error: 'יש בעיה בהרשאה מול Gemini. צריך לבדוק את הגדרת GEMINI_API_KEY ב-Vercel.' }, { status: 502 });
    }
    return NextResponse.json({ error: 'יצירת סיכום ה-AI נכשלה. נסו שוב; פרטי התקלה נשמרו בלוג השרת.' }, { status: 502 });
  }
}
