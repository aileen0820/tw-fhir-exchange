/**
 * 共用欄位格式驗證規則。
 */

// 機構代碼：健保署核發，固定 10 碼，僅限數字
const ORG_CODE_REGEX = /^\d{10}$/;

// 身分證字號：第 1 碼英文字母，第 2 碼為 1 或 2（性別碼），後面 8 碼數字
const NATIONAL_ID_REGEX = /^[A-Za-z][12]\d{8}$/;

export function validateOrgCode(orgCode) {
  if (!ORG_CODE_REGEX.test(orgCode || '')) {
    return '機構代碼格式錯誤：必須為 10 碼數字（例如：0132010014）';
  }
  return null;
}

export function validateNationalId(nationalId) {
  if (!NATIONAL_ID_REGEX.test(nationalId || '')) {
    return '身分證字號格式錯誤：第 1 碼須為英文字母，第 2 碼須為 1 或 2，後面 8 碼須為數字（例如：A123456789）';
  }
  return null;
}
