'use client';
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface InstallPrompt extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [ios, setIos] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const standalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setIos(!standalone && /iPad|iPhone|iPod/.test(navigator.userAgent));
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const onInstalled = () => { setPrompt(null); setShowHelp(false); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  if (!prompt && !ios) return null;
  return <div className="install-wrap"><button className="header-action" onClick={async () => { if (prompt) { await prompt.prompt(); await prompt.userChoice; setPrompt(null); } else setShowHelp(value => !value); }}><Download size={15}/><span>התקנה</span></button>{showHelp && <div className="install-help" role="status">ב־Safari לחצו על שיתוף ואז ״הוספה למסך הבית״.</div>}</div>;
}
