<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api/client.js';
import { useSessionStore } from '../store/session.js';
import ResourceResult from '../components/ResourceResult.vue';

const router = useRouter();
const session = useSessionStore();

const form = reactive({
  nationalId: '',
  name: '',
  gender: 'male',
  address: '',
});

const loading = ref(false);
const result = ref(null);
const validationError = ref('');

const NATIONAL_ID_REGEX = /^[A-Za-z][12]\d{8}$/;

async function submit() {
  validationError.value = '';
  if (!NATIONAL_ID_REGEX.test(form.nationalId)) {
    validationError.value = '身分證字號格式錯誤：第 1 碼須為英文字母，第 2 碼須為 1 或 2，後面 8 碼須為數字（例如：A123456789）';
    return;
  }
  loading.value = true;
  result.value = null;
  try {
    const { data } = await api.post('/patient', {
      ...form,
      organizationId: session.organization?.id,
    });
    result.value = data;
    if (data.ok) {
      session.setPatient({ id: data.id, name: form.name });
    }
  } catch (e) {
    result.value = e.response?.data || { ok: false, error: e.message, httpStatus: 0, resourceType: 'Patient' };
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h2>2. 病患建檔 — Patient-twcore</h2>
    <p class="hint">
      建檔機構 (managingOrganization) 將自動關聯到已建立的
      <span class="mono" v-if="session.organization">Organization/{{ session.organization.id }}</span>
      <span v-else style="color: var(--red-600);">（尚未建立機構，請先完成步驟 1）</span>
    </p>

    <div class="card">
      <form @submit.prevent="submit">
        <div class="field">
          <label>身分證字號</label>
          <input
            v-model="form.nationalId"
            placeholder="A123456789"
            pattern="[A-Za-z][12]\d{8}"
            maxlength="10"
            title="第 1 碼英文字母，第 2 碼為 1 或 2，後面 8 碼數字"
            required
          />
          <span class="hint">第 1 碼須為英文字母，第 2 碼須為 1 或 2，後面 8 碼須為數字，共 10 碼。</span>
        </div>
        <div class="field">
          <label>姓名</label>
          <input v-model="form.name" placeholder="王小明" required />
        </div>
        <div class="field">
          <label>性別</label>
          <select v-model="form.gender">
            <option value="male">male</option>
            <option value="female">female</option>
            <option value="other">other</option>
            <option value="unknown">unknown</option>
          </select>
        </div>
        <div class="field">
          <label>地址（選填）</label>
          <input
            v-model="form.address"
            placeholder="例如：臺北市大同區大有里19鄰承德路三段52巷6弄210號"
          />
          <span class="hint">
            請依台灣地址書寫慣例輸入完整地址，後端會自動拆解成縣市／鄉鎮市區／村里／鄰／路街／段／巷／弄／號／樓／室，
            並比照 TW Core 官方範例組成 FHIR Address 結構。
          </span>
        </div>
        <button class="btn btn-primary" type="submit" :disabled="loading || !session.organization">
          {{ loading ? '建立中...' : '建立 Patient' }}
        </button>
      </form>

      <p v-if="validationError" style="color: var(--red-600); margin-top: 12px;">{{ validationError }}</p>

      <ResourceResult :result="result" />

      <div v-if="result?.ok" style="margin-top: 20px;">
        <button class="btn btn-primary" @click="router.push('/practitioner')">下一步：建立醫事人員 →</button>
      </div>
    </div>
  </div>
</template>
