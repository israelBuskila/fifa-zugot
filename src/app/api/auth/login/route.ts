import { NextResponse } from 'next/server';
import { passwordMatches, setLoginCookie } from '@/lib/auth';
export async function POST(request: Request) {
  const body=await request.json().catch(()=>({}));
  if (!passwordMatches(String(body.password||''))) return NextResponse.json({error:'סיסמה שגויה.'},{status:401});
  await setLoginCookie(); return NextResponse.json({ok:true});
}
