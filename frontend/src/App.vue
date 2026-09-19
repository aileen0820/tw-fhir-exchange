<script setup>
import { useRoute } from 'vue-router';
import StepRail from './components/StepRail.vue';

const route = useRoute();
</script>

<template>
  <div class="shell">
    <aside class="rail-wrap">
      <div class="brand">
        <span class="brand-mark">FHIR</span>
        <div>
          <div class="brand-title">TW Core 交換測試系統</div>
          <div class="brand-sub">住院照護情境 · hapi.fhir.org</div>
        </div>
      </div>
      <StepRail />
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 100vh;
}

.rail-wrap {
  background: var(--ink-900);
  color: white;
  padding: 28px 20px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.brand-mark {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 13px;
  background: var(--teal-500);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  letter-spacing: 0.05em;
}

.brand-title {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
}

.brand-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  font-family: var(--font-mono);
}

.content {
  padding: 40px 48px;
  max-width: 920px;
}

@media (max-width: 900px) {
  .shell {
    grid-template-columns: 1fr;
  }
  .rail-wrap {
    position: relative;
    height: auto;
  }
}
</style>
