import axios from 'axios';
import { config } from '../config.js';

const NLM_SEARCH_URL = 'https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search';

/**
 * 依 ICD-10-CM 代碼精確查詢官方英文疾病名稱。
 * 資料來源：NLM Clinical Table Search Service（美國國家醫學圖書館，免金鑰、公開）。
 */
export async function lookupIcd10English(code) {
  const normalized = String(code || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!normalized) return null;

  const res = await axios.get(NLM_SEARCH_URL, {
    params: { sf: 'code,name', terms: normalized, maxList: 10 },
    timeout: 8000,
  });

  // 回傳格式為 [total, codes[], extra, display_strings[][code,name]]
  const [, codes, , display] = res.data;
  if (!Array.isArray(codes) || codes.length === 0) return null;

  // 找出代碼完全相符的項目（忽略小數點差異，例如輸入 E119 對應 E11.9）
  const idx = codes.findIndex(
    (c) => String(c).replace(/[^A-Za-z0-9]/g, '').toUpperCase() === normalized
  );
  const matchIdx = idx >= 0 ? idx : 0;
  const name = display?.[matchIdx]?.[1];
  const officialCode = codes[matchIdx];
  if (!name) return null;

  return { code: officialCode, englishName: name };
}

/**
 * 模糊搜尋 ICD-10-CM 代碼／病名，供自動完成建議清單使用。
 */
export async function searchIcd10(term) {
  const res = await axios.get(NLM_SEARCH_URL, {
    params: { sf: 'code,name', terms: term, maxList: 10 },
    timeout: 8000,
  });
  const [, codes, , display] = res.data;
  if (!Array.isArray(codes)) return [];
  return codes.map((code, i) => ({ code, name: display?.[i]?.[1] || '' }));
}

/**
 * 呼叫 Gemini，將英文疾病名稱翻譯為臺灣醫療常用的繁體中文病名。
 * 僅供參考用途，非官方 ICD-10-CM 中文對照。
 */
export async function translateToChinese(englishName) {
  if (!config.geminiApiKey || !englishName) return null;
  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`,
      {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `請將以下 ICD-10-CM 英文疾病名稱，翻譯成臺灣醫療院所常用的繁體中文病名。只回傳中文病名本身，不要加任何說明、引號或標點符號：\n${englishName}`,
              },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 60, temperature: 0 },
      },
      {
        headers: { 'x-goog-api-key': config.geminiApiKey, 'content-type': 'application/json' },
        timeout: 15000,
      }
    );
    const text = (res.data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || '')
      .join('')
      .trim();
    return text || null;
  } catch {
    return null;
  }
}
