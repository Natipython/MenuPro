import { env } from '$env/dynamic/private';

const GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = env.GEMINI_AI_MODEL || process.env.GEMINI_AI_MODEL || 'gemini-3.8-flash';

export interface SmartMatchResult {
  recommendedTemplateId: string;
  templateName: string;
  primaryColor: string;
  accentColor: string;
  fontPreset: 'modern' | 'serif' | 'clean';
  reasoning: string;
}

export interface DishEnhanceResult {
  name: string;
  englishDescription: string;
  amharicDescription: string;
  tags: string[];
}

export async function callGemini(prompt: string, systemInstruction?: string, retries = 2): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const body: any = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 800
    }
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        if ((response.status === 503 || response.status === 429) && attempt < retries) {
          await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
          continue;
        }
        throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('No response text received from Gemini');
      }

      return text;
    } catch (err: any) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
    }
  }

  throw new Error('Gemini API call failed after retries');
}

export async function smartMatchMiniTemplate(restaurantConcept: string): Promise<SmartMatchResult> {
  const systemPrompt = `You are an expert restaurant design consultant for Ethiopian and international dining venues. 
Analyze the restaurant concept and choose the SINGLE best pre-made template from this catalog:
1. 'mini-minimal-slate' (Minimal Clean: modern bakeries, third-wave coffee, clean cafes)
2. 'mini-warm-habesha' (Habesha Terracotta: traditional Ethiopian cuisine, cultural dining, injera, tibs)
3. 'mini-bole-bistro' (Bole Nightfall: evening lounges, upscale bistros, cocktail bars)
4. 'mini-fresh-organic' (Fresh Avocado Green: juice bars, smoothie shops, salads, healthy eats)
5. 'mini-street-burger' (Fast Street Flare: burger joints, shawarma, street takeaway, quick food)
6. 'mini-artisan-roastery' (Artisan Espresso: specialty roasteries, dark roast cafes)

Respond ONLY with valid JSON with keys:
- recommendedTemplateId (one of the 6 IDs above)
- templateName (the template name)
- primaryColor (hex code matching their brand)
- accentColor (hex code complementary)
- fontPreset ('modern' or 'serif' or 'clean')
- reasoning (1 sentence explanation in English)`;

  const prompt = `Restaurant description: "${restaurantConcept}". Recommend the optimal MenuMini template and color tuning.`;
  const raw = await callGemini(prompt, systemPrompt);
  const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

export async function enhanceDishWithAI(dishName: string, category: string, currentDescription?: string): Promise<DishEnhanceResult> {
  const systemPrompt = `You are an Ethiopian culinary copywriter.
For the given dish name and category, provide:
1. An appetizing 1-2 sentence English description.
2. A natural, respectful Amharic translation in Fidel script (e.g. ለየት ያለ ጣዕም ያለው ...).
3. 2 to 3 dietary/allergen tags from: ['Spicy 🌶️', 'Vegetarian 🥬', 'Vegan 🌱', 'Halal ☪️', 'Gluten-Free 🌾', 'Chef Special ⭐', 'Fasting Food 🇪🇹'].

Respond ONLY with valid JSON with keys:
- name
- englishDescription
- amharicDescription
- tags (array of strings)`;

  const prompt = `Dish Name: "${dishName}", Category: "${category}", Current Note: "${currentDescription || ''}".`;
  const raw = await callGemini(prompt, systemPrompt);
  const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}
