import { defineStore } from 'pinia';

export const useSessionStore = defineStore('session', {
  state: () => ({
    organization: null, // { id, name, status }
    patient: null, // { id, name, status }
    practitioner: null, // { id, name, status }
    encounter: null, // { id, status }
  }),
  getters: {
    stepStatus: (state) => (key) => {
      const map = { organization: state.organization, patient: state.patient, practitioner: state.practitioner, encounter: state.encounter };
      return map[key] ? 'done' : 'pending';
    },
    canCreateEncounter: (state) =>
      Boolean(state.organization?.id && state.patient?.id && state.practitioner?.id),
  },
  actions: {
    setOrganization(payload) {
      this.organization = payload;
    },
    setPatient(payload) {
      this.patient = payload;
    },
    setPractitioner(payload) {
      this.practitioner = payload;
    },
    setEncounter(payload) {
      this.encounter = payload;
    },
    reset() {
      this.organization = null;
      this.patient = null;
      this.practitioner = null;
      this.encounter = null;
    },
  },
});
