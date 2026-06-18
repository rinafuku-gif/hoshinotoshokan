/**
 * 占術計算ロジックのテスト
 *
 * テスト対象:
 * - normalizeAngle     — lib/fortune-calc.ts
 * - getJulianDay       — lib/fortune-calc.ts
 * - generateStatementNumber (再掲なし)
 * - calculateSukuyo    — lib/fortune-calc.ts
 * - calculateSanmeigaku — lib/fortune-calc.ts
 * - MAYA_YEARS / GLYPHS / TONES の定数整合性
 *
 * 注意: 天文計算関数（getSolarLongitude 等）は複雑な浮動小数点演算のため
 *       既知の正解値に対する回帰テストのみ行う。
 */

import { describe, it, expect } from "vitest";
import {
  normalizeAngle,
  getJulianDay,
  calculateSukuyo,
  calculateSanmeigaku,
  GLYPHS,
  TONES,
  MAYA_YEARS,
  MAYA_MONTHS,
  STEMS,
  BRANCHES,
} from "@/features/fortune/fortune-calc";

// ---------- normalizeAngle ----------

describe("normalizeAngle", () => {
  it("0-359の範囲はそのまま返る", () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(180)).toBe(180);
    expect(normalizeAngle(359)).toBeCloseTo(359, 5);
  });

  it("360 は 0 に正規化される", () => {
    expect(normalizeAngle(360)).toBeCloseTo(0, 5);
  });

  it("負の角度は正の範囲に変換される", () => {
    expect(normalizeAngle(-1)).toBeCloseTo(359, 5);
    expect(normalizeAngle(-90)).toBeCloseTo(270, 5);
    expect(normalizeAngle(-360)).toBeCloseTo(0, 5);
  });

  it("360以上の角度は正しく折り返す", () => {
    expect(normalizeAngle(361)).toBeCloseTo(1, 5);
    expect(normalizeAngle(720)).toBeCloseTo(0, 5);
    expect(normalizeAngle(540)).toBeCloseTo(180, 5);
  });
});

// ---------- getJulianDay ----------

describe("getJulianDay", () => {
  it("J2000基準日（2000-01-01）のユリウス日は既知値に近い", () => {
    // 2000-01-01 のJD(UT正午) = 2451545.0
    const jd = getJulianDay(2000, 1, 1);
    expect(jd).toBeCloseTo(2451544.5, 0);
  });

  it("2025-04-01 のユリウス日は 2451545 より大きい", () => {
    const jd = getJulianDay(2025, 4, 1);
    expect(jd).toBeGreaterThan(2451545);
  });

  it("同一年の日付で後日の方が JD が大きい", () => {
    const jd1 = getJulianDay(2025, 1, 1);
    const jd2 = getJulianDay(2025, 6, 1);
    expect(jd2).toBeGreaterThan(jd1);
  });

  it("年が増えると JD が増える", () => {
    const jd2024 = getJulianDay(2024, 1, 1);
    const jd2025 = getJulianDay(2025, 1, 1);
    expect(jd2025).toBeGreaterThan(jd2024);
  });

  it("うるう年の 2000-02-29 が計算できる（JDが連続する）", () => {
    const jd28 = getJulianDay(2000, 2, 28);
    const jd29 = getJulianDay(2000, 2, 29);
    const jd01 = getJulianDay(2000, 3, 1);
    expect(jd29 - jd28).toBeCloseTo(1, 5);
    expect(jd01 - jd29).toBeCloseTo(1, 5);
  });
});

// ---------- 定数の整合性 ----------

