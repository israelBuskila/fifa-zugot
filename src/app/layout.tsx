import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata:Metadata={title:'FIFA זוגות | ערב משחקים',description:'ניהול מהיר של ערבי FIFA זוגות',applicationName:'FIFA זוגות',manifest:'/manifest.webmanifest',icons:{icon:'/icons/icon-192.png',apple:'/icons/apple-touch-icon.png'},appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'FIFA זוגות'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#101a2d'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="he" dir="rtl"><body>{children}</body></html>}
