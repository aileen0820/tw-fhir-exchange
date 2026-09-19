import { createRouter, createWebHistory } from 'vue-router';
import OrganizationForm from './views/OrganizationForm.vue';
import PatientForm from './views/PatientForm.vue';
import PractitionerForm from './views/PractitionerForm.vue';
import EncounterForm from './views/EncounterForm.vue';
import LabKeyin from './views/LabKeyin.vue';
import NurseDashboard from './views/NurseDashboard.vue';

const routes = [
  { path: '/', redirect: '/organization' },
  { path: '/organization', component: OrganizationForm, meta: { step: 1, title: '1. 機構建檔' } },
  { path: '/patient', component: PatientForm, meta: { step: 2, title: '2. 病患建檔' } },
  { path: '/practitioner', component: PractitionerForm, meta: { step: 3, title: '3. 醫事人員建檔' } },
  { path: '/encounter', component: EncounterForm, meta: { step: 4, title: '4. 建立就醫紀錄' } },
  { path: '/lab-keyin', component: LabKeyin, meta: { step: 5, title: '5. 檢驗單位 - 數據 Key-in' } },
  { path: '/nurse', component: NurseDashboard, meta: { step: 6, title: '6. 護理站 - 查詢與 AI 建議' } },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
