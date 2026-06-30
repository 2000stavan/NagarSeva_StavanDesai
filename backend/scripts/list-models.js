import './src/config/env.js';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

const { data } = await client.models.list();
for (const m of data) {
  if (/vision|image|grok/i.test(m.id)) console.log(m.id);
}