describe("GLYPHS / TONES / STEMS / BRANCHES", () => {
  it("GLYPHS は20要素", () => {
    expect(GLYPHS.length).toBe(20);
  });

  it("TONES は13要素", () => {
    expect(TONES.length).toBe(13);
  });

  it("STEMS は10要素（十干）", () => {
    expect(STEMS.length).toBe(10);
  });

  it("BRANCHES は12要素（十二支）", () => {
    expect(BRANCHES.length).toBe(12);
  });

  it("GLYPHS に重複がない", () => {
    expect(new Set(GLYPHS).size).toBe(GLYPHS.length);
  });

  it("MAYA_YEARS は 1950-2030 の各年を網羅している", () => {
    for (let y = 1950; y <= 2030; y++) {
      expect(MAYA_YEARS[y]).toBeDefined();
    }
  });

  it("MAYA_MONTHS は 1-12 月を全て持つ", () => {
    for (let m = 1; m <= 12; m++) {
      expect(MAYA_MONTHS[m]).toBeDefined();
    }
  });
});

// ---------- calculateSukuyo (宿曜) ----------

describe("calculateSukuyo", () => {
  it("既知の日付で '宿' で終わる文字列を返す", () => {
    const result = calculateSukuyo(2025, 4, 1);
    expect(result).toMatch(/宿$/);
  });

  it("MANSIONS_27 の27宿のいずれかを返す", () => {
    const MANSIONS_27 = [
      "昴", "畢", "觜", "参", "井", "鬼", "柳", "星", "張", "翼", "軫",
      "角", "亢", "氐", "房", "心", "尾", "箕", "斗", "女", "虚", "危",
      "室", "壁", "奎", "婁", "胃"
    ];
    const result = calculateSukuyo(2025, 4, 1);
    const star = result.replace("宿", "");
    expect(MANSIONS_27).toContain(star);
  });

  it("連続した7日間で同じ宿は繰り返さない（周期27なので）", () => {
    const results = new Set<string>();
    for (let d = 1; d <= 7; d++) {
      results.add(calculateSukuyo(2025, 4, d));
    }
    // 7日分は全て異なるはず
    expect(results.size).toBe(7);
  });

  it("同一日付は何度呼んでも同じ結果を返す（冪等性）", () => {
    const r1 = calculateSukuyo(2025, 4, 1);
    const r2 = calculateSukuyo(2025, 4, 1);
    expect(r1).toBe(r2);
  });
});

// ---------- calculateSanmeigaku (算命学) ----------

describe("calculateSanmeigaku", () => {
  it("結果オブジェクトが必要なフィールドを全て持つ", () => {
    const result = calculateSanmeigaku(1990, 5, 15);
    expect(result).toHaveProperty("day");
    expect(result).toHaveProperty("month");
    expect(result).toHaveProperty("year");
    expect(result).toHaveProperty("mainStar");
    expect(result).toHaveProperty("dayStem");
  });

  it("day フィールドは 十干+十二支 の2文字構成", () => {
    const result = calculateSanmeigaku(1990, 5, 15);
    // 十干 (STEMS) の最初の文字 + 十二支 (BRANCHES) の最初の文字
    const dayStem = result.day[0];
    const dayBranch = result.day[1];
    expect(STEMS).toContain(dayStem);
    expect(BRANCHES).toContain(dayBranch);
  });

  it("year フィールドは 十干+十二支 の2文字構成", () => {
    const result = calculateSanmeigaku(1990, 5, 15);
    const yearStem = result.year[0];
    const yearBranch = result.year[1];
    expect(STEMS).toContain(yearStem);
    expect(BRANCHES).toContain(yearBranch);
  });

  it("mainStar は空文字でない", () => {
    const result = calculateSanmeigaku(1990, 5, 15);
    expect(result.mainStar.length).toBeGreaterThan(0);
  });

  it("dayStem は STEMS のいずれか", () => {
    const result = calculateSanmeigaku(2000, 1, 1);
    expect(STEMS).toContain(result.dayStem);
  });

  it("60日後に干支が一周する（60干支の周期）", () => {
    const base = calculateSanmeigaku(2025, 1, 1);
    const after60 = calculateSanmeigaku(2025, 3, 2); // ちょうど60日後
    expect(after60.day).toBe(base.day);
  });
});
