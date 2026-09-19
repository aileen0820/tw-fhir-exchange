import { Router } from 'express';
import { searchResource, readResource } from '../services/fhirClient.js';
import { generateCareSuggestion } from '../services/aiAgent.js';
import { getLatestDiagnoses } from '../services/diagnosisLookup.js';

const router = Router();

// 依 patientId 抓取入院診斷+最新檢驗+血壓資料，交給 AI 結合分析後產生照護建議
router.post('/care-suggestion', async (req, res) => {
  const { patientId } = req.body;
  if (!patientId) {
    return res.status(400).json({ ok: false, error: '需提供 patientId' });
  }

  const patientResult = await readResource('Patient', patientId);
  if (!patientResult.ok) {
    return res.status(patientResult.httpStatus).json(patientResult);
  }

  const [labResult, bpResult, diagnoses] = await Promise.all([
    searchResource('Observation', { patient: patientId, category: 'laboratory', _sort: '-date', _count: 20 }),
    searchResource('Observation', { patient: patientId, code: 'http://loinc.org|85354-9', _sort: '-date', _count: 10 }),
    getLatestDiagnoses(patientId),
  ]);

  const observations = [
    ...(labResult.ok ? labResult.entries : []),
    ...(bpResult.ok ? bpResult.entries : []),
  ];

  const patient = patientResult.resource;
  const patientSummary = `姓名: ${patient.name?.[0]?.text || '未知'}，性別: ${patient.gender || '未知'}，病歷ID: ${patient.id}`;

  const aiResult = await generateCareSuggestion({ patientSummary, observations, diagnoses });
  res.status(aiResult.ok ? 200 : 502).json(aiResult);
});

export default router;
