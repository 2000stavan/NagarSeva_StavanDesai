const SARVAM_BASE = 'https://api.sarvam.ai/translate';

/** Short app codes → Sarvam BCP-47 codes */
export const SARVAM_LANG_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  od: 'od-IN',
};

const cache = new Map();

function cacheKey(text, target) {
  return `${target}::${text}`;
}

export function isSarvamConfigured() {
  return Boolean(process.env.SARVAM_API_KEY?.trim());
}

export async function translateText(text, targetLang, sourceLang = 'en') {
  if (!text?.trim()) return text;

  const target = SARVAM_LANG_MAP[targetLang] || `${targetLang}-IN`;
  const source = SARVAM_LANG_MAP[sourceLang] || 'en-IN';

  if (target === source || targetLang === 'en') return text;

  const key = cacheKey(text, target);
  if (cache.has(key)) return cache.get(key);

  if (!isSarvamConfigured()) return text;

  try {
    const res = await fetch(SARVAM_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': process.env.SARVAM_API_KEY,
      },
      body: JSON.stringify({
        input: text,
        source_language_code: source,
        target_language_code: target,
        model: 'sarvam-translate:v1',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Sarvam translate error:', res.status, err);
      return text;
    }

    const data = await res.json();
    const translated = data.translated_text || data.output || text;
    cache.set(key, translated);
    return translated;
  } catch (err) {
    console.error('Sarvam translate failed:', err.message);
    return text;
  }
}

/** Translate a map of { key: englishText } with bounded concurrency */
export async function translateBatch(stringMap, targetLang, { concurrency = 4 } = {}) {
  if (targetLang === 'en') return { ...stringMap };

  const entries = Object.entries(stringMap);
  const result = {};
  let i = 0;

  async function worker() {
    while (i < entries.length) {
      const idx = i++;
      const [key, text] = entries[idx];
      result[key] = await translateText(text, targetLang);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, worker));
  return result;
}

/** Synthesize audio using Sarvam AI Text-to-Speech (bulbul:v1) */
export async function synthesizeSpeech(text, targetLang = 'hi') {
  if (!text?.trim() || !isSarvamConfigured()) return null;
  const target = SARVAM_LANG_MAP[targetLang] || `${targetLang}-IN`;
  try {
    const res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': process.env.SARVAM_API_KEY,
      },
      body: JSON.stringify({
        inputs: [text.slice(0, 450)],
        target_language_code: target,
        speaker: 'meera',
        pitch: 0,
        pace: 1.05,
        loudness: 1.5,
        speech_sample_rate: 8000,
        enable_preprocessing: true,
        model: 'bulbul:v1'
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.audios?.[0] || null;
  } catch (err) {
    console.error('Sarvam TTS error:', err.message);
    return null;
  }
}
