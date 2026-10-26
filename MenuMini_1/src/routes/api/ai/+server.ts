import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { smartMatchMiniTemplate, enhanceDishWithAI } from '$lib/server/gemini';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, payload } = body;

    if (action === 'smart-match-template') {
      const { concept } = payload;
      if (!concept) throw error(400, 'Restaurant concept is required');
      const result = await smartMatchMiniTemplate(concept);
      return json({ success: true, result });
    }

    if (action === 'enhance-dish') {
      const { name, category, currentDesc } = payload;
      if (!name) throw error(400, 'Dish name is required');
      const result = await enhanceDishWithAI(name, category || 'Dishes', currentDesc);
      return json({ success: true, result });
    }

    throw error(400, `Unknown action: ${action}`);
  } catch (err: any) {
    console.error('MenuMini AI API Error:', err);
    return json({ success: false, error: err.message || 'AI request failed' }, { status: 500 });
  }
};
