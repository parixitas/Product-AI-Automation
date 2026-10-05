export const environment = {
  production: true,
  // Base URL without model name — model is appended per-request for fallback
  geminiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
  geminiModels: [
    'gemini-3.5-flash-lite', // 15 RPM / 500 RPD — primary
    'gemini-3.1-flash-lite', // 15 RPM / 500 RPD
    'gemini-2.5-flash-lite', // 10 RPM / 20 RPD
    'gemini-3.5-flash',      // 5 RPM (currently 3/5 used) — keep as fallback
    'gemini-2.5-flash',      // 5 RPM / 20 RPD
    'gemini-3-flash',        // 5 RPM / 20 RPD
    'gemini-3.6-flash',      // 5 RPM / 20 RPD
    'gemini-3.7-flash',      // 5 RPM / 20 RPD
    'gemini-3.8-flash',      // 5 RPM / 20 RPD
    // Zero-quota today, kept as last resort in case quota resets:
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-pro',
    'gemini-3.1-pro',
  ],
  // Legacy single-model URL (kept for backwards compat, prefer geminiBaseUrl + geminiModels)
  apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
  apiKey: 'Gemini_Api_Key', // Replace with your actual API key
  backedApi: 'Backed_Api_Url'
};
