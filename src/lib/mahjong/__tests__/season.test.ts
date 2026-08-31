import { describe, it, expect } from "vitest";
import { getSeasonYear, getSeasonRange, getQuarterForDate, getQuarterRange } from "../season";

describe("getSeasonYear(seasonStartMonth=9)", () => {
  it("8/31は前年度シーズンに属する", () => {
    expect(getSeasonYear(new Date(2026, 7, 31), 9)).toBe(2025);
  });

  it("9/1は新年度シーズンに属する", () => {
    expect(getSeasonYear(new Date(2026, 8, 1), 9)).toBe(2026);
  });
});

describe("getSeasonYear(seasonStartMonth=4: 4月始まり)", () => {
  it("3/31は前年度シーズンに属する", () => {
    expect(getSeasonYear(new Date(2026, 2, 31), 4)).toBe(2025);
  });

  it("4/1は新年度シーズンに属する", () => {
    expect(getSeasonYear(new Date(2026, 3, 1), 4)).toBe(2026);
  });
});

describe("getQuarterForDate(seasonStartMonth=9)", () => {
  it("9月はQ1", () => {
    expect(getQuarterForDate(new Date(2025, 8, 15), 9).quarter).toBe(1);
  });

  it("12月はQ2", () => {
    expect(getQuarterForDate(new Date(2025, 11, 15), 9).quarter).toBe(2);
  });

  it("3月はQ3", () => {
    expect(getQuarterForDate(new Date(2026, 2, 15), 9).quarter).toBe(3);
  });

  it("6月はQ4", () => {
    expect(getQuarterForDate(new Date(2026, 5, 15), 9).quarter).toBe(4);
  });

  it("年跨ぎ: 2025年度Q2は2025/12/01〜2026/02/28", () => {
    const range = getQuarterRange(2025, 2, 9);
    expect(range.start).toEqual(new Date(2025, 11, 1, 0, 0, 0, 0));
    expect(range.end).toEqual(new Date(2026, 1, 28, 23, 59, 59, 999));
  });

  it("うるう年: 2027年度Q2(2028年2月)は29日まで", () => {
    const range = getQuarterRange(2027, 2, 9);
    expect(range.end).toEqual(new Date(2028, 1, 29, 23, 59, 59, 999));
  });

  it("2025年度Q1は2025/09/01〜2025/11/30", () => {
    const range = getQuarterRange(2025, 1, 9);
    expect(range.start).toEqual(new Date(2025, 8, 1, 0, 0, 0, 0));
    expect(range.end).toEqual(new Date(2025, 10, 30, 23, 59, 59, 999));
  });

  it("2025年度Q4は2026/06/01〜2026/08/31", () => {
    const range = getQuarterRange(2025, 4, 9);
    expect(range.start).toEqual(new Date(2026, 5, 1, 0, 0, 0, 0));
    expect(range.end).toEqual(new Date(2026, 7, 31, 23, 59, 59, 999));
  });
});

describe("getQuarterRange(seasonStartMonth=1: 1月始まり)", () => {
  it("Q1は1/1〜3/31、Q4は10/1〜12/31になる", () => {
    const q1 = getQuarterRange(2026, 1, 1);
    expect(q1.start).toEqual(new Date(2026, 0, 1, 0, 0, 0, 0));
    expect(q1.end).toEqual(new Date(2026, 2, 31, 23, 59, 59, 999));

    const q4 = getQuarterRange(2026, 4, 1);
    expect(q4.start).toEqual(new Date(2026, 9, 1, 0, 0, 0, 0));
    expect(q4.end).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
  });
});

describe("実行環境のタイムゾーンに依存しないこと(本番はUTC、ユーザーはJST前提)", () => {
  it("シーズン開始の境界は常に日本時間の0時(=UTC前日15時)を指す", () => {
    // ローカルDate構築(new Date(y,m,d,...))を使わず、TZに依存しないUTC ISO文字列で検証する。
    // 「2025/09/01 00:00 JST」は「2025/08/31 15:00 UTC」と一致するはず。
    const range = getSeasonRange(2025, 9);
    expect(range.start.toISOString()).toBe("2025-08-31T15:00:00.000Z");
  });

  it("UTC上ではまだ8/31 深夜でも、日本時間ではすでに9/1なら新シーズンと判定する", () => {
    // 2025-09-01T00:00:00+09:00 と同じ瞬間 = 2025-08-31T15:00:00.000Z
    const jstMidnightSep1 = new Date("2025-08-31T15:00:00.000Z");
    expect(getSeasonYear(jstMidnightSep1, 9)).toBe(2025);

    // その1ミリ秒前(まだJSTで8/31)は前シーズンのまま
    const oneMsBefore = new Date("2025-08-31T14:59:59.999Z");
    expect(getSeasonYear(oneMsBefore, 9)).toBe(2024);
  });
});
