/**
 * ランキング集計ロジック(仕様23〜24章)。
 *
 * 重要: 具体的な既存の点数計算・ranking_point算出ルールは本リポジトリ内に
 * 見つからなかったため、GameResult.rankingPointの値をそのまま期間集計する
 * 形にとどめ、算出ロジック自体は差し替え可能な構造にしている。
 * ranking_pointの計算方法自体はREADME.mdのTODOを参照。
 *
 * 参加者レコメンド(recommendation.ts)とは完全に分離しており、
 * このファイルの値をレコメンドロジックに使用してはならない(仕様26章)。
 */

/**
 * TODO(仮ルール): 1位/2位/3位/4位に応じたranking_point算出ルール(ウマ)。
 * 社内既存のランキング計算ルールが未確認のため、暫定的にウマのみのシンプルな
 * 配分(オカ・原点なし、合計0)を仮採用している。既存ルールが判明次第、
 * この配列(または算出関数)を差し替えること。詳細はREADME.mdのTODOを参照。
 */
export const PROVISIONAL_RANKING_POINT_BY_RANK: [number, number, number, number] = [
  30, 10, -10, -30,
];

export type GameResultLike = {
  userId: string;
  userName: string;
  rankingPoint: number;
  playedAt: Date;
};

export type RankingEntry = {
  rank: number;
  userId: string;
  userName: string;
  totalPoint: number;
  gamesPlayed: number;
  /** 対局数ボーナス/ペナルティの加減点(適用なしなら0)。totalPointに含まれている。 */
  playCountBonusPoint: number;
};

/**
 * 対局数ボーナス設定(仕様追加: 対局数TOP3への加点/WORST3への減点)。
 * 期間内の対局数(gamesPlayed)の多い順にbonusTop[0..2]を加算し、
 * それ以外のユーザーの中で対局数が少ない順にpenaltyWorst[0..2]を加算する。
 * 同一ユーザーがTOPとWORSTを両方受け取ることはない。
 * 参加者がTOP3の人数(3名)以下の場合は全員がTOP側のボーナスを受け取り、
 * WORST側の対象者がいなくなる(ペナルティは発生しない)。
 */
export type PlayCountBonusRule = {
  enabled: boolean;
  bonusTop: [number, number, number];
  penaltyWorst: [number, number, number];
};

/** PrismaのGroupRuleモデルから、ranking集計にそのまま渡せる設定を組み立てる */
export function toPlayCountBonusRule(rule: {
  playCountBonusEnabled: boolean;
  playCountBonusTop1: number;
  playCountBonusTop2: number;
  playCountBonusTop3: number;
  playCountPenaltyWorst1: number;
  playCountPenaltyWorst2: number;
  playCountPenaltyWorst3: number;
}): PlayCountBonusRule {
  return {
    enabled: rule.playCountBonusEnabled,
    bonusTop: [rule.playCountBonusTop1, rule.playCountBonusTop2, rule.playCountBonusTop3],
    penaltyWorst: [
      rule.playCountPenaltyWorst1,
      rule.playCountPenaltyWorst2,
      rule.playCountPenaltyWorst3,
    ],
  };
}

/** 期間内のGameResultからランキングを集計する。集計ルール自体は差し替え可能。 */
export function calculateRanking(
  results: GameResultLike[],
  period: { start: Date; end: Date },
  playCountBonusRule?: PlayCountBonusRule
): RankingEntry[] {
  const inPeriod = results.filter(
    (r) => r.playedAt >= period.start && r.playedAt <= period.end
  );

  const byUser = new Map<string, { userName: string; totalPoint: number; gamesPlayed: number }>();
  for (const r of inPeriod) {
    const entry = byUser.get(r.userId) ?? {
      userName: r.userName,
      totalPoint: 0,
      gamesPlayed: 0,
    };
    entry.totalPoint += r.rankingPoint;
    entry.gamesPlayed += 1;
    byUser.set(r.userId, entry);
  }

  const entries = Array.from(byUser.entries()).map(([userId, v]) => ({
    userId,
    ...v,
    playCountBonusPoint: 0,
  }));

  if (playCountBonusRule?.enabled && entries.length > 0) {
    const byGamesDesc = [...entries].sort((a, b) => b.gamesPlayed - a.gamesPlayed);
    const bonusRecipients = byGamesDesc.slice(0, 3);
    bonusRecipients.forEach((entry, i) => {
      entry.playCountBonusPoint += playCountBonusRule.bonusTop[i];
    });

    const bonusUserIds = new Set(bonusRecipients.map((e) => e.userId));
    const byGamesAsc = [...entries]
      .filter((e) => !bonusUserIds.has(e.userId))
      .sort((a, b) => a.gamesPlayed - b.gamesPlayed);
    const penaltyRecipients = byGamesAsc.slice(0, 3);
    penaltyRecipients.forEach((entry, i) => {
      entry.playCountBonusPoint += playCountBonusRule.penaltyWorst[i];
    });
  }

  const sorted = entries
    .map((entry) => ({ ...entry, totalPoint: entry.totalPoint + entry.playCountBonusPoint }))
    .sort((a, b) => b.totalPoint - a.totalPoint);

  return sorted.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId,
    userName: entry.userName,
    // 浮動小数点の累積誤差を避けるため小数第1位に丸める
    totalPoint: Math.round(entry.totalPoint * 10) / 10,
    gamesPlayed: entry.gamesPlayed,
    playCountBonusPoint: Math.round(entry.playCountBonusPoint * 10) / 10,
  }));
}
