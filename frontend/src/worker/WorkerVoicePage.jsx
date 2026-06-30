import { useState } from 'react';
import { Mic } from 'lucide-react';
import api from '../api/client';
import { useTranslation } from '../context/LanguageContext';
import { speechLocale } from '../i18n/languages';

export default function WorkerVoicePage() {
  const { t, lang } = useTranslation();
  const [text, setText] = useState('');
  const [response, setResponse] = useState('');
  const [listening, setListening] = useState(false);

  const quick = ['What should I do next?', "I don't have this material", 'Is this safe to proceed?'];

  const ask = async (q) => {
    const { data } = await api.post('/worker/voice', { text: q, language: lang });
    setResponse(data.guidance_text);
    if (data.audio_base64) {
      try {
        const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`);
        audio.play();
        return;
      } catch (e) {
        console.warn('Audio play error, falling back to TTS', e);
      }
    }
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(data.guidance_text);
      u.lang = speechLocale(lang);
      speechSynthesis.speak(u);
    }
  };

  const startListen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert(t('speechNotSupported')); return; }
    const rec = new SR();
    rec.lang = speechLocale(lang);
    rec.onresult = (e) => { setText(e.results[0][0].transcript); setListening(false); };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-xl font-bold text-center">{t('voiceHelp')}</h1>
      <button onClick={startListen} className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center ${listening ? 'bg-red-500 animate-pulse' : 'bg-orange-500'} text-white`}>
        <Mic className="w-12 h-12" />
      </button>
      <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full border rounded-xl p-3 h-24" placeholder={t('speakOrType')} />
      <button onClick={() => ask(text)} className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold">{t('getHelp')}</button>
      <div className="space-y-2">
        {quick.map((q) => (
          <button key={q} onClick={() => { setText(q); ask(q); }} className="w-full border rounded-lg py-2 text-sm text-left px-3">{q}</button>
        ))}
      </div>
      {response && <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">{response}</div>}
    </div>
  );
}
