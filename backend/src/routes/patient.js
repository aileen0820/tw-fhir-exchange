import { Router } from 'express';
import { createResource, searchResource } from '../services/fhirClient.js';
import { buildPatient } from '../utils/fhirBuilders.js';
import { validateNationalId } from '../utils/validators.js';

const router = Router();

router.post('/', async (req, res) => {
  const { nationalId, name, gender, organizationId, address } = req.body;
  if (!nationalId || !name || !gender) {
    return res.status(400).json({ ok: false, error: '身分證字號、姓名、性別為必填' });
  }
  const nationalIdError = validateNationalId(nationalId);
  if (nationalIdError) {
    return res.status(400).json({ ok: false, error: nationalIdError });
  }
  const resource = buildPatient({ nationalId, name, gender, organizationId, address });
  const result = await createResource('Patient', resource);
  res.status(result.ok ? 201 : result.httpStatus).json(result);
});

router.get('/', async (req, res) => {
  const result = await searchResource('Patient', { _count: 50, _sort: '-_lastUpdated' });
  res.status(result.ok ? 200 : result.httpStatus).json(result);
});

export default router;
