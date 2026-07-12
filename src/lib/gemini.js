const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Send a text-only prompt to Gemini 1.5 Flash.
 * @param {string} prompt
 * @returns {Promise<string>} The AI response text
 */
export async function geminiText(prompt) {
  const res = await fetch(`${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Send an image + text prompt to Gemini 1.5 Flash (for OCR).
 * @param {string} base64Image  Base64-encoded image string
 * @param {string} mimeType     e.g. 'image/jpeg'
 * @param {string} prompt
 * @returns {Promise<string>} The AI response text
 */
export async function geminiVision(base64Image, mimeType, prompt) {
  const res = await fetch(`${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType: mimeType, data: base64Image } },
            { text: prompt },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini Vision API error ${res.status}`);
  }
  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}
