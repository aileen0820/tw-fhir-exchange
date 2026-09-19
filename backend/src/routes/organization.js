import { Router } from 'express';
import { createResource, searchResource } from '../services/fhirClient.js';
import { buildOrganization } from '../utils/fhirBuilders.js';
import { validateOrgCode } from '../utils/validators.js';

const router = Router();

// 建立機構
router.post('/', async (req, res) => {
  const { orgCode, orgName, phone } = req.body;
  if (!orgCode || !orgName) {
    return res.status(400).json({ ok: false, error: '機構代碼與機構名稱為必填' });
  }
  const orgCodeError = validateOrgCode(orgCode);
  if (orgCodeError) {
    return res.status(400).json({ ok: false, error: orgCodeError });
  }
  const resource = buildOrganization({ orgCode, orgName, phone });
  const result = await createResource('Organization', resource);
  res.status(result.ok ? 201 : result.httpStatus).json(result);
});

// 查詢機構列表 (方便前端下拉選單)
router.get('/', async (req, res) => {
  const result = await searchResource('Organization', { _count: 50, _sort: '-_lastUpdated' });
  res.status(result.ok ? 200 : result.httpStatus).json(result);
});

export default router;
