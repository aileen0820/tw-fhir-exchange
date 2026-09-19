import express from 'express';
import cors from 'cors';
import { config } from './config.js';

import organizationRoutes from './routes/organization.js';
import patientRoutes from './routes/patient.js';
import practitionerRoutes from './routes/practitioner.js';
import encounterRoutes from './routes/encounter.js';
import observationRoutes from './routes/observation.js';
import aiRoutes from './routes/ai.js';
import icd10Routes from './routes/icd10.js';
import conditionRoutes from './routes/condition.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, fhirBaseUrl: config.fhirBaseUrl });
});

app.use('/api/organization', organizationRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/practitioner', practitionerRoutes);
app.use('/api/encounter', encounterRoutes);
app.use('/api/observation', observationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/icd10', icd10Routes);
app.use('/api/condition', conditionRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: '伺服器內部錯誤' });
});

app.listen(config.port, () => {
  console.log(`✅ TW FHIR Exchange backend 啟動於 http://localhost:${config.port}`);
  console.log(`   FHIR Server: ${config.fhirBaseUrl}`);
});
