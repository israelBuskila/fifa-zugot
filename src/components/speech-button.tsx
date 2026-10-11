'use client';

import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import { Square, Volume2 } from 'lucide-react';

let activeSpeechId: string | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
const speechListeners = new Set<() => void>();

function notifySpeechListeners() {
  speechListeners.forEach(listener => listener());
}

function setActiveSpeechId(id: string | null) {
  if (activeSpeechId === id) return;
  activeSpeechId = id;
  notifySpeechListeners();
}

function subscribeToSpeech(listener: () => void) {
  speechListeners.add(listener);
  return () => speechListeners.delete(listener);
}

function getActiveSpeechId() {
  return activeSpeechId;
}

function getServerSpeechId() {
  return null;
}

const spokenNumbers: Record<string, string> = {
  '0': 'אפס',
  '1': 'אחת',
  '2': 'שתיים',
  '3': 'שלוש',
  '4': 'ארבע',
  '5': 'חמש',
  '6': 'שש',
  '7': 'שבע',
  '8': 'שמונה',
  '9': 'תשע',
  '10': 'עשר',
};

function prepareTextForSpeech(text: string) {
  return text
    .replace(/\bFIFA\b/gi, 'פיפא')
    .replace(/\bAI\b/gi, 'איי איי')
    .replace(/פרנג[׳'’]?ס/g, 'פְרִינְגֶ׳ס')
    .replace(/(\d{1,2})\s*:\s*(\d{1,2})/g, (_, left: string, right: string) =>
      `${spokenNumbers[left] ?? left} ${spokenNumbers[right] ?? right}`,
    )
    .replace(/[״“”]/g, '')
    .trim();
}

function stopSpeech(id: string) {
  if (activeSpeechId !== id || typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  activeUtterance = null;
  setActiveSpeechId(null);
}

function startSpeech(id: string, text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  const synthesis = window.speechSynthesis;
  synthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(prepareTextForSpeech(text));
  const voices = synthesis.getVoices();
  const hebrewVoice = voices.find(voice => voice.lang.toLowerCase() === 'he-il')
    ?? voices.find(voice => voice.lang.toLowerCase().startsWith('he'));

  utterance.lang = 'he-IL';
  utterance.rate = 0.96;
  utterance.pitch = 1;
  if (hebrewVoice) utterance.voice = hebrewVoice;

  const finish = () => {
    if (activeSpeechId === id) {
      activeUtterance = null;
      setActiveSpeechId(null);
    }
  };
  utterance.onend = finish;
  utterance.onerror = finish;

  setActiveSpeechId(id);
  activeUtterance = utterance;
  try {
    synthesis.speak(utterance);
  } catch {
    activeUtterance = null;
    setActiveSpeechId(null);
  }
}

export function SpeechButton({ text, label = 'הקרא' }: { text: string; label?: string }) {
  const id = useId();
  const [supported, setSupported] = useState(false);
  const currentSpeechId = useSyncExternalStore(subscribeToSpeech, getActiveSpeechId, getServerSpeechId);
  const speaking = currentSpeechId === id;

  useEffect(() => {
    setSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
    return () => stopSpeech(id);
  }, [id]);

  function toggleSpeech() {
    if (speaking) stopSpeech(id);
    else startSpeech(id, text);
  }

  return (
    <button
      type="button"
      className={`speech-button${speaking ? ' speaking' : ''}`}
      onClick={toggleSpeech}
      disabled={!supported || !text.trim()}
      aria-pressed={speaking}
      aria-label={speaking ? `עצירת ${label}` : label}
      title={supported ? undefined : 'הקראה אינה נתמכת במכשיר הזה'}
    >
      {speaking ? <Square size={14} fill="currentColor" /> : <Volume2 size={16} />}
      {speaking ? 'עצור' : label}
    </button>
  );
}
