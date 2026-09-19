import { Router } from 'express';
import { createResource, searchResource } from '../services/fhirClient.js';
import {
  buildBloodPressureObservation,
  buildLabObservation,
} from '../utils/fhirBuilders.js';

const router = Router();

// 建立血壓 Observation
router.post('/blood-pressure', async (req, res) => {
  const { patientId, encounterId, systolic, diastolic, effectiveDateTime } = req.body;
  if (!patientId || systolic == null || diastolic == null) {
    return res.status(400).json({ ok: false, error: '病患ID、收縮壓、舒張壓為必填' });
  }
  const resource = buildBloodPressureObservation({
    patientId,
    encounterId,
    systolic,
    diastolic,
    effectiveDateTime,
  });
  const result = await createResource('Observation', resource);
  res.status(result.ok ? 201 : result.httpStatus).json(result);
});

// 建立檢驗結果 Observation (由檢驗單位 keyin)
router.post('/lab', async (req, res) => {
  const { patientId, encounterId, loincCode, loincDisplay, value, unit, effectiveDateTime } =
    req.body;
  if (!patientId || !loincCode || value == null || !unit) {
    return res
      .status(400)
      .json({ ok: false, error: '病患ID、檢驗項目代碼(LOINC)、量測數值、量測單位為必填' });
  }
  const resource = buildLabObservation({
    patientId,
    encounterId,
    loincCode,
    loincDisplay,
    value,
    unit,
    effectiveDateTime,
  });
  const result = await createResource('Observation', resource);
  res.status(result.ok ? 201 : result.httpStatus).json(result);
});

// 查詢某病患的所有檢驗結果 (護理人員使用)
router.get('/lab', async (req, res) => {
  const { patientId } = req.query;
  if (!patientId) {
    return res.status(400).json({ ok: false, error: '需提供 patientId 查詢參數' });
  }
  const result = await searchResource('Observation', {
    patient: patientId,
    category: 'laboratory',
    _sort: '-date',
    _count: 100,
  });
  res.status(result.ok ? 200 : result.httpStatus).json(result);
});

// 查詢某病患的所有血壓紀錄
router.get('/blood-pressure', async (req, res) => {
  const { patientId } = req.query;
  if (!patientId) {
    return res.status(400).json({ ok: false, error: '需提供 patientId 查詢參數' });
  }
  const result = await searchResource('Observation', {
    patient: patientId,
    code: 'http://loinc.org|85354-9',
    _sort: '-date',
    _count: 50,
  });
  res.status(result.ok ? 200 : result.httpStatus).json(result);
});

export default router;
