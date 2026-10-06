export type PlayerGameRow = { rank: number; totalRankingPoint: number };

export type PlayerStats = {
  gamesPlayed: number;
  totalPoint: number;
  /** 1半荘あたりの平均ポイント(totalRankingPoint の平均) */
  averagePoint: number | null;
  averageRank: number | null;
  rankCounts: [number, number, number, number];
  /** トップ(1位)率 */
  topRate: number | null;
  /** 連対率(1位または2位になった割合) */
  rentaiRate: number | null;
  /** ラス回避率(4位にならなかった割合) */
  lastAvoidRate: number | null;
};

export function computePlayerStats(rows: PlayerGameRow[]): PlayerStats {
  const gamesPlayed = rows.length;
  const rankCounts: [number, number, number, number] = [0, 0, 0, 0];
  let totalPoint = 0;
  let rankSum = 0;
  for (const r of rows) {
    totalPoint += r.totalRankingPoint;
    rankSum += r.rank;
    if (r.rank >= 1 && r.rank <= 4) rankCounts[r.rank - 1]++;
  }

  const rate = (n: number) => (gamesPlayed > 0 ? n / gamesPlayed : null);

  return {
    gamesPlayed,
    totalPoint,
    averagePoint: gamesPlayed > 0 ? totalPoint / gamesPlayed : null,
    averageRank: gamesPlayed > 0 ? rankSum / gamesPlayed : null,
    rankCounts,
    topRate: rate(rankCounts[0]),
    rentaiRate: rate(rankCounts[0] + rankCounts[1]),
    lastAvoidRate: rate(gamesPlayed - rankCounts[3]),
  };
}
