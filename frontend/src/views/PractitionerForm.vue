<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api/client.js';
import { useSessionStore } from '../store/session.js';
import ResourceResult from '../components/ResourceResult.vue';

const router = useRouter();
const session = useSessionStore();

const form = reactive({
  licenseId: '',
  name: '',
  gender: 'female',
  phone: '',
});

const loading = ref(false);
const result = ref(null);

async function submit() {
  loading.value = true;
  result.value = null;
  try {
    const { data } = await api.post('/practitioner', form);
    result.value = data;
    if (data.ok) {
      session.setPractitioner({ id: data.id, name: form.name });
    }
  } catch (e) {
    result.value = e.response?.data || { ok: false, error: e.message, httpStatus: 0, resourceType: 'Practitioner' };
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h2>3. 醫事人員建檔 — Practitioner-twcore</h2>
    <p class="hint">此步驟建立負責看診/照護的醫師或護理人員基本資料。</p>

    <div class="card">
      <form @submit.prevent="submit">
        <div class="field">
          <label>身分證號 / 證照號碼</label>
          <input v-model="form.licenseId" placeholder="醫事人員證照號碼" required />
        </div>
        <div class="field">
          <label>姓名</label>
          <input v-model="form.name" placeholder="王大夫" required />
        </div>
        <div class="field">
          <label>性別（選填）</label>
          <select v-model="form.gender">
            <option value="">未指定</option>
            <option value="male">male</option>
            <option value="female">female</option>
          </select>
        </div>
        <div class="field">
          <label>通訊方式（選填）</label>
          <input v-model="form.phone" placeholder="私人聯絡電話" />
        </div>
        <button class="btn btn-primary" type="submit" :disabled="loading">
          {{ loading ? '建立中...' : '建立 Practitioner' }}
        </button>
      </form>

      <ResourceResult :result="result" />

      <div v-if="result?.ok" style="margin-top: 20px;">
        <button class="btn btn-primary" @click="router.push('/encounter')">下一步：建立就醫紀錄 →</button>
      </div>
    </div>
  </div>
</template>
