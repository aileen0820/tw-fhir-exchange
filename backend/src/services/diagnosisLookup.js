import { searchResource, readResource } from './fhirClient.js';

/**
 * 依病患 ID，找出最近一筆「有填入院診斷」的 Encounter，
 * 並讀回其 diagnosis[].condition 所引用的 Condition resource 內容。
 *
 * 回傳陣列（可能為空陣列，代表查無診斷資料）。
 */
export async function getLatestDiagnoses(patientId) {
  const encounterResult = await searchResource('Encounter', {
    patient: patientId,
    _sort: '-_lastUpdated',
    _count: 5,
  });
  if (!encounterResult.ok) return [];

  const latestWithDiagnosis = encounterResult.entries.find((e) => e.diagnosis?.length);
  if (!latestWithDiagnosis) return [];

  const refs = latestWithDiagnosis.diagnosis
    .map((d) => d.condition?.reference)
    .filter(Boolean);

  const results = await Promise.all(
    refs.map((ref) => {
      const [, conditionId] = ref.split('/');
      return readResource('Condition', conditionId);
    })
  );

  return results.filter((r) => r.ok).map((r) => r.resource);
}
