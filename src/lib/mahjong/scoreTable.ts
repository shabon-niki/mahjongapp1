/**
 * 標準的なリーチ麻雀の符計算・翻符点数表(仕様外の一般知識としてのLEARN表示用)。
 *
 * このファイルの値はGroupRule(ウマ・オカ・チップ等)とは無関係の、
 * 「役+符から何点になるか」という麻雀の基本ルールそのものを説明するための
 * 静的な参照データ/純粋関数。scoreEngine.ts(対局結果からランキングポイントを
 * 算出するロジック)とは目的が異なるため、あえて分離している。
 */

function roundUpToHundred(n: number): number {
  return Math.ceil(n / 100) * 100;
}

export const MANGAN_BASE_POINTS = 2000;

export type HanFuScore = {
  han: number;
  fu: number;
  /** 基本点(符 × 2^(2+翻)。満貫相当で頭打ちされた場合はMANGAN_BASE_POINTSに丸められる) */
  basePoints: number;
  /** 満貫に頭打ちされているか(4翻40符, 3翻70符以上など) */
  isMangan: boolean;
  dealerRon: number;
  dealerTsumoEach: number;
  nonDealerRon: number;
  nonDealerTsumoFromDealer: number;
  nonDealerTsumoFromOther: number;
};

/** 符と翻から基本点・親/子それぞれのロン・ツモ点数を算出する(100点未満切り上げ) */
export function calculateHanFuScore(han: number, fu: number): HanFuScore {
  const raw = fu * Math.pow(2, han + 2);
  const basePoints = Math.min(raw, MANGAN_BASE_POINTS);
  return {
    han,
    fu,
    basePoints,
    isMangan: raw >= MANGAN_BASE_POINTS,
    dealerRon: roundUpToHundred(basePoints * 6),
    dealerTsumoEach: roundUpToHundred(basePoints * 2),
    nonDealerRon: roundUpToHundred(basePoints * 4),
    nonDealerTsumoFromDealer: roundUpToHundred(basePoints * 2),
    nonDealerTsumoFromOther: roundUpToHundred(basePoints * 1),
  };
}

export const HAN_COLUMNS = [1, 2, 3, 4] as const;
export const FU_ROWS = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110] as const;

export type FixedScoreRow = {
  key: string;
  label: string;
  hanRange: string;
  nonDealerTotal: number;
  dealerTotal: number;
};

/** 5翻以上(および頭打ち)は符に関係なく翻のみで決まる固定点数 */
export const FIXED_SCORES: FixedScoreRow[] = [
  { key: "mangan", label: "満貫", hanRange: "5翻(4翻以下でも頭打ちする場合あり)", nonDealerTotal: 8000, dealerTotal: 12000 },
  { key: "haneman", label: "跳満", hanRange: "6〜7翻", nonDealerTotal: 12000, dealerTotal: 18000 },
  { key: "baiman", label: "倍満", hanRange: "8〜10翻", nonDealerTotal: 16000, dealerTotal: 24000 },
  { key: "sanbaiman", label: "三倍満", hanRange: "11〜12翻", nonDealerTotal: 24000, dealerTotal: 36000 },
  { key: "yakuman", label: "役満", hanRange: "13翻〜", nonDealerTotal: 32000, dealerTotal: 48000 },
];

export type FuComponent = {
  key: string;
  label: string;
  points: string;
  note?: string;
};

/** 符計算の各加算要素。合計を10符単位で切り上げたものがその手の符になる */
export const FU_COMPONENTS: FuComponent[] = [
  { key: "base", label: "副底(基本点)", points: "20符" },
  { key: "menzen_ron", label: "門前加符", points: "+10符", note: "鳴きなし(門前)でロン和了した場合のみ" },
  { key: "tsumo", label: "ツモ符", points: "+2符", note: "ピンフツモの場合は加算しない" },
  { key: "wait_bad", label: "待ちの形: 辺張・嵌張・単騎", points: "+2符" },
  { key: "wait_good", label: "待ちの形: 両面・シャンポン", points: "+0符" },
  { key: "pair_yakuhai", label: "雀頭が役牌(三元牌・自風・場風)", points: "+2符" },
  { key: "triplet_open_simple", label: "明刻(数牌)", points: "+2符" },
  { key: "triplet_open_terminal", label: "明刻(幺九牌: 1・9・字牌)", points: "+4符" },
  { key: "triplet_closed_simple", label: "暗刻(数牌)", points: "+4符" },
  { key: "triplet_closed_terminal", label: "暗刻(幺九牌)", points: "+8符" },
  { key: "kan_open_simple", label: "明槓(数牌)", points: "+8符" },
  { key: "kan_open_terminal", label: "明槓(幺九牌)", points: "+16符" },
  { key: "kan_closed_simple", label: "暗槓(数牌)", points: "+16符" },
  { key: "kan_closed_terminal", label: "暗槓(幺九牌)", points: "+32符" },
];

export type FuSpecialCase = {
  key: string;
  label: string;
  points: number;
  note: string;
};

/** 積み上げ計算ではなく符が固定される代表的な例外 */
export const FU_SPECIAL_CASES: FuSpecialCase[] = [
  { key: "chiitoitsu", label: "七対子", points: 25, note: "積み上げ計算をせず常に25符固定" },
  { key: "pinfu_tsumo", label: "平和(ピンフ)+ツモ", points: 20, note: "副底20符のみ(ツモ符・待ち符は加算しない)" },
  { key: "pinfu_ron", label: "平和(ピンフ)+ロン", points: 30, note: "副底20符+門前加符10符" },
];
