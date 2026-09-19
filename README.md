# TW Core IG FHIR 交換測試系統

住院照護情境下的 FHIR 資料交換測試工具（Vue 3 + Express），資料寫入公開測試伺服器
`https://hapi.fhir.org/baseR4`，遵循 TW Core IG 的 resource 對應規範。

## 情境流程

```
檢驗單位 keyin 抽血檢驗結果 ──┐
                              ▼
Organization → Patient → Practitioner → Encounter(可選填入院診斷 → 先建 Condition 再引用)
                                                          │
                                                          ▼
                                          Observation(檢驗/血壓)
                                                          │
                                          護理人員查詢 ◄──┘
                                                │
                                          AI Agent 產生照護建議
```

### 入院診斷（Condition）與 ICD-10-CM 病名自動查詢

在步驟 4 建立 Encounter 時，可選填「入院診斷碼（ICD-10-CM）」與「診斷名稱」。

**輸入診斷碼後會自動查詢對應病名**：
- 英文名稱：查詢 [NLM Clinical Table Search Service](https://clinicaltables.nlm.nih.gov/)（美國國家醫學圖書館，免金鑰、公開的官方 ICD-10-CM 資料庫）
- 中文名稱：由 Gemini API 將英文病名翻譯成臺灣醫療常用繁體中文（**AI 翻譯僅供參考**，非官方 ICD-10-CM 中文對照，正式病歷仍應以英文名稱為準）
- 查到結果後可點「帶入」按鈕，快速把英文或中文病名填入「診斷名稱」欄位

若有填寫診斷碼：
1. 後端會先建立一筆 `Condition`（`category=encounter-diagnosis`, `code` 使用 ICD-10-CM），只需要 Patient
   作為 subject，不需要 Encounter id，避免兩者互相引用的先後順序問題。
2. 再建立 `Encounter`，於 `diagnosis[].condition.reference` 指向該 `Condition/id`，
   `diagnosis[].use` 固定為 `AD`（Admission diagnosis，入院診斷，來自
   `http://terminology.hl7.org/CodeSystem/diagnosis-role`）。

前端會同時顯示 Condition 與 Encounter 兩張結果卡片（各自的 resourceType/id/HTTP 狀態）。

每個 resource 建立後，畫面都會顯示：
- `resourceType` / `id`（HAPI 回傳的 resource id）
- HTTP 狀態（Created / Failed，以及原始 OperationOutcome）
- 可展開的原始 JSON

左側導覽列（Step Rail）即時顯示整條資源鏈目前建立到哪一步、各步驟的 `resourceType/id`。

## 目錄結構

```
tw-fhir-exchange/
├── backend/               # Express API，負責組 FHIR JSON 並代理呼叫 hapi.fhir.org
│   └── src/
│       ├── server.js
│       ├── config.js
│       ├── routes/        # organization / patient / practitioner / encounter / observation / ai
│       ├── services/      # fhirClient.js (HTTP client), aiAgent.js (Claude API)
│       └── utils/fhirBuilders.js  # 依 TW Core 對應表組出各 resource JSON
└── frontend/               # Vue 3 + Vite
    └── src/
        ├── views/          # 6 個步驟頁面
        ├── components/     # StepRail.vue（步驟導覽）、ResourceResult.vue（結果卡片）
        └── store/session.js  # Pinia，暫存跨步驟的 resource id
```

## TW Core 對應規範（已依官方範例 org/pat/pra/enc/obs-example 校對）

| Resource | 關鍵欄位 | System / ValueSet |
|---|---|---|
| Organization | `meta.profile`, identifier.type=`PRN`, identifier.value, name, `active=true`, type.coding=`prov` | `organization-identifier-tw`, `v2-0203`, `organization-type` |
| Patient | `meta.profile`, identifier.type=`NNxxx`(附 identifier-suffix=TWN extension), `active=true`, name.use=`official`, gender, **地址（輸入完整地址字串，後端自動解析）**, managingOrganization | `moi.gov.tw`, `v2-0203`, `administrative-gender`, `postal-code3-tw` |
| Practitioner | `meta.profile`, identifier.type=`MD`, `active=true`, name.use=`official`, gender, telecom | `v2-0203`, `administrative-gender`, `contact-point-system` |
| Encounter | `meta.profile`, status, class.code, serviceType.coding, subject/participant(含 period)/serviceProvider reference, period, **diagnosis(選填，引用 Condition)** | `encounter-status`, `v3-ActCode`, `medical-service-payment-tw`, `v3-ParticipationType`(PPRF), `diagnosis-role`(AD) |
| Observation（血壓） | `meta.profile`, code=`85354-9`(含 code.text), component `8480-6`收縮壓/`8462-4`舒張壓，單位 `mm[Hg]` | LOINC, UCUM |
| Observation（檢驗結果） | `meta.profile`, code.coding[0].code (LOINC)，code.text=項目名稱，valueQuantity.value/code (UCUM) | LOINC, UCUM |

> 上述結構已對照 TW Core IG 官方範例（`org-example`、`pat-example`、`pra-nurse-example`、`enc-example`、
> `obs-loinc-example`、`obs-bloodPressure-example`）逐欄核對，補上 `meta.profile`、`identifier.use/type`、
> `active`、`name.use` 等原本容易被規範表格省略、但官方範例一定會出現的欄位。

## 啟動方式

### 1. 後端

```bash
cd backend
cp .env.example .env
# 編輯 .env：可保留預設 FHIR_BASE_URL，並填入 GEMINI_API_KEY（AI 建議功能需要）
npm install
npm run dev
```

後端預設跑在 `http://localhost:3000`。

### 2. 前端

```bash
cd frontend
npm install
npm run dev
```

前端預設跑在 `http://localhost:5173`，Vite 已設定 proxy 將 `/api/*` 轉送至後端 3000 埠。

## AI 照護建議 Agent

`POST /api/ai/care-suggestion` 會：
1. 依 `patientId` 讀取 Patient 基本資料
2. 查詢該病患**最近一筆有填入院診斷的 Encounter**，讀出其引用的 `Condition`（入院診斷）
3. 查詢該病患的檢驗結果（category=laboratory）與血壓紀錄
4. 將「入院診斷 + 檢驗/生命徵象數據」一併整理成文字，呼叫 Google Gemini API
   （`gemini-2.5-flash`，可於 `.env` 的 `GEMINI_MODEL` 調整）產生繁體中文照護建議——
   AI 會結合診斷判斷數值是否與病程相符、是否有併發症徵兆，而不只是單看檢驗數字

若該病患尚無入院診斷資料，AI 仍會依檢驗/生命徵象數值判讀，並在建議中提醒可補充入院診斷以利更精準分析。

若未設定 `GEMINI_API_KEY`，此功能會回傳明確錯誤訊息提示補設定，其餘功能不受影響。金鑰請至
[Google AI Studio](https://aistudio.google.com/app/apikey) 免費取得。

護理站頁面（`/nurse`）查詢時，也會同時顯示該病患的入院診斷清單，讓護理人員清楚 AI 是根據哪個診斷做分析。

## 操作順序建議

1. `/organization` 建立醫院/機構
2. `/patient` 建立病患（自動關聯 managingOrganization）
3. `/practitioner` 建立醫師/護理人員
4. `/encounter` 建立本次住院就醫紀錄（class=IMP）
5. `/lab-keyin`：**檢驗單位角色**，輸入抽血檢驗結果或血壓數據
6. `/nurse`：**護理人員角色**，查詢病患檢驗結果，並可一鍵產生 AI 照護建議

## 注意事項

- `hapi.fhir.org/baseR4` 為公開測試伺服器，資料會被公開讀取且定期清除，僅適合測試，不可放真實病患資料。
- 目前的 LOINC / UCUM 值為常見預設，實際串接請依照完整 TW Core IG ValueSet binding 驗證（strength 為 required 的欄位需嚴格檢查）。
- `Encounter.location` 與 `Location` resource 未納入本版本，如需要可依同樣模式擴充一個 `Location-twcore` 步驟。
