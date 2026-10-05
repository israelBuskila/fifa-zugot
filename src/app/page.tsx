import { isAuthorized, authConfigured } from '@/lib/auth';
import { App } from '@/components/app';
import { Login } from '@/components/login';
export const dynamic='force-dynamic';
export default async function Home(){const authorized=await isAuthorized();return authorized?<App/>:<Login configured={authConfigured()}/>}
