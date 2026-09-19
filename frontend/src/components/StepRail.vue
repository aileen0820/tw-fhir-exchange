<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useSessionStore } from '../store/session.js';

const route = useRoute();
const session = useSessionStore();

const steps = computed(() => [
  {
    path: '/organization',
    label: '機構',
    resourceType: 'Organization',
    id: session.organization?.id,
  },
  {
    path: '/patient',
    label: '病患',
    resourceType: 'Patient',
    id: session.patient?.id,
  },
  {
    path: '/practitioner',
    label: '醫事人員',
    resourceType: 'Practitioner',
    id: session.practitioner?.id,
  },
  {
    path: '/encounter',
    label: '就醫紀錄',
    resourceType: 'Encounter',
    id: session.encounter?.id,
  },
  {
    path: '/lab-keyin',
    label: '檢驗 Key-in',
    resourceType: 'Observation',
    id: null,
    role: '檢驗單位',
  },
  {
    path: '/nurse',
    label: '護理站查詢 + AI',
    resourceType: '—',
    id: null,
    role: '護理人員',
  },
]);
</script>

<template>
  <nav class="rail">
    <div v-for="(step, i) in steps" :key="step.path" class="rail-item">
      <div class="rail-track">
        <div class="dot" :class="{ done: step.id, active: route.path === step.path }" />
        <div v-if="i < steps.length - 1" class="line" :class="{ done: step.id }" />
      </div>
      <router-link :to="step.path" class="rail-label" :class="{ active: route.path === step.path }">
        <div class="label-top">
          <span>{{ step.label }}</span>
          <span v-if="step.role" class="role-tag">{{ step.role }}</span>
        </div>
        <div class="label-id mono" v-if="step.id">{{ step.resourceType }}/{{ step.id }}</div>
        <div class="label-id mono muted" v-else>未建立</div>
      </router-link>
    </div>
  </nav>
</template>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
}

.rail-item {
  display: flex;
  gap: 12px;
}

.rail-track {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
  margin-top: 4px;
}
.dot.done {
  background: var(--teal-500);
  border-color: var(--teal-500);
}
.dot.active {
  box-shadow: 0 0 0 4px rgba(20, 122, 122, 0.35);
}

.line {
  width: 2px;
  flex: 1;
  min-height: 28px;
  background: rgba(255, 255, 255, 0.15);
}
.line.done {
  background: var(--teal-500);
}

.rail-label {
  padding-bottom: 24px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.75);
  flex: 1;
}
.rail-label.active {
  color: white;
}

.label-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13.5px;
  font-weight: 600;
}

.role-tag {
  font-size: 10px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
  color: rgba(255, 255, 255, 0.6);
}

.label-id {
  font-size: 11px;
  margin-top: 2px;
  color: var(--teal-500);
  filter: brightness(1.4);
}
.label-id.muted {
  color: rgba(255, 255, 255, 0.35);
}
</style>
