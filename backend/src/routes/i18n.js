import { Router } from 'express';
import { SARVAM_LANG_MAP, isSarvamConfigured, translateBatch } from '../services/sarvam.js';

const router = Router();

router.get('/languages', (_req, res) => {
  res.json({
    languages: Object.keys(SARVAM_LANG_MAP).map((code) => ({
      code,
      sarvamCode: SARVAM_LANG_MAP[code],
    })),
    sarvamConfigured: isSarvamConfigured(),
  });
});

router.post('/translate', async (req, res) => {
  try {
    const { lang, strings } = req.body;
    if (!lang || !strings || typeof strings !== 'object') {
      return res.status(400).json({ error: 'lang and strings object required' });
    }

    if (!SARVAM_LANG_MAP[lang]) {
      return res.status(400).json({ error: `Unsupported language: ${lang}` });
    }

    if (lang === 'en') {
      return res.json({ lang, translations: strings, source: 'english' });
    }

    if (!isSarvamConfigured()) {
      return res.json({
        lang,
        translations: strings,
        source: 'fallback',
        message: 'Add SARVAM_API_KEY to backend/.env for live translation',
      });
    }

    const translations = await translateBatch(strings, lang);
    res.json({ lang, translations, source: 'sarvam' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Translation failed' });
  }
});

export default router;
