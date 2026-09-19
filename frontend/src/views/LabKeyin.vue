<script setup>
import { reactive, ref } from 'vue';
import api from '../api/client.js';
import { useSessionStore } from '../store/session.js';
import ResourceResult from '../components/ResourceResult.vue';

const session = useSessionStore();
const tab = ref('lab');

const commonLoinc = [
  { code: '2339-0', display: 'Glucose [Mass/volume] in Blood', unit: 'mg/dL' },
  { code: '2160-0', display: 'Creatinine [Mass/volume] in Serum or Plasma', unit: 'mg/dL' },
  { code: '718-7', display: 'Hemoglobin [Mass/volume] in Blood', unit: 'g/dL' },
  { code: '2823-3', display: 'Potassium [Moles/volume] in Serum or Plasma', unit: 'mmol/L' },
  { code: '6690-2', display: 'Leukocytes [#/volume] in Blood', unit: '10*3/uL' },
];

const patientId = ref(session.patient?.id || '');
const encounterId = ref(session.encounter?.id || '');

// --- Lab form ---
const labForm = reactive({
  loincCode: '2339-0',
  loincDisplay: 'Glucose [Mass/volume] in Blood',
  value: '',
  unit: 'mg/dL',
});
const labLoading = ref(false);
const labResult = ref(null);

function applyPreset() {
  const preset = commonLoinc.find((p) => p.code === labForm.loincCode);
  if (preset) {
    labForm.loincDisplay = preset.display;
    labForm.unit = preset.unit;
  }
}

async function submitLab() {
  labLoading.value = true;
  labResult.value = null;
  try {
    const { data } = await api.post('/observation/lab', {
      patientId: patientId.value,
      encounterId: encounterId.value || undefined,
      loincCode: labForm.loincCode,
      loincDisplay: labForm.loincDisplay,
      value: labForm.value,
      unit: labForm.unit,
    });
    labResult.value = data;
  } catch (e) {
    labResult.value = e.response?.data || { ok: false, error: e.message, httpStatus: 0, resourceType: 'Observation' };
  } finally {
    labLoading.value = false;
  }
}

// --- Blood pressure form ---
const bpForm = reactive({ systolic: '', diastolic: '' });
const bpLoading = ref(false);
const bpResult = ref(null);

async function submitBp() {
  bpLoading.value = true;
  bpResult.value = null;
  try {
    const { data } = await api.post('/observation/blood-pressure', {
      patientId: patientId.value,
      encounterId: encounterId.value || undefined,
      systolic: bpForm.systolic,
      diastolic: bpForm.diastolic,
    });
    bpResult.value = data;
  } catch (e) {
    bpResult.value = e.response?.data || { ok: false, error: e.message, httpStatus: 0, resourceType: 'Observation' };
  } finally {
    bpLoading.value = false;
  }
}
</script>

<template>
  <div>
    <h2>5. 檢驗單位 — 數據 Key-in</h2>
    <p class="hint">檢驗單位人員於此輸入抽血檢驗結果，資料以 Observation resource 上傳至 FHIR server。</p>

    <div class="card" style="margin-bottom: 20px;">
      <div class="field">
        <label>病患 ID (Patient.id)</label>
        <input v-model="patientId" placeholder="從步驟 2 帶入，或手動輸入" />
        <span class="hint" v-if="session.patient">目前 session 病患：{{ session.patient.name }} ({{ session.patient.id }})</span>
      </div>
      <div class="field">
        <label>就醫紀錄 ID (Encounter.id，選填但建議填寫)</label>
        <input v-model="encounterId" placeholder="從步驟 4 帶入，或留空" />
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn" :class="{ active: tab === 'lab' }" @click="tab = 'lab'">檢驗結果 (Laboratory)</button>
      <button class="tab-btn" :class="{ active: tab === 'bp' }" @click="tab = 'bp'">血壓 (Vital Signs)</button>
    </div>

    <div v-if="tab === 'lab'" class="card">
      <h3>Observation-laboratoryResult-twcore</h3>
      <form @submit.prevent="submitLab">
        <div class="field">
          <label>常用檢驗項目（LOINC 快選）</label>
          <select v-model="labForm.loincCode" @change="applyPreset">
            <option v-for="p in commonLoinc" :key="p.code" :value="p.code">{{ p.code }} — {{ p.display }}</option>
            <option value="">自訂 LOINC 代碼</option>
          </select>
        </div>
        <div class="field">
          <label>LOINC 代碼</label>
          <input v-model="labForm.loincCode" required />
        </div>
        <div class="field">
          <label>項目名稱 (display)</label>
          <input v-model="labForm.loincDisplay" />
        </div>
        <div class="field">
          <label>量測數值</label>
          <input v-model="labForm.value" type="number" step="any" required />
        </div>
        <div class="field">
          <label>量測單位 (UCUM)</label>
          <input v-model="labForm.unit" required />
        </div>
        <button class="btn btn-primary" type="submit" :disabled="labLoading || !patientId">
          {{ labLoading ? '上傳中...' : '建立 Observation（檢驗結果）' }}
        </button>
      </form>
      <ResourceResult :result="labResult" />
    </div>

    <div v-else class="card">
      <h3>Observation-bloodPressure-twcore</h3>
      <form @submit.prevent="submitBp">
        <div class="field">
          <label>收縮壓 (mmHg)</label>
          <input v-model="bpForm.systolic" type="number" required />
        </div>
        <div class="field">
          <label>舒張壓 (mmHg)</label>
          <input v-model="bpForm.diastolic" type="number" required />
        </div>
        <button class="btn btn-primary" type="submit" :disabled="bpLoading || !patientId">
          {{ bpLoading ? '上傳中...' : '建立 Observation（血壓）' }}
        </button>
      </form>
      <ResourceResult :result="bpResult" />
    </div>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.tab-btn {
  border: 1px solid var(--line-200);
  background: white;
  padding: 8px 16px;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-700);
}
.tab-btn.active {
  background: var(--teal-600);
  color: white;
  border-color: var(--teal-600);
}
</style>
