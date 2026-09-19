import axios from 'axios';
import { config } from '../config.js';

/**
 * 將 FHIR Observation resources 整理成精簡文字，供 LLM 判讀。
 */
function summarizeObservations(observations) {
  return observations
    .map((obs) => {
      const code = obs.code?.coding?.[0];
      const label = code?.display || code?.code || '未知項目';
      if (obs.valueQuantity) {
        return `- ${label} (LOINC ${code?.code}): ${obs.valueQuantity.value} ${obs.valueQuantity.unit || ''}，時間 ${obs.effectiveDateTime || '未知'}`;
      }
      if (obs.component?.length) {
        const parts = obs.component
          .map((c) => `${c.code?.coding?.[0]?.display || c.code?.coding?.[0]?.code}: ${c.valueQuantity?.value} ${c.valueQuantity?.unit || ''}`)
          .join('，');
        return `- ${label}: ${parts}，時間 ${obs.effectiveDateTime || '未知'}`;
      }
      return `- ${label}: (無數值)`;
    })
    .join('\n');
}

/**
 * 將 Condition resources（入院診斷）整理成精簡文字，供 LLM 判讀。
 */
function summarizeDiagnoses(diagnoses) {
  if (!diagnoses?.length) return '';
  return diagnoses
    .map((c) => {
      const coding = c.code?.coding?.[0];
      const label = c.code?.text || coding?.display || coding?.code || '未知診斷';
      const codeSuffix = coding?.code ? `（ICD-10-CM ${coding.code}）` : '';
      return `- ${label}${codeSuffix}`;
    })
    .join('\n');
}

export async function generateCareSuggestion({ patientSummary, observations, diagnoses = [] }) {
  if (!config.geminiApiKey) {
    return {
      ok: false,
      error:
        '尚未設定 GEMINI_API_KEY，請於 backend/.env 中設定後再試（參考 .env.example，可至 https://aistudio.google.com/app/apikey 取得金鑰）。',
    };
  }

  const obsText = summarizeObservations(observations);
  const diagText = summarizeDiagnoses(diagnoses);

  const systemPrompt = `你是一位協助台灣住院病房護理人員的臨床決策輔助 AI。
你會收到病患基本資料、入院診斷，以及最新檢驗/生命徵象數值，請將入院診斷與檢驗/生命徵象數據結合判讀
（例如：該數值對這個診斷而言是否在預期範圍內、是否與診斷病程相符、是否出現需要留意的併發症徵兆），
並用繁體中文提供：
1. 結合診斷的數值判讀（是否異常、是否與入院診斷的病程相符、趨勢重點）
2. 建議護理觀察重點（針對此診斷應特別留意的項目）
3. 是否建議通報醫師/需要的處置建議
若無入院診斷資料，則僅依檢驗/生命徵象數值判讀，並在建議中提醒可補充入院診斷以利更精準分析。
請務必註明：本建議僅供臨床參考，不能取代醫師專業判斷，最終處置需由醫療團隊確認。
回覆請條列清楚、簡潔，避免冗長。`;

  const userPrompt = `病患資訊：\n${patientSummary}\n\n入院診斷：\n${diagText || '（無診斷資料）'}\n\n最新檢驗/生命徵象數據：\n${obsText || '（無資料）'}\n\n請結合入院診斷與檢驗/生命徵象數據，提供照護建議。`;

  const requestBody = {
    systemInstruction: {
      role: 'system',
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.4,
    },
  };

  const requestConfig = {
    headers: {
      'x-goog-api-key': config.geminiApiKey,
      'content-type': 'application/json',
    },
    timeout: 30000,
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`;

  // Gemini 伺服器過載時會回傳 503 + "high demand" / "overloaded" 訊息，屬於暫時性錯誤，
  // 用短暫延遲重試 2 次，通常就能成功，不需要使用者自己手動按重試。
  const MAX_RETRIES = 2;
  const RETRY_DELAYS_MS = [1500, 4000];

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const res = await axios.post(url, requestBody, requestConfig);

      const candidate = res.data.candidates?.[0];
      const text = (candidate?.content?.parts || [])
        .map((p) => p.text || '')
        .join('\n')
        .trim();

      if (!text) {
        return {
          ok: false,
          error: `Gemini 未回傳文字內容（finishReason: ${candidate?.finishReason || '未知'}）`,
        };
      }

      return { ok: true, suggestion: text, model: config.geminiModel };
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.error?.message || err.message;
      const isOverloaded =
        status === 503 ||
        status === 429 ||
        /high demand|overloaded|unavailable/i.test(message || '');

      lastError = message;

      if (isOverloaded && attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        continue; // 重試
      }

      return {
        ok: false,
        error: isOverloaded
          ? `Gemini 伺服器目前流量較高，已自動重試 ${attempt + 1} 次仍失敗，請稍後再按一次「產生照護建議」。（原始訊息：${message}）`
          : message,
      };
    }
  }

  return { ok: false, error: lastError || 'Gemini 呼叫失敗，原因不明' };
}
