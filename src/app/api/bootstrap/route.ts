import { NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/auth';
import { collections, databaseConfigured } from '@/lib/db';
export const dynamic='force-dynamic';
export async function GET() {
  if (!await isAuthorized()) return NextResponse.json({error:'יש להתחבר.'},{status:401});
  if (!databaseConfigured()) return NextResponse.json({error:'חסר חיבור MongoDB Atlas. הגדירו MONGODB_URI בשרת.'},{status:503});
  try {
    const {players,groups,sessions}=await collections();
    const [p,g,s]=await Promise.all([players.find({}).sort({createdAt:1}).toArray(),groups.find({}).sort({createdAt:1}).toArray(),sessions.find({}).sort({startedAt:-1}).toArray()]);
    return NextResponse.json({players:p.map(({_id,...rest})=>rest),groups:g.map(({_id,...rest})=>rest),sessions:s.map(({_id,...rest})=>rest)},{headers:{'Cache-Control':'no-store'}});
  } catch { return NextResponse.json({error:'לא ניתן להתחבר ל-MongoDB Atlas. בדקו URI והרשאות רשת.'},{status:503}); }
}
