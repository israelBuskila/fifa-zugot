import { createGoogle } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthorized } from '@/lib/auth';
import { collections } from '@/lib/db';

export const runtime = 'nodejs';

const requestSchema = z.object({ sessionId: z.string().uuid(), matchId: z.string().uuid(), regenerate: z.boolean().optional() });
const styles = [
  'כמו שדרן ספורט נלהב שמגזים בכיף, עם סיום מפתיע.',
  'כמו הודעה מצחיקה במסיבת עיתונאים אחרי המשחק.',
  'כמו סיפור דרמטי וקליל על החבורה, עם טוויסט בשורה האחרונה.',
  'כמו עקיצה חברית חכמה בקבוצת הווטסאפ, בלי להעליב אף אחד.',
];

export async function POST(request: Request) {
  if (!await isAuthorized()) return NextResponse.json({ error: 'יש להתחבר.' }, { status: 401 });
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return NextResponse.json({ error: 'בקשה ממקור לא מורשה.' }, { status: 403 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'פרטי הבקשה אינם תקינים.' }, { status: 400 });

  try {
    const { sessions, players } = await collections();
    const session = await sessions.findOne({ id: parsed.data.sessionId });
    const match = session?.matches.find(item => item.id === parsed.data.matchId);
    if (!session || !match) return NextResponse.json({ error: 'המשחק לא נמצא.' }, { status: 404 });
    const regenerate = Boolean(parsed.data.regenerate && match.punchline);
    if (match.punchline && !regenerate) return NextResponse.json({ punchline: match.punchline, punchlineStyle: match.punchlineStyle ?? 0, version: session.version }, { headers: { 'Cache-Control': 'no-store' } });
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'יש להגדיר מפתח Gemini API במסלול החינמי.' }, { status: 503 });

    const roster = await players.find({ id: { $in: match.participants.map(participant => participant.playerId) } }).toArray();
    const name = (id: string) => roster.find(player => player.id === id)?.nickname || roster.find(player => player.id === id)?.name || 'שחקן';
    const facts = {
      number: match.sequenceNumber,
      teamA: match.lineupBefore.A.map(name),
      teamB: match.lineupBefore.B.map(name),
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      winner: match.winner,
      resultType: match.resultType,
      events: match.events.slice(0, 5).map(event => ({ type: event.type, player: event.playerId ? name(event.playerId) : undefined, minute: event.minute, text: event.text?.slice(0, 100) })),
    };
    const punchlineStyle = regenerate ? ((match.punchlineStyle ?? 0) + 1) % styles.length : 0;
    const result = await generateText({
      model: createGoogle({ apiKey: process.env.GEMINI_API_KEY })('gemini-3.5-flash-lite'),
      instructions: `כתוב פאנץ׳ מצחיק בעברית על משחק FIFA זוגות, בערך שלוש שורות קצרות עם ירידות שורה. סגנון: ${styles[punchlineStyle]} הומור חברי שמתאים לחבורה. התבסס רק על נתוני המשחק: הזכר לפחות פרט אמיתי אחד מהתוצאה או מהקבוצות; אל תמציא אירועים. בלי קללות, עלבונות אישיים, Markdown, מספור או מרכאות. עד 320 תווים בסך הכול.`,
      prompt: JSON.stringify({ facts, previousPunchlineToAvoid: regenerate ? match.punchline : undefined, instruction: regenerate ? 'צור פאנץ׳ חדש ושונה בבירור מהקודם: זווית, דימוי, ניסוח וסיומת אחרים. אל תחזור על ביטויים או בדיחות ממנו.' : undefined }),
      maxOutputTokens: 260,
      abortSignal: AbortSignal.timeout(15000),
    });
    const punchline = result.text.trim().replace(/^['"“”׳״]+|['"“”׳״]+$/g, '').split('\n').map(line => line.trim()).filter(Boolean).slice(0, 3).join('\n').slice(0, 360);
    if (!punchline) throw new Error('Empty AI result');
    if (regenerate && punchline === match.punchline) return NextResponse.json({ error: 'התקבל אותו פאנץ׳. נסו שוב.' }, { status: 502 });

    const saved = await sessions.updateOne(
      { id: session.id, version: session.version, matches: { $elemMatch: { id: match.id, punchline: regenerate ? match.punchline : { $exists: false }, scoreA: match.scoreA, scoreB: match.scoreB, resultType: match.resultType, winner: match.winner } } },
      { $set: { 'matches.$.punchline': punchline, 'matches.$.punchlineStyle': punchlineStyle, updatedAt: new Date().toISOString() }, $inc: { version: 1 } },
    );
    if (!saved.modifiedCount) {
      const latest = await sessions.findOne({ id: session.id });
      const current = latest?.matches.find(item => item.id === match.id);
      if (current?.punchline && (!regenerate || current.punchline !== match.punchline)) return NextResponse.json({ punchline: current.punchline, punchlineStyle: current.punchlineStyle ?? 0, version: latest!.version }, { headers: { 'Cache-Control': 'no-store' } });
      return NextResponse.json({ error: 'המשחק עודכן בינתיים. נסו שוב.' }, { status: 409 });
    }
    return NextResponse.json({ punchline, punchlineStyle, version: session.version + 1 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'יצירת הפאנץ׳ נכשלה. נסו שוב בעוד רגע.' }, { status: 502 });
  }
}
