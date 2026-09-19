<script setup>
import { ref } from 'vue';
import api from '../api/client.js';
import { useSessionStore } from '../store/session.js';

const session = useSessionStore();
const patientId = ref(session.patient?.id || '');

const loading = ref(false);
const searchError = ref('');
const labEntries = ref([]);
const bpEntries = ref([]);
const diagnosisEntries = ref([]);
const searched = ref(false);

async function search() {
  if (!patientId.value) return;
  loading.value = true;
  searchError.value = '';
  searched.value = true;
  try {
    const [labRes, bpRes, diagRes] = await Promise.all([
      api.get('/observation/lab', { params: { patientId: patientId.value } }),
      api.get('/observation/blood-pressure', { params: { patientId: patientId.value } }),
      api.get('/condition', { params: { patientId: patientId.value } }),
    ]);
    labEntries.value = labRes.data.ok ? labRes.data.entries : [];
    bpEntries.value = bpRes.data.ok ? bpRes.data.entries : [];
    diagnosisEntries.value = diagRes.data.ok ? diagRes.data.results : [];
    if (!labRes.data.ok) searchError.value = labRes.data.error;
  } catch (e) {
    searchError.value = e.response?.data?.error || e.message;
  } finally {
    loading.value = false;
  }
}

const aiLoading = ref(false);
const aiError = ref('');
const aiSuggestion = ref('');

async function getAiSuggestion() {
  aiLoading.value = true;
  aiError.value = '';
  aiSuggestion.value = '';
  try {
    const { data } = await api.post('/ai/care-suggestion', { patientId: patientId.value });
    if (data.ok) {
      aiSuggestion.value = data.suggestion;
    } else {
      aiError.value = data.error;
    }
  } catch (e) {
    aiError.value = e.response?.data?.error || e.message;
  } finally {
    aiLoading.value = false;
  }
}

function fmtValue(obs) {
  if (obs.valueQuantity) return `${obs.valueQuantity.value} ${obs.valueQuantity.unit || ''}`;
  if (obs.component?.length) {
    return obs.component.map((c) => `${c.valueQuantity?.value}${c.valueQuantity?.unit || ''}`).join(' / ');
  }
  return '—';
}

function fmtDiagnosis(condition) {
  const coding = condition.code?.coding?.[0];
  const label = condition.code?.text || coding?.display || coding?.code || '未知診斷';
  return coding?.code ? `${label}（${coding.code}）` : label;
}
</script>

<template>
  <div>
    <h2>6. 護理站 — 查詢檢驗結果 + AI 照護建議</h2>
    <p class="hint">護理人員輸入病患 ID 查詢最新檢驗與生命徵象資料，並可呼叫 AI agent 產生照護建議。</p>

    <div class="card" style="margin-bottom: 20px;">
      <div class="field">
        <label>病患 ID (Patient.id)</label>
        <input v-model="patientId" placeholder="輸入或沿用 session 病患 ID" />
      </div>
      <button class="btn btn-primary" @click="search" :disabled="loading || !patientId">
        {{ loading ? '查詢中...' : '查詢檢驗 / 血壓紀錄' }}
      </button>
      <p v-if="searchError" style="color: var(--red-600); margin-top: 10px;">{{ searchError }}</p>
    </div>

    <div v-if="searched" class="card" style="margin-bottom: 20px;">
      <h3>入院診斷 (Condition)</h3>
      <ul v-if="diagnosisEntries.length" class="diagnosis-list">
        <li v-for="c in diagnosisEntries" :key="c.id">
          {{ fmtDiagnosis(c) }}
          <span class="mono diagnosis-id">Condition/{{ c.id }}</span>
        </li>
      </ul>
      <p v-else class="hint">查無入院診斷紀錄（建檔於步驟 4 建立 Encounter 時填寫）。</p>
    </div>

    <div v-if="searched" class="card" style="margin-bottom: 20px;">
      <h3>檢驗結果 (Laboratory)</h3>
      <table v-if="labEntries.length" class="data-table">
        <thead>
          <tr><th>項目</th><th>數值</th><th>時間</th><th>Resource ID</th></tr>
        </thead>
        <tbody>
          <tr v-for="obs in labEntries" :key="obs.id">
            <td>{{ obs.code?.coding?.[0]?.display || obs.code?.coding?.[0]?.code }}</td>
            <td class="mono">{{ fmtValue(obs) }}</td>
            <td class="mono">{{ obs.effectiveDateTime?.slice(0, 16) || '—' }}</td>
            <td class="mono">{{ obs.id }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">查無檢驗結果。</p>

      <h3 style="margin-top: 24px;">生命徵象 — 血壓</h3>
      <table v-if="bpEntries.length" class="data-table">
        <thead>
          <tr><th>收縮壓/舒張壓</th><th>時間</th><th>Resource ID</th></tr>
        </thead>
        <tbody>
          <tr v-for="obs in bpEntries" :key="obs.id">
            <td class="mono">{{ fmtValue(obs) }}</td>
            <td class="mono">{{ obs.effectiveDateTime?.slice(0, 16) || '—' }}</td>
            <td class="mono">{{ obs.id }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">查無血壓紀錄。</p>
    </div>

    <div v-if="searched" class="card">
      <h3>AI 照護建議 Agent</h3>
      <p class="hint">依據上方入院診斷、檢驗與生命徵象資料，由 Gemini 結合分析後產生照護建議（僅供臨床參考）。</p>
      <button class="btn btn-primary" @click="getAiSuggestion" :disabled="aiLoading">
        {{ aiLoading ? '分析中...' : (aiError ? '重試一次' : '產生照護建議') }}
      </button>
      <p v-if="aiError" style="color: var(--red-600); margin-top: 10px;">{{ aiError }}</p>
      <div v-if="aiSuggestion" class="ai-box">{{ aiSuggestion }}</div>
    </div>
  </div>
</template>

<style scoped>
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th, .data-table td {
  text-align: left;
  padding: 8px 10px;
  border-bottom: 1px solid var(--line-200);
}
.data-table th {
  color: var(--ink-700);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.ai-box {
  margin-top: 16px;
  background: var(--teal-100);
  border: 1px solid var(--teal-500);
  border-radius: 8px;
  padding: 16px;
  white-space: pre-wrap;
  line-height: 1.7;
  font-size: 14px;
}
.diagnosis-list {
  margin: 0;
  padding-left: 20px;
  font-size: 14px;
  line-height: 1.8;
}
.diagnosis-id {
  margin-left: 8px;
  font-size: 11px;
  color: #6b8580;
}
</style>
