import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';
const cookieName='fifa_host';
function secret() { return process.env.SESSION_SECRET || (process.env.NODE_ENV==='development' ? 'local-development-secret-only' : ''); }
function token() { return createHmac('sha256',secret()).update('fifazugot-host-v1').digest('hex'); }
export function authConfigured() { return Boolean(process.env.HOST_PASSWORD && secret()); }
export async function isAuthorized() {
  if (process.env.NODE_ENV==='development' && !process.env.HOST_PASSWORD) return true;
  if (!authConfigured()) return false;
  const value=(await cookies()).get(cookieName)?.value || '';
  const expected=token();
  return value.length===expected.length && timingSafeEqual(Buffer.from(value),Buffer.from(expected));
}
export function passwordMatches(value: string) {
  const expected=process.env.HOST_PASSWORD || '';
  return Boolean(expected && value.length===expected.length && timingSafeEqual(Buffer.from(value),Buffer.from(expected)));
}
export async function setLoginCookie() { (await cookies()).set(cookieName,token(),{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*30}); }
export async function clearLoginCookie() { (await cookies()).delete(cookieName); }
