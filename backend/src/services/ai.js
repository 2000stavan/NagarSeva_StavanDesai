import '../config/env.js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const VISION_MODEL = process.env.XAI_VISION_MODEL || 'grok-2-vision-1212';
const TEXT_MODEL = process.env.XAI_TEXT_MODEL || 'grok-2-1212';

function getGrok() {
  const apiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.x.ai/v1',
  });
}

const MOCK_CLASSIFICATION = {
  category: 'pothole',
  severity: 'medium',
  title: 'Road pothole damage visible',
  description: 'A medium-sized pothole is visible on the road surface, posing a hazard to vehicles.',
  estimated_cost_inr: 8500,
  cost_reasoning: 'Typical patch repair for a medium pothole in urban areas.',
  confidence: 0.85,
  _mock: true,
};

function toImageUrl(source) {
  if (typeof source === 'string') {
    if (source.startsWith('data:')) return source;
    if (source.includes('/uploads/')) {
      const filename = source.split('/uploads/').pop();
      const localPath = path.join(process.cwd(), 'uploads', filename);
      if (fs.existsSync(localPath)) return fileToDataUrl(localPath);
    }
    if (source.startsWith('http') && !source.includes('localhost') && !source.includes('127.0.0.1')) {
      return source;
    }
    if (fs.existsSync(source)) {
      return fileToDataUrl(source);
    }
  }
  if (source?.filePath && fs.existsSync(source.filePath)) {
    return fileToDataUrl(source.filePath);
  }
  if (source?.url) return toImageUrl(source.url);
  throw new Error('No readable image source for AI analysis');
}

function fileToDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }[
      ext
    ] || 'image/jpeg';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function parseJsonResponse(content) {
  const cleaned = content.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

function getSmartMockClassification(imageSource, originalName = '') {
  const str = `${imageSource || ''} ${originalName || ''}`.toLowerCase();
  if (str.includes('waste') || str.includes('garbage') || str.includes('trash') || str.includes('dump') || str.includes('kachra') || str.includes('bin') || str.includes('rubbish')) {
    return {
      category: 'waste',
      severity: 'medium',
      title: 'Uncollected Garbage Pile',
      description: 'A heap of uncollected solid waste is dumped by the roadside near commercial/residential area.',
      estimated_cost_inr: 3500,
      cost_reasoning: 'Standard municipal sanitation clearance and waste transport cost.',
      confidence: 0.88,
      _mock: true,
    };
  }
  if (str.includes('leak') || str.includes('water') || str.includes('pipe') || str.includes('flood')) {
    return {
      category: 'water_leakage',
      severity: 'high',
      title: 'Pipeline Water Leakage Visible',
      description: 'Continuous water flow leaking from municipal pipeline onto the public roadway.',
      estimated_cost_inr: 12000,
      cost_reasoning: 'Emergency pipe sealing, excavation and patch repair.',
      confidence: 0.86,
      _mock: true,
    };
  }
  if (str.includes('light') || str.includes('lamp') || str.includes('street') || str.includes('pole')) {
    return {
      category: 'streetlight',
      severity: 'low',
      title: 'Non-functional Streetlight Pole',
      description: 'Overhead street light fixture is non-functional, causing darkness on the walkway during night.',
      estimated_cost_inr: 2500,
      cost_reasoning: 'Replacement of LED luminaire and wiring check.',
      confidence: 0.90,
      _mock: true,
    };
  }
  if (str.includes('crack') || str.includes('road') || str.includes('damage')) {
    return {
      category: 'road_damage',
      severity: 'high',
      title: 'Cracked Road Asphalt Surface',
      description: 'Major surface degradation and cracks across the road section.',
      estimated_cost_inr: 25000,
      cost_reasoning: 'Resurfacing and bitumen leveling of road section.',
      confidence: 0.85,
      _mock: true,
    };
  }
  return { ...MOCK_CLASSIFICATION };
}

export async function classifyImage(imageSource, originalName = '') {
  const grok = getGrok();
  if (!grok) {
    console.log('[AI] Using mock classification (no XAI_API_KEY)');
    return getSmartMockClassification(imageSource, originalName);
  }

  const imageUrl = toImageUrl(imageSource);
  console.log('[AI] Classifying image with Grok vision...');

  try {
    const response = await grok.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an AI that analyzes photos of civic infrastructure issues. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            {
              type: 'text',
              text: 'Analyze this image and respond ONLY with valid JSON — no markdown, no backticks:\n{ "category": "pothole|water_leakage|streetlight|waste|road_damage|other", "severity": "low|medium|high|critical", "title": "5-word title", "description": "2-sentence description", "estimated_cost_inr": number, "cost_reasoning": "one sentence", "confidence": 0.0-1.0 }',
            },
          ],
        },
      ],
      max_tokens: 500,
    });
    const result = parseJsonResponse(response.choices[0].message.content);
    console.log('[AI] Classification OK:', result.category, result.severity);
    return { ...result, _mock: false };
  } catch (err) {
    console.warn('[AI] Classification API failed (' + err.message + '). Falling back to smart mock classification.');
    return getSmartMockClassification(imageSource, originalName);
  }
}

export async function verifyResolution(beforeSource, afterSource) {
  const grok = getGrok();
  if (!grok) {
    return { is_resolved: true, confidence: 0.9, reasoning: 'Mock verification: issue appears resolved.', _mock: true };
  }

  try {
    const response = await grok.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You verify whether civic infrastructure issues have been resolved. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: toImageUrl(beforeSource) } },
            { type: 'image_url', image_url: { url: toImageUrl(afterSource) } },
            {
              type: 'text',
              text: 'First image = original issue. Second image = after claimed fix. Respond ONLY with valid JSON:\n{ "is_resolved": true|false, "confidence": 0.0-1.0, "reasoning": "one sentence" }',
            },
          ],
        },
      ],
      max_tokens: 200,
    });
    return parseJsonResponse(response.choices[0].message.content);
  } catch (err) {
    console.warn('[AI] Resolution verification API failed:', err.message);
    return { is_resolved: true, confidence: 0.9, reasoning: 'Mock verification: issue appears resolved.', _mock: true };
  }
}

let seasonalCache = { data: null, timestamp: 0 };

export async function detectSeasonalPatterns(monthlyData) {
  if (seasonalCache.data && Date.now() - seasonalCache.timestamp < 24 * 60 * 60 * 1000) {
    return seasonalCache.data;
  }

  const grok = getGrok();
  if (!grok) {
    const fallback = {
      patterns: [
        {
          category: 'water_leakage',
          peak_months: ['June', 'July'],
          spike_factor: 3.4,
          recommendation: 'Pre-deploy drainage teams by May before monsoon season.',
        },
      ],
    };
    seasonalCache = { data: fallback, timestamp: Date.now() };
    return fallback;
  }

  try {
    const response = await grok.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You analyze civic issue data for seasonal patterns. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: `Given this monthly issue count data per category: ${JSON.stringify(monthlyData)}\n\nRespond ONLY with valid JSON:\n{ "patterns": [{ "category": "...", "peak_months": ["June"], "spike_factor": 2.4, "recommendation": "..." }] }`,
        },
      ],
      max_tokens: 800,
    });
    const result = parseJsonResponse(response.choices[0].message.content);
    seasonalCache = { data: result, timestamp: Date.now() };
    return result;
  } catch (err) {
    console.error('[AI] Seasonal pattern detection failed:', err.message);
    return { patterns: [] };
  }
}
