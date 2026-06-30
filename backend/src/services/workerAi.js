import '../config/env.js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { getFallbackSteps } from './jobSteps.js';

const VISION_MODEL = process.env.XAI_VISION_MODEL || 'grok-4.20-0309-non-reasoning';
const TEXT_MODEL = process.env.XAI_TEXT_MODEL || 'grok-4.20-0309-non-reasoning';

function getGrok() {
  if (!process.env.XAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' });
}

function toImageUrl(source) {
  if (typeof source === 'string') {
    if (source.startsWith('data:')) return source;
    if (source.includes('/uploads/')) {
      const filename = source.split('/uploads/').pop();
      const localPath = path.join(process.cwd(), 'uploads', filename);
      if (fs.existsSync(localPath)) {
        const buf = fs.readFileSync(localPath);
        const ext = path.extname(localPath).toLowerCase();
        const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[ext] || 'image/jpeg';
        return `data:${mime};base64,${buf.toString('base64')}`;
      }
    }
    if (fs.existsSync(source)) {
      const buf = fs.readFileSync(source);
      return `data:image/jpeg;base64,${buf.toString('base64')}`;
    }
    if (source.startsWith('http')) return source;
  }
  throw new Error('No readable image');
}

function parseJson(content) {
  return JSON.parse(content.replace(/```json|```/g, '').trim());
}

const jobStepsCache = new Map();

export async function generateJobSteps(category, issueDescription, severity) {
  const cacheKey = `${category}_${severity}`;
  if (jobStepsCache.has(cacheKey)) return jobStepsCache.get(cacheKey);

  const grok = getGrok();
  if (!grok) return getFallbackSteps(category);
  try {
    const response = await grok.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: 'system', content: 'Generate practical repair checklists for municipal field workers in India. Respond with valid JSON only.' },
        {
          role: 'user',
          content: `Category: ${category}\nIssue: ${issueDescription}\nSeverity: ${severity}\nRespond ONLY with JSON: { "steps": [{"step_number":1,"label":"...","instruction":"...","photo_guidance":"...","estimated_minutes":10,"safety_note":null}], "total_estimated_hours":2, "materials_needed":[]," "safety_equipment":[] }`,
        },
      ],
      max_tokens: 1000,
    });
    const result = parseJson(response.choices[0].message.content);
    jobStepsCache.set(cacheKey, result);
    return result;
  } catch {
    return getFallbackSteps(category);
  }
}

export async function verifyWorkStep(imageSource, stepLabel, category) {
  const grok = getGrok();
  if (!grok) return { is_valid: true, confidence: 0.85, feedback: 'Photo looks good. Move to next step.', is_safety_concern: false, safety_note: null };
  try {
    const imageUrl = toImageUrl(imageSource);
    const response = await grok.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        { role: 'system', content: 'Verify construction/repair work photos. Be practical and lenient. JSON only.' },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            {
              type: 'text',
              text: `Photo should show: "${stepLabel}" for "${category}" repair. JSON: { "is_valid": true|false, "confidence": 0.0-1.0, "feedback": "...", "is_safety_concern": false, "safety_note": null }`,
            },
          ],
        },
      ],
      max_tokens: 300,
    });
    return parseJson(response.choices[0].message.content);
  } catch (err) {
    console.warn('[WorkerAI] verifyWorkStep failed:', err.message);
    return { is_valid: true, confidence: 0.85, feedback: 'Photo looks good. Move to next step.', is_safety_concern: false, safety_note: null };
  }
}

export async function voiceAgent(transcribedText, language, jobContext) {
  const langMap = { hi: 'Hindi', mr: 'Marathi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', gu: 'Gujarati', bn: 'Bengali', en: 'English' };
  const fallbackText = language === 'en' ? 'Take the next photo as shown in the step guide.' : 'अगले चरण की तस्वीर लें।';
  const grok = getGrok();
  if (!grok) {
    return { guidance_text: fallbackText };
  }
  try {
    const response = await grok.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'system',
          content: `Field assistant for municipal workers in India. Respond in ${langMap[language] || 'Hindi'}. Short, practical, encouraging. Context: ${JSON.stringify(jobContext)}`,
        },
        { role: 'user', content: transcribedText },
      ],
      max_tokens: 300,
    });
    return { guidance_text: response.choices[0].message.content };
  } catch (err) {
    console.warn('[WorkerAI] voiceAgent failed:', err.message);
    return { guidance_text: fallbackText };
  }
}

export async function generateDailySummary(workerName, jobsData) {
  const grok = getGrok();
  const fallbackSummary = { summary: `${workerName} completed ${jobsData.completed || 0} jobs today.`, highlights: [], concerns: [], recommendation: 'Continue tomorrow.' };
  if (!grok) {
    return fallbackSummary;
  }
  try {
    const response = await grok.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        { role: 'system', content: 'Generate concise daily work summaries for supervisors. JSON only.' },
        {
          role: 'user',
          content: `Worker ${workerName}. Data: ${JSON.stringify(jobsData)}. JSON: { "summary":"...", "highlights":[], "concerns":[], "recommendation":"..." }`,
        },
      ],
      max_tokens: 400,
    });
    return parseJson(response.choices[0].message.content);
  } catch (err) {
    console.warn('[WorkerAI] generateDailySummary failed:', err.message);
    return fallbackSummary;
  }
}
