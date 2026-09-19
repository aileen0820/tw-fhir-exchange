<script setup>
import { reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api/client.js';
import { useSessionStore } from '../store/session.js';
import ResourceResult from '../components/ResourceResult.vue';

const router = useRouter();
const session = useSessionStore();

const form = reactive({
  status: 'arrived',
  classCode: 'IMP',
  serviceTypeCode: '',
  periodStart: new Date().toISOString().slice(0, 16),
  periodEnd: '',
  diagnosisCode: '',
  diagnosisDisplay: '',
});

const loading = ref(false);
const result = ref(null);
const conditionResult = ref(null);

// --- ICD-10-CM 代碼自動查詢中英文病名 ---
const icdLoading = ref(false);
const icdLookup = ref(null); // { code, englishName, chineseName, chineseNote }
const icdError = ref('');
let icdDebounceTimer = null;

// 至少符合「1 個英文字母 + 2 個數字」才觸發查詢，避免每敲一個字就打 API
const ICD_TRIGGER_REGEX = /^[A-Za-z]\d{2}/;

watch(
  () => form.diagnosisCode,
  (newCode) => {
    icdLookup.value = null;
    icdError.value = '';
    clearTimeout(icdDebounceTimer);

    const trimmed = (newCode || '').trim();
    if (!ICD_TRIGGER_REGEX.test(trimmed)) {
      icdLoading.value = false;
      return;
    }

    icdDebounceTimer = setTimeout(async () => {
      icdLoading.value = true;
      try {
        const { data } = await api.get('/icd10/lookup', { params: { code: trimmed } });
        if (data.ok) {
          icdLookup.value = data;
        } else {
          icdError.value = data.error;
        }
      } catch (e) {
        icdError.value = e.response?.data?.error || '查詢 ICD-10-CM 失敗';
      } finally {
        icdLoading.value = false;
      }
    }, 600);
  }
);

function applyIcdName(lang) {
  if (!icdLookup.value) return;
  form.diagnosisDisplay = lang === 'en' ? icdLookup.value.englishName : icdLookup.value.chineseName;
}

async function submit() {
  loading.value = true;
  result.value = null;
  conditionResult.value = null;
  try {
    const { data } = await api.post('/encounter', {
      ...form,
      periodStart: form.periodStart ? new Date(form.periodStart).toISOString() : undefined,
      periodEnd: form.periodEnd ? new Date(form.periodEnd).toISOString() : undefined,
      patientId: session.patient?.id,
      practitionerId: session.practitioner?.id,
      organizationId: session.organization?.id,
    });
    const { condition, ...encounterData } = data;
    result.value = encounterData;
    conditionResult.value = condition;
    if (data.ok) {
      session.setEncounter({ id: data.id });
    }
  } catch (e) {
    result.value = e.response?.data || { ok: false, error: e.message, httpStatus: 0, resourceType: 'Encounter' };
    conditionResult.value = e.response?.data?.condition || null;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h2>4. 建立就醫紀錄 — Encounter-twcore</h2>
    <p class="hint">住院情境建議 就醫分類 選擇 IMP（住院）。此步驟會關聯前三步建立的 Patient / Practitioner / Organization。</p>

    <div v-if="!session.canCreateEncounter" class="card" style="border-color: var(--red-600); margin-bottom: 16px;">
      <p style="color: var(--red-600); margin: 0;">
        尚未完成前置步驟，請先建立機構、病患與醫事人員。
      </p>
    </div>

    <div class="card">
      <form @submit.prevent="submit">
        <div class="field">
          <label>就醫狀態 (status)</label>
          <select v-model="form.status">
            <option value="planned">planned（掛號）</option>
            <option value="arrived">arrived（報到）</option>
            <option value="in-progress">in-progress（看診中）</option>
            <option value="finished">finished（完診）</option>
          </select>
        </div>
        <div class="field">
          <label>就醫分類 (class)</label>
          <select v-model="form.classCode">
            <option value="AMB">AMB（門診）</option>
            <option value="EMER">EMER（急診）</option>
            <option value="IMP">IMP（住院）</option>
          </select>
        </div>
        <div class="field">
          <label>看診科別代碼（選填，健保特定科別代碼）</label>
          <input v-model="form.serviceTypeCode" placeholder="例如：01 代表家醫科" />
        </div>
        <div class="field">
          <label>就醫開始時間</label>
          <input v-model="form.periodStart" type="datetime-local" />
        </div>
        <div class="field">
          <label>就醫結束時間（選填）</label>
          <input v-model="form.periodEnd" type="datetime-local" />
        </div>
        <div class="field">
          <label>入院診斷碼（選填，ICD-10-CM）</label>
          <input v-model="form.diagnosisCode" placeholder="例如：E11.9（第二型糖尿病）" />
          <span class="hint">若填寫診斷碼，會先建立一筆 Condition，再由 Encounter.diagnosis 引用（use=AD 入院診斷）。輸入代碼後會自動查詢對應病名。</span>

          <div v-if="icdLoading" class="icd-box icd-loading">查詢 ICD-10-CM 病名中...</div>
          <div v-else-if="icdError" class="icd-box icd-error">{{ icdError }}</div>
          <div v-else-if="icdLookup" class="icd-box icd-result">
            <div class="icd-row">
              <span class="icd-label">EN</span>
              <span class="icd-name">{{ icdLookup.englishName }}</span>
              <button type="button" class="btn btn-ghost icd-fill-btn" @click="applyIcdName('en')">帶入</button>
            </div>
            <div class="icd-row" v-if="icdLookup.chineseName">
              <span class="icd-label">中文</span>
              <span class="icd-name">{{ icdLookup.chineseName }}</span>
              <button type="button" class="btn btn-ghost icd-fill-btn" @click="applyIcdName('zh')">帶入</button>
            </div>
            <p v-if="icdLookup.chineseNote" class="hint" style="margin: 6px 0 0;">{{ icdLookup.chineseNote }}</p>
          </div>
        </div>
        <div class="field" v-if="form.diagnosisCode">
          <label>診斷名稱（選填，可點選上方「帶入」自動填入，或自行輸入）</label>
          <input v-model="form.diagnosisDisplay" placeholder="例如：第二型糖尿病" />
        </div>
        <button class="btn btn-primary" type="submit" :disabled="loading || !session.canCreateEncounter">
          {{ loading ? '建立中...' : '建立 Encounter' }}
        </button>
      </form>

      <ResourceResult v-if="conditionResult" :result="conditionResult" />
      <ResourceResult :result="result" />

      <div v-if="result?.ok" style="margin-top: 20px; display: flex; gap: 12px;">
        <button class="btn btn-primary" @click="router.push('/lab-keyin')">下一步：檢驗數據 Key-in →</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.icd-box {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
}
.icd-loading {
  background: var(--amber-100);
  color: var(--amber-500);
}
.icd-error {
  background: var(--red-100);
  color: var(--red-600);
}
.icd-result {
  background: var(--teal-100);
  border: 1px solid var(--teal-500);
}
.icd-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}
.icd-label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--teal-600);
  min-width: 28px;
}
.icd-name {
  flex: 1;
  color: var(--ink-900);
}
.icd-fill-btn {
  padding: 3px 10px;
  font-size: 12px;
}
</style>
