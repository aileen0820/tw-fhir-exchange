import { Router } from 'express';
import { getLatestDiagnoses } from '../services/diagnosisLookup.js';

const router = Router();

// 查詢某病患最近一筆 Encounter 的入院診斷（Condition）
router.get('/', async (req, res) => {
  const { patientId } = req.query;
  if (!patientId) {
    return res.status(400).json({ ok: false, error: '需提供 patientId 查詢參數' });
  }
  try {
    const results = await getLatestDiagnoses(patientId);
    res.json({ ok: true, results });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

export default router;
