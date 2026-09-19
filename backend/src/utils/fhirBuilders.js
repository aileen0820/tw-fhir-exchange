/**
 * 依據使用者提供圖片中的 TW Core IG 對應表，組出各 FHIR resource 的 JSON。
 * 每個 builder 只接受「前端輸入欄位」，並自動代入規範要求的 System / 固定值。
 */

import { parseTaiwanAddress } from './addressParser.js';

// ---------- Organization-twcore ----------
export function buildOrganization({ orgCode, orgName, phone }) {
  return {
    resourceType: 'Organization',
    meta: {
      profile: ['https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Organization-twcore'],
    },
    identifier: [
      {
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'PRN',
              display: 'Provider number',
            },
          ],
        },
        system:
          'https://twcore.mohw.gov.tw/ig/twcore/CodeSystem/organization-identifier-tw',
        value: orgCode,
      },
    ],
    active: true,
    name: orgName,
    telecom: phone
      ? [{ system: 'phone', value: phone, use: 'work' }]
      : undefined,
    type: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/organization-type',
            code: 'prov',
            display: 'Healthcare Provider',
          },
        ],
      },
    ],
  };
}

/**
 * 接收使用者輸入的「完整地址字串」（例如：臺北市大同區大有里19鄰承德路三段52巷6弄210號），
 * 呼叫 parseTaiwanAddress() 拆解成 TW Core 需要的各個成分，並組出符合官方範例
 * （pat-example）結構的 FHIR Address：
 * - district = 縣/市、city = 鄉/鎮/市/區（沿用官方範例對 FHIR Address 欄位的對應方式）
 * - 段/巷/弄/樓/室/村里/鄰 皆為 twcore 專屬 extension（tw-section, tw-lane, ...）
 * - 郵遞區號透過 _postalCode 的 extension 帶入 3 碼郵遞區號 CodeSystem
 * - text 一律保留使用者輸入的原始字串，避免解析失敗時遺失資料
 */
function buildPatientAddress(addressText) {
  const raw = String(addressText || '').trim();
  if (!raw) return undefined;

  const parsed = parseTaiwanAddress(raw);
  const { district, city, village, neighborhood, line, section, lane, alley, number, floor, room, postalCode } =
    parsed;

  const extension = [];
  const pushExt = (key, value) => {
    if (value) {
      extension.push({
        url: `https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/tw-${key}`,
        valueString: value,
      });
    }
  };
  pushExt('section', section);
  pushExt('number', number);
  pushExt('village', village);
  pushExt('neighborhood', neighborhood);
  pushExt('lane', lane);
  pushExt('alley', alley);
  pushExt('floor', floor);
  pushExt('room', room);

  return [
    {
      extension: extension.length ? extension : undefined,
      text: raw,
      line: line ? [line] : undefined,
      city: city || undefined,
      district: district || undefined,
      _postalCode: postalCode
        ? {
            extension: [
              {
                url: 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/tw-postal-code',
                valueCodeableConcept: {
                  coding: [
                    {
                      system: 'https://twcore.mohw.gov.tw/ig/twcore/CodeSystem/postal-code3-tw',
                      code: postalCode,
                    },
                  ],
                },
              },
            ],
          }
        : undefined,
      country: 'TW',
    },
  ];
}

// ---------- Patient-twcore ----------
export function buildPatient({ nationalId, name, gender, organizationId, address }) {
  return {
    resourceType: 'Patient',
    meta: {
      profile: ['https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Patient-twcore'],
    },
    identifier: [
      {
        use: 'official',
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'NNxxx',
              _code: {
                extension: [
                  {
                    extension: [
                      { url: 'suffix', valueString: 'TWN' },
                      {
                        url: 'valueSet',
                        valueCanonical: 'http://hl7.org/fhir/ValueSet/iso3166-1-3',
                      },
                    ],
                    url: 'https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/identifier-suffix',
                  },
                ],
              },
            },
          ],
        },
        system: 'http://www.moi.gov.tw',
        value: nationalId,
      },
    ],
    active: true,
    name: [{ use: 'official', text: name }],
    gender,
    address: buildPatientAddress(address),
    managingOrganization: organizationId
      ? { reference: `Organization/${organizationId}` }
      : undefined,
  };
}

