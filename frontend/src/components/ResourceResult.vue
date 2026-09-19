<script setup>
import { ref } from 'vue';

const props = defineProps({
  result: { type: Object, default: null }, // { ok, resourceType, id, httpStatus, resource, error }
});

const showRaw = ref(false);
</script>

<template>
  <div v-if="result" class="result-panel">
    <div class="result-panel-header">
      <div>
        <strong>{{ result.resourceType }}</strong>
        <span v-if="result.ok" class="mono" style="margin-left: 8px;">id = {{ result.id }}</span>
      </div>
      <span class="badge" :class="result.ok ? 'badge-success' : 'badge-error'">
        HTTP {{ result.httpStatus }} · {{ result.ok ? 'Created' : 'Failed' }}
      </span>
    </div>
    <div class="result-panel-body" :class="{ error: !result.ok }">
      <p v-if="!result.ok" style="color: var(--red-600); margin-bottom: 8px;">
        {{ result.error }}
      </p>
      <button class="btn btn-ghost" style="padding: 4px 10px; font-size: 12px;" @click="showRaw = !showRaw">
        {{ showRaw ? '隱藏' : '顯示' }} 原始 JSON
      </button>
      <pre v-if="showRaw" class="mono raw-json">{{ JSON.stringify(result.resource ?? result.operationOutcome ?? {}, null, 2) }}</pre>
    </div>
  </div>
</template>

<style scoped>
.raw-json {
  margin-top: 12px;
  background: var(--ink-900);
  color: #b7ded8;
  padding: 14px;
  border-radius: 6px;
  font-size: 12px;
  overflow-x: auto;
  max-height: 320px;
}
</style>
