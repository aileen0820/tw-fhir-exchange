import axios from 'axios';
import { config } from '../config.js';

const client = axios.create({
  baseURL: config.fhirBaseUrl,
  headers: {
    'Content-Type': 'application/fhir+json',
    Accept: 'application/fhir+json',
  },
  timeout: 15000,
});

/**
 * 建立(POST)一個 FHIR resource 至 HAPI FHIR server。
 * 回傳統一格式：{ resourceType, id, status(HTTP狀態), resource(完整回傳body) }
 */
export async function createResource(resourceType, body) {
  try {
    const res = await client.post(`/${resourceType}`, body);
    return {
      ok: true,
      resourceType,
      id: res.data.id,
      httpStatus: res.status,
      versionId: res.data.meta?.versionId,
      lastUpdated: res.data.meta?.lastUpdated,
      resource: res.data,
    };
  } catch (err) {
    return normalizeError(resourceType, err);
  }
}

/**
 * 查詢(GET) FHIR resource，帶入 query string 物件。
 */
export async function searchResource(resourceType, params = {}) {
  try {
    const res = await client.get(`/${resourceType}`, { params });
    return {
      ok: true,
      resourceType,
      httpStatus: res.status,
      total: res.data.total,
      entries: (res.data.entry || []).map((e) => e.resource),
      bundle: res.data,
    };
  } catch (err) {
    return normalizeError(resourceType, err);
  }
}

/**
 * 依 id 讀取單一 resource。
 */
export async function readResource(resourceType, id) {
  try {
    const res = await client.get(`/${resourceType}/${id}`);
    return {
      ok: true,
      resourceType,
      id: res.data.id,
      httpStatus: res.status,
      resource: res.data,
    };
  } catch (err) {
    return normalizeError(resourceType, err);
  }
}

function normalizeError(resourceType, err) {
  const httpStatus = err.response?.status || 500;
  const operationOutcome = err.response?.data;
  const message =
    operationOutcome?.issue?.[0]?.diagnostics ||
    operationOutcome?.issue?.[0]?.details?.text ||
    err.message ||
    'Unknown FHIR server error';
  return {
    ok: false,
    resourceType,
    httpStatus,
    error: message,
    operationOutcome,
  };
}
