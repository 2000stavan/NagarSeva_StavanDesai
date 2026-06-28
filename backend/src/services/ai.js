import '../config/env.js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const VISION_MODEL = process.env.XAI_VISION_MODEL || 'grok-4.3';
const TEXT_MODEL = process.env.XAI_TEXT_MODEL || 'grok-4.20-0309-reasoning';

function getGrok() {
  if (!process.env.XAI_API_KEY) return null;
  return new OpenAI({
    apiKey: process.env.XAI_API_KEY,
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

export async function classifyImage(imageSource) {
  const grok = getGrok();
  if (!grok) {
    console.log('[AI] Using mock classification (no XAI_API_KEY)');
    return { ...MOCK_CLASSIFICATION };
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
    console.error('[AI] Classification failed:', err.message);
    throw new Error(`AI classification failed: ${err.message}`);
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
    console.error('[AI] Resolution verification failed:', err.message);
    throw new Error(`AI verification failed: ${err.message}`);
  }
}

export async function detectSeasonalPatterns(monthlyData) {
  const grok = getGrok();
  if (!grok) {
    return {
      patterns: [
        {
          category: 'water_leakage',
          peak_months: ['June', 'July'],
          spike_factor: 3.4,
          recommendation: 'Pre-deploy drainage teams by May before monsoon season.',
        },
      ],
    };
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
    return parseJsonResponse(response.choices[0].message.content);
  } catch (err) {
    console.error('[AI] Seasonal pattern detection failed:', err.message);
    return { patterns: [] };
  }
}
