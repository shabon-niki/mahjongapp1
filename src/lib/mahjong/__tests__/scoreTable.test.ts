import { describe, it, expect } from "vitest";
import { calculateHanFuScore } from "../scoreTable";

describe("calculateHanFuScore", () => {
  it("30符3翻: 子ロン3900, 親ロン5800", () => {
    const s = calculateHanFuScore(3, 30);
    expect(s.nonDealerRon).toBe(3900);
    expect(s.dealerRon).toBe(5800);
    expect(s.isMangan).toBe(false);
  });

  it("30符4翻: 子ロン7700, 親ロン11600", () => {
    const s = calculateHanFuScore(4, 30);
    expect(s.nonDealerRon).toBe(7700);
    expect(s.dealerRon).toBe(11600);
  });

  it("40符3翻: 子ロン5200", () => {
    const s = calculateHanFuScore(3, 40);
    expect(s.nonDealerRon).toBe(5200);
  });

  it("20符4翻: 子ツモは親2600/子1300ずつ", () => {
    const s = calculateHanFuScore(4, 20);
    expect(s.nonDealerTsumoFromDealer).toBe(2600);
    expect(s.nonDealerTsumoFromOther).toBe(1300);
  });

  it("基本点が2000点相当以上になる場合は満貫として頭打ちする(例: 4翻40符)", () => {
    const s = calculateHanFuScore(4, 40);
    expect(s.isMangan).toBe(true);
    expect(s.basePoints).toBe(2000);
    // 頭打ち後は満貫と同額(子ロン8000, 親ロン12000)になる
    expect(s.nonDealerRon).toBe(8000);
    expect(s.dealerRon).toBe(12000);
  });

  it("1翻30符のような小さい手も100点未満は切り上げる", () => {
    const s = calculateHanFuScore(1, 30);
    // base = 30*8 = 240, 子ロン = ceil(240*4/100)*100 = 1000
    expect(s.nonDealerRon).toBe(1000);
  });
});
