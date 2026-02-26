import * as XLSX from 'xlsx';
import type { AllianceMember } from './types';
import { parseCombatPower, generateId } from './utils';

interface RawRow {
  '#'?: number;
  '이름'?: string;
  '전투력'?: string | number;
  '불의수정'?: number | string;
  '지심탐험'?: number | string;
  '스테이지'?: number | string;
}

function parseNumericField(value: unknown): number | null {
  if (value === null || value === undefined || value === '-' || value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

function parseFCLevel(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const str = String(value).trim();
  // "Lv.23" 등은 본부 레벨이지 FC 레벨이 아님 → FC 0으로 처리
  if (/Lv\.?\s*\d+/i.test(str)) return 0;
  const num = parseInt(str, 10);
  if (isNaN(num)) return 0;
  // FC 레벨은 1~10 범위만 유효
  if (num < 1 || num > 10) return 0;
  return num;
}

export function parseExcelBuffer(buffer: ArrayBuffer): AllianceMember[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet);

  const members: AllianceMember[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nickname = row['이름'];
    if (!nickname || String(nickname).trim() === '') continue;

    const combatPowerRaw = row['전투력'] ?? '0';
    const combatPowerStr = String(combatPowerRaw).trim();
    const combatPowerNumeric = parseCombatPower(combatPowerStr);
    const fcLevel = parseFCLevel(row['불의수정']);
    const deepDiveRank = parseNumericField(row['지심탐험']);
    const stage = parseNumericField(row['스테이지']);

    members.push({
      id: generateId(),
      rank: row['#'] ?? i + 1,
      nickname: String(nickname).trim(),
      combatPower: combatPowerStr.includes('M') ? combatPowerStr : combatPowerStr,
      combatPowerNumeric,
      fcLevel,
      deepDiveRank,
      stage,
      isFC5: fcLevel >= 5,
    });
  }

  // Sort by deepDiveRank (ascending, nulls last)
  members.sort((a, b) => {
    if (a.deepDiveRank === null && b.deepDiveRank === null) return 0;
    if (a.deepDiveRank === null) return 1;
    if (b.deepDiveRank === null) return -1;
    return a.deepDiveRank - b.deepDiveRank;
  });

  return members;
}
