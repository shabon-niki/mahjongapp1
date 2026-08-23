import { describe, it, expect } from "vitest";
import { calculateRanking, type GameResultLike, type PlayCountBonusRule } from "../ranking";

const PERIOD = { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) };

function result(userId: string, userName: string, rankingPoint: number, day: number): GameResultLike {
  return { userId, userName, rankingPoint, playedAt: new Date(2026, 0, day) };
}

describe("calculateRanking", () => {
  it("対局数ボーナス無しの場合はtotalPointの合計そのままで順位付けする", () => {
    const results = [
      result("u1", "A", 10, 1),
      result("u1", "A", 10, 2),
      result("u2", "B", 15, 1),
    ];
    const ranking = calculateRanking(results, PERIOD);
    expect(ranking[0].userId).toBe("u1");
    expect(ranking[0].totalPoint).toBe(20);
    expect(ranking[0].playCountBonusPoint).toBe(0);
  });

  it("対局数TOP3に加点、WORST3に加点(通常負)する", () => {
    const bonusRule: PlayCountBonusRule = {
      enabled: true,
      bonusTop: [3, 2, 1],
      penaltyWorst: [-3, -2, -1],
    };
    // u1: 5局, u2: 4局, u3: 3局, u4: 2局, u5: 1局, u6: 1局(同数タイ)
    const results = [
      ...Array.from({ length: 5 }, (_, i) => result("u1", "A", 0, i + 1)),
      ...Array.from({ length: 4 }, (_, i) => result("u2", "B", 0, i + 1)),
      ...Array.from({ length: 3 }, (_, i) => result("u3", "C", 0, i + 1)),
      ...Array.from({ length: 2 }, (_, i) => result("u4", "D", 0, i + 1)),
      result("u5", "E", 0, 1),
      result("u6", "F", 0, 1),
    ];
    const ranking = calculateRanking(results, PERIOD, bonusRule);
    const byId = new Map(ranking.map((r) => [r.userId, r]));

    expect(byId.get("u1")?.playCountBonusPoint).toBe(3); // TOP1(5局)
    expect(byId.get("u2")?.playCountBonusPoint).toBe(2); // TOP2(4局)
    expect(byId.get("u3")?.playCountBonusPoint).toBe(1); // TOP3(3局)
    // 参加者6名なので、TOP3以外の残り3名(u4,u5,u6)がそのままWORST3になる
    const worstPoints = [
      byId.get("u4")?.playCountBonusPoint,
      byId.get("u5")?.playCountBonusPoint,
      byId.get("u6")?.playCountBonusPoint,
    ].sort((a = 0, b = 0) => a - b);
    expect(worstPoints).toEqual([-3, -2, -1]);
  });

  it("参加者がTOP3人数より少ない場合は全員が対局数順にボーナスを受け取り、ペナルティは発生しない", () => {
    const bonusRule: PlayCountBonusRule = {
      enabled: true,
      bonusTop: [3, 2, 1],
      penaltyWorst: [-3, -2, -1],
    };
    // 参加者2名のみ: u1が3局, u2が1局
    const results = [
      ...Array.from({ length: 3 }, (_, i) => result("u1", "A", 0, i + 1)),
      result("u2", "B", 0, 1),
    ];
    const ranking = calculateRanking(results, PERIOD, bonusRule);
    const byId = new Map(ranking.map((r) => [r.userId, r]));

    // 2名しかいないため、両者ともTOP側のボーナス(+3, +2)を受け取り、
    // WORST側の対象者がいなくなる(ペナルティは発生しない)
    expect(byId.get("u1")?.playCountBonusPoint).toBe(3);
    expect(byId.get("u2")?.playCountBonusPoint).toBe(2);
  });

  it("enabled=falseなら対局数ボーナスを適用しない", () => {
    const bonusRule: PlayCountBonusRule = {
      enabled: false,
      bonusTop: [3, 2, 1],
      penaltyWorst: [-3, -2, -1],
    };
    const results = [result("u1", "A", 0, 1), result("u2", "B", 0, 1)];
    const ranking = calculateRanking(results, PERIOD, bonusRule);
    expect(ranking.every((r) => r.playCountBonusPoint === 0)).toBe(true);
  });
});
