/**
 * 台灣地址解析器。
 *
 * 依台灣地址慣用書寫順序，用正規表達式依序從字串開頭「剝除」每一段：
 *   (郵遞區號) 縣/市 鄉/鎮/市/區 村/里 鄰 路/街 段 巷 弄 號 樓 室
 *
 * 例：「(103)臺北市大同區大有里19鄰承德路三段52巷6弄210號2樓B室」
 * 例：「臺北市大同區大有里19鄰承德路三段52巷6弄210號」（無郵遞區號/樓/室）
 *
 * 注意：這是規則式解析，無法保證 100% 涵蓋所有特殊寫法（例如沒有「區」的地址、
 * 工業區/科學園區地址、國外地址等）。解析不到的部分會留在 remainder，
 * 呼叫端應保留原始輸入字串於 address.text，確保資料不會遺失。
 */
export function parseTaiwanAddress(fullAddress) {
  let remaining = String(fullAddress || '').trim();
  const result = {};

  const extract = (regex, key) => {
    const m = remaining.match(regex);
    if (m) {
      result[key] = m[0];
      remaining = remaining.slice(m[0].length);
    }
  };

  // 郵遞區號：開頭的 (103) 或 103- 之類的寫法
  const postalMatch = remaining.match(/^\((\d{3,5})\)|^(\d{3,5})[-\s]/);
  if (postalMatch) {
    result.postalCode = postalMatch[1] || postalMatch[2];
    remaining = remaining.slice(postalMatch[0].length);
  }

  extract(/^.{1,3}[縣市]/, 'district'); // 縣/市
  extract(/^.{1,4}[鄉鎮市區]/, 'city'); // 鄉/鎮/市/區
  extract(/^.{1,6}[村里]/, 'village'); // 村/里（選填）
  extract(/^\d{1,3}鄰/, 'neighborhood'); // 鄰（選填）
  extract(/^.{1,8}?(路|街|大道|道)/, 'line'); // 路/街（非貪婪，取最短符合）
  extract(/^[\d一二三四五六七八九十]{1,3}段/, 'section'); // 段（選填）
  extract(/^\d{1,4}巷/, 'lane'); // 巷（選填）
  extract(/^\d{1,4}弄/, 'alley'); // 弄（選填）
  extract(/^\d{1,5}(?:-\d{1,3})?號/, 'number'); // 號
  extract(/^[A-Za-z0-9\u4e00-\u9fff]{1,4}樓/, 'floor'); // 樓（選填，含 B1 / 地下等）
  extract(/^之?[A-Za-z0-9]{1,4}室/, 'room'); // 室（選填）

  const remainder = remaining.trim();
  return { ...result, remainder: remainder || undefined };
}
