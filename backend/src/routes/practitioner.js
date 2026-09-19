import { Router } from 'express';
import { createResource, searchResource } from '../services/fhirClient.js';
import { buildPractitioner } from '../utils/fhirBuilders.js';

const router = Router();

router.post('/', async (req, res) => {
  const { licenseId, name, gender, phone } = req.body;
  if (!licenseId || !name) {
    return res.status(400).json({ ok: false, error: '身分證號/證照號碼、醫師姓名為必填' });
  }
  const resource = buildPractitioner({ licenseId, name, gender, phone });
  const result = await createResource('Practitioner', resource);
  res.status(result.ok ? 201 : result.httpStatus).json(result);
});

router.get('/', async (req, res) => {
  const result = await searchResource('Practitioner', { _count: 50, _sort: '-_lastUpdated' });
  res.status(result.ok ? 200 : result.httpStatus).json(result);
});

export default router;
