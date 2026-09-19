import { Router } from 'express';
import { createResource, searchResource } from '../services/fhirClient.js';
import { buildEncounter, buildCondition } from '../utils/fhirBuilders.js';

const router = Router();

router.post('/', async (req, res) => {
  const {
    status,
    classCode,
    serviceTypeCode,
    patientId,
    practitionerId,
    organizationId,
    periodStart,
    periodEnd,
    diagnosisCode,
    diagnosisDisplay,
  } = req.body;

  if (!status || !classCode || !patientId || !practitionerId || !organizationId) {
    return res.status(400).json({
      ok: false,
      error: '就醫狀態、就醫分類、病患ID、醫師ID、機構ID為必填',
    });
  }

  // 若有填入院診斷碼，先建立 Condition，再讓 Encounter.diagnosis 引用它
  let conditionResult = null;
  if (diagnosisCode) {
    const conditionResource = buildCondition({
      patientId,
      code: diagnosisCode,
      display: diagnosisDisplay,
    });
    conditionResult = await createResource('Condition', conditionResource);
    if (!conditionResult.ok) {
      return res.status(conditionResult.httpStatus).json({
        ok: false,
        error: `入院診斷（Condition）建立失敗：${conditionResult.error}`,
        condition: conditionResult,
      });
    }
  }

  const resource = buildEncounter({
    status,
    classCode,
    serviceTypeCode,
    patientId,
    practitionerId,
    organizationId,
    periodStart,
    periodEnd,
    conditionId: conditionResult?.id,
  });
  const encounterResult = await createResource('Encounter', resource);

  res.status(encounterResult.ok ? 201 : encounterResult.httpStatus).json({
    ...encounterResult,
    condition: conditionResult,
  });
});

router.get('/', async (req, res) => {
  const { patient } = req.query;
  const params = { _count: 50, _sort: '-_lastUpdated' };
  if (patient) params.patient = patient;
  const result = await searchResource('Encounter', params);
  res.status(result.ok ? 200 : result.httpStatus).json(result);
});

export default router;
