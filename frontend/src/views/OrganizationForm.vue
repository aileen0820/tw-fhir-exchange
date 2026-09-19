<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api/client.js';
import { useSessionStore } from '../store/session.js';
import ResourceResult from '../components/ResourceResult.vue';

const router = useRouter();
const session = useSessionStore();

const form = reactive({
  orgCode: '',
  orgName: '',
  phone: '',
});

const loading = ref(false);
const result = ref(null);
const validationError = ref('');

const ORG_CODE_REGEX = /^\d{10}$/;

async function submit() {
  validationError.value = '';
  if (!ORG_CODE_REGEX.test(form.orgCode)) {
    validationError.value = '機構代碼格式錯誤：必須為 10 碼數字（例如：0132010014）';
    return;
  }
  loading.value = true;
  result.value = null;
  try {
    const { data } = await api.post('/organization', form);
    result.value = data;
    if (data.ok) {
      session.setOrganization({ id: data.id, name: form.orgName });
    }
  } catch (e) {
    result.value = e.response?.data || { ok: false, error: e.message, httpStatus: 0, resourceType: 'Organization' };
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h2>1. 機構建檔 — Organization-twcore</h2>
    <p class="hint">
      遵守規範：meta.profile 宣告 Organization-twcore；identifier.type 固定為 PRN (Provider number)；
      type 固定為 prov (Healthcare Provider)。
    </p>

    <div class="card">
      <form @submit.prevent="submit">
        <div class="field">
          <label>機構代碼（10 碼數字）</label>
          <input
            v-model="form.orgCode"
            placeholder="例如：0132010014"
            pattern="\d{10}"
            maxlength="10"
            inputmode="numeric"
            title="必須為 10 碼數字"
            required
          />
          <span class="hint">僅接受 10 位數字，不可包含英文字母或符號。</span>
        </div>
        <div class="field">
          <label>機構名稱</label>
          <input v-model="form.orgName" placeholder="例如：XX 綜合醫院" required />
        </div>
        <div class="field">
          <label>機構電話（選填）</label>
          <input v-model="form.phone" placeholder="例如：03-369-9721" />
        </div>
        <button class="btn btn-primary" type="submit" :disabled="loading">
          {{ loading ? '建立中...' : '建立 Organization' }}
        </button>
      </form>

      <p v-if="validationError" style="color: var(--red-600); margin-top: 12px;">{{ validationError }}</p>

      <ResourceResult :result="result" />

      <div v-if="result?.ok" style="margin-top: 20px;">
        <button class="btn btn-primary" @click="router.push('/patient')">下一步：建立病患 →</button>
      </div>
    </div>
  </div>
</template>