// ---------- Practitioner-twcore ----------
export function buildPractitioner({ licenseId, name, gender, phone }) {
  return {
    resourceType: 'Practitioner',
    meta: {
      profile: ['https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Practitioner-twcore'],
    },
    identifier: [
      {
        use: 'official',
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'MD',
            },
          ],
        },
        system: 'https://twcore.mohw.gov.tw/ig/twcore/CodeSystem/practitioner-identifier-tw',
        value: licenseId,
      },
    ],
    active: true,
    name: [{ use: 'official', text: name }],
    gender: gender || undefined,
    telecom: phone
      ? [{ system: 'phone', value: phone, use: 'work' }]
      : undefined,
  };
}

// ---------- Condition（入院診斷） ----------
export function buildCondition({ patientId, code, display }) {
  return {
    resourceType: 'Condition',
    clinicalStatus: {
      coding: [
        { system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' },
      ],
    },
    verificationStatus: {
      coding: [
        { system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' },
      ],
    },
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'encounter-diagnosis',
            display: 'Encounter Diagnosis',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'http://hl7.org/fhir/sid/icd-10-cm',
          code,
          display: display || undefined,
        },
      ],
      text: display || undefined,
    },
    subject: { reference: `Patient/${patientId}` },
    recordedDate: new Date().toISOString(),
  };
}

// ---------- Encounter-twcore ----------
export function buildEncounter({
  status,
  classCode,
  serviceTypeCode,
  patientId,
  practitionerId,
  organizationId,
  periodStart,
  periodEnd,
  conditionId,
}) {
  return {
    resourceType: 'Encounter',
    meta: {
      profile: ['https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Encounter-twcore'],
    },
    status,
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: classCode,
    },
    serviceType: serviceTypeCode
      ? {
          coding: [
            {
              system:
                'https://twcore.mohw.gov.tw/ig/twcore/CodeSystem/medical-service-payment-tw',
              code: serviceTypeCode,
            },
          ],
        }
      : undefined,
    subject: { reference: `Patient/${patientId}` },
    participant: [
      {
        type: [
          {
            coding: [
              {
                system:
                  'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                code: 'PPRF',
                display: 'primary performer',
              },
            ],
          },
        ],
        period: {
          start: periodStart || undefined,
          end: periodEnd || undefined,
        },
        individual: { reference: `Practitioner/${practitionerId}` },
      },
    ],
    serviceProvider: { reference: `Organization/${organizationId}` },
    period: {
      start: periodStart || undefined,
      end: periodEnd || undefined,
    },
    diagnosis: conditionId
      ? [
          {
            condition: { reference: `Condition/${conditionId}` },
            use: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/diagnosis-role',
                  code: 'AD',
                  display: 'Admission diagnosis',
                },
              ],
            },
            rank: 1,
          },
        ]
      : undefined,
  };
}

// ---------- Observation-bloodPressure-twcore ----------
export function buildBloodPressureObservation({
  patientId,
  encounterId,
  systolic,
  diastolic,
  effectiveDateTime,
}) {
  return {
    resourceType: 'Observation',
    meta: {
      profile: ['https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Observation-bloodPressure-twcore'],
    },
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '85354-9',
          display: 'Blood pressure panel with all children optional',
        },
      ],
      text: 'Blood pressure panel with all children optional',
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: encounterId ? { reference: `Encounter/${encounterId}` } : undefined,
    effectiveDateTime: effectiveDateTime || new Date().toISOString(),
    component: [
      {
        code: {
          coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }],
        },
        valueQuantity: {
          value: Number(systolic),
          unit: 'mmHg',
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]',
        },
      },
      {
        code: {
          coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }],
        },
        valueQuantity: {
          value: Number(diastolic),
          unit: 'mmHg',
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]',
        },
      },
    ],
  };
}

// ---------- Observation-laboratoryResult-twcore ----------
export function buildLabObservation({
  patientId,
  encounterId,
  loincCode,
  loincDisplay,
  value,
  unit,
  effectiveDateTime,
}) {
  return {
    resourceType: 'Observation',
    meta: {
      profile: ['https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/Observation-laboratoryResult-twcore'],
    },
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory',
            display: 'Laboratory',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: loincCode,
        },
      ],
      text: loincDisplay || undefined,
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: encounterId ? { reference: `Encounter/${encounterId}` } : undefined,
    effectiveDateTime: effectiveDateTime || new Date().toISOString(),
    valueQuantity: {
      value: Number(value),
      unit,
      system: 'http://unitsofmeasure.org',
      code: unit,
    },
  };
}
