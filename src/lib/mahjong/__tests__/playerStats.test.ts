import { describe, it, expect } from "vitest";
import { computePlayerStats } from "../playerStats";

describe("computePlayerStats", () => {
  it("対局がなければ率・平均はnull", () => {
    const s = computePlayerStats([]);
    expect(s.gamesPlayed).toBe(0);
    expect(s.averageRank).toBeNull();
    expect(s.averageScore).toBeNull();
    expect(s.rentaiRate).toBeNull();
    expect(s.lastAvoidRate).toBeNull();
  });

  it("順位分布・平均順位・平均点数・各率を集計する", () => {
    const s = computePlayerStats([
      { rank: 1, totalRankingPoint: 30, finalScore: 45000 },
      { rank: 2, totalRankingPoint: 5, finalScore: 30000 },
      { rank: 4, totalRankingPoint: -35, finalScore: 10000 },
      { rank: 3, totalRankingPoint: -8, finalScore: 15000 },
    ]);
    expect(s.gamesPlayed).toBe(4);
    expect(s.rankCounts).toEqual([1, 1, 1, 1]);
    expect(s.totalPoint).toBe(-8);
    expect(s.averageScore).toBe(25000);
    expect(s.averageRank).toBe(2.5);
    expect(s.topRate).toBe(0.25);
    expect(s.rentaiRate).toBe(0.5);
    expect(s.lastAvoidRate).toBe(0.75);
  });

  it("負けなしなら連対率・ラス回避率は100%", () => {
    const s = computePlayerStats([
      { rank: 1, totalRankingPoint: 20, finalScore: 40000 },
      { rank: 2, totalRankingPoint: 3, finalScore: 28000 },
    ]);
    expect(s.rentaiRate).toBe(1);
    expect(s.lastAvoidRate).toBe(1);
  });
});
