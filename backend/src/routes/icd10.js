import { Router } from 'express';
import { lookupIcd10English, searchIcd10, translateToChinese } from '../services/icd10Client.js';

const router = Router();

// 依代碼精確查詢，回傳英文（官方）與中文（AI 翻譯，僅供參考）疾病名稱
router.get('/lookup', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ ok: false, error: '需提供 code 查詢參數' });
  }
  try {
    const match = await lookupIcd10English(code);
    if (!match) {
      return res.status(404).json({ ok: false, error: `查無 ICD-10-CM 代碼：${code}` });
    }
    const chineseName = await translateToChinese(match.englishName);
    res.json({
      ok: true,
      code: match.code,
      englishName: match.englishName,
      chineseName,
      chineseNote: chineseName
        ? '中文名稱由 AI 翻譯，僅供參考，正式病歷請以官方 ICD-10-CM 英文名稱為準。'
        : null,
    });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.response?.data?.error || err.message });
  }
});

// 模糊搜尋（可用於自動完成建議清單）
router.get('/search', async (req, res) => {
  const { term } = req.query;
  if (!term || term.trim().length < 2) {
    return res.json({ ok: true, results: [] });
  }
  try {
    const results = await searchIcd10(term.trim());
    res.json({ ok: true, results });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.response?.data?.error || err.message });
  }
});

export default router;
