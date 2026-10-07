/**
 * 標準的なリーチ麻雀の符計算・翻符点数表(仕様外の一般知識としてのLEARN表示用)。
 *
 * このファイルの値はGroupRule(ウマ・オカ・チップ等)とは無関係の、
 * 「役+符から何点になるか」という麻雀の基本ルールそのものを説明するための
 * 静的な参照データ/純粋関数。scoreEngine.ts(対局結果からランキングポイントを
 * 算出するロジック)とは目的が異なるため、あえて分離している。
 */

import type { DeclaredMeld } from "./handScore";
import type { TileCode, TileGroup } from "./tiles";

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
  /** どうやったらこの符が付くか(条件の説明) */
  how: string;
  /** 該当する牌の形の例(牌コードのグループ配列) */
  example?: TileGroup[];
  exampleNote?: string;
};

const T3 = (c: TileCode): TileGroup => [c, c, c];
const T4 = (c: TileCode): TileGroup => [c, c, c, c];

/** 符計算の各加算要素。合計を10符単位で切り上げたものがその手の符になる */
export const FU_COMPONENTS: FuComponent[] = [
  {
    key: "base",
    label: "副底(基本点)",
    points: "20符",
    how: "どんな和了でも、まず20符からスタートします。",
  },
  {
    key: "menzen_ron",
    label: "門前加符",
    points: "+10符",
    note: "鳴きなし(門前)でロン和了した場合のみ",
    how: "チー・ポン・明槓をせず(暗槓はOK)、他家の捨て牌でロン和了したときに付きます。ツモ和了や、鳴いた手には付きません。",
    example: [["2m", "3m", "4m"], ["5p", "6p", "7p"], ["3s", "4s", "5s"], ["7s", "8s", "9s"], ["5m", "5m"]],
    exampleNote: "鳴かずに完成させ、ロンで和了",
  },
  {
    key: "tsumo",
    label: "ツモ符",
    points: "+2符",
    note: "ピンフツモの場合は加算しない",
    how: "自分でツモ和了したときに付きます(鳴いていても付く)。ただし平和のツモ和了だけは付きません。",
    example: [["2m", "3m", "4m"], ["5p", "6p", "7p"], ["3s", "4s", "5s"], ["7s", "8s", "9s"], ["5m", "5m"]],
    exampleNote: "同じ形でも、ロンなら+10符・ツモなら+2符",
  },
  {
    key: "wait_bad",
    label: "待ちの形: 辺張・嵌張・単騎",
    points: "+2符",
    how: "最後の1枚で完成した待ちの形が、ひと通りの牌でしか完成しない形のときに付きます。",
    example: [["1m", "2m"], ["4s", "6s"], ["5p"]],
    exampleNote: "左から 辺張(3萬待ち)・嵌張(5索待ち)・単騎(5筒待ち)",
  },
  {
    key: "wait_good",
    label: "待ちの形: 両面・シャンポン",
    points: "+0符",
    how: "2種類の牌で完成する待ち(両面・シャンポン)は符が付きません。",
    example: [["4p", "5p"], ["7m", "7m"], ["8m", "8m"]],
    exampleNote: "両面(3筒・6筒待ち)・シャンポン(7萬・8萬待ち)",
  },
  {
    key: "pair_yakuhai",
    label: "雀頭が役牌(三元牌・自風・場風)",
    points: "+2符",
    note: "場風と自風が同じ牌の雀頭(連風牌)は+4符",
    how: "雀頭(2枚1組)が、白・發・中のいずれか、またはその局の場風・自風の牌のときに付きます。",
    example: [["中", "中"], ["東", "東"]],
    exampleNote: "東場の東家なら、東の雀頭は場風+自風で+4符",
  },
  {
    key: "triplet_open_simple",
    label: "明刻(数牌)",
    points: "+2符",
    how: "ポンした刻子(同じ牌3枚)。また、ロンで最後の1枚が揃って完成した刻子も「明刻」として数えます。2〜8の数牌。",
    example: [T3("5m")],
  },
  {
    key: "triplet_open_terminal",
    label: "明刻(幺九牌: 1・9・字牌)",
    points: "+4符",
    how: "ポンした刻子、またはロンで完成した刻子のうち、1・9・字牌のもの。",
    example: [T3("9p"), T3("東")],
  },
  {
    key: "triplet_closed_simple",
    label: "暗刻(数牌)",
    points: "+4符",
    how: "鳴かずに手の中で自分で揃えた刻子(ツモで完成した刻子を含む)。2〜8の数牌。",
    example: [T3("3s")],
  },
  {
    key: "triplet_closed_terminal",
    label: "暗刻(幺九牌)",
    points: "+8符",
    how: "鳴かずに手の中で揃えた刻子のうち、1・9・字牌のもの。符としては最も大きい通常の刻子です。",
    example: [T3("1m"), T3("白")],
  },
  {
    key: "kan_open_simple",
    label: "明槓(数牌)",
    points: "+8符",
    how: "他家の捨て牌をカンした(または、ポンした刻子に1枚足した)槓子。2〜8の数牌。",
    example: [T4("5s")],
  },
  {
    key: "kan_open_terminal",
    label: "明槓(幺九牌)",
    points: "+16符",
    how: "明槓した槓子のうち、1・9・字牌のもの。",
    example: [T4("9m")],
  },
  {
    key: "kan_closed_simple",
    label: "暗槓(数牌)",
    points: "+16符",
    how: "自分で4枚を揃えて暗槓した槓子(門前のまま)。2〜8の数牌。",
    example: [T4("4p")],
  },
  {
    key: "kan_closed_terminal",
    label: "暗槓(幺九牌)",
    points: "+32符",
    how: "暗槓した槓子のうち、1・9・字牌のもの。1つで32符になる最大の加符です。",
    example: [T4("1s")],
  },
];

export type FuSpecialCase = {
  key: string;
  label: string;
  points: number;
  note: string;
  example?: TileGroup[];
  exampleNote?: string;
};

/** 積み上げ計算ではなく符が固定される代表的な例外 */
export const FU_SPECIAL_CASES: FuSpecialCase[] = [
  {
    key: "chiitoitsu",
    label: "七対子",
    points: 25,
    note: "積み上げ計算をせず常に25符固定",
    example: [["1m", "1m"], ["3m", "3m"], ["5p", "5p"], ["7p", "7p"], ["9s", "9s"], ["2s", "2s"], ["東", "東"]],
    exampleNote: "7組の対子で和了。ツモでもロンでも25符",
  },
  {
    key: "pinfu_tsumo",
    label: "平和(ピンフ)+ツモ",
    points: 20,
    note: "副底20符のみ(ツモ符・待ち符は加算しない)",
    example: [["2m", "3m", "4m"], ["5p", "6p", "7p"], ["3s", "4s", "5s"], ["7s", "8s", "9s"], ["5m", "5m"]],
    exampleNote: "順子4組・役牌でない雀頭・両面待ち、でツモ和了",
  },
  {
    key: "pinfu_ron",
    label: "平和(ピンフ)+ロン",
    points: 30,
    note: "副底20符+門前加符10符",
    example: [["2m", "3m", "4m"], ["5p", "6p", "7p"], ["3s", "4s", "5s"], ["7s", "8s", "9s"], ["5m", "5m"]],
    exampleNote: "同じ形でロン和了なら30符",
  },
];

export type FuWorkedExample = {
  key: string;
  title: string;
  /** 画面に表示する手牌(面子・雀頭・待ちのまとまり)。鳴いた面子は called に分ける */
  groups: TileGroup[];
  called?: TileGroup[];
  agari: TileCode;
  winType: "tsumo" | "ron";
  condition: string;
  breakdown: { label: string; fu: number }[];
  total: number;
  /** この例が実際に総符になることをテストで検証するための計算エンジン入力 */
  engine: { hand: TileCode[]; melds?: DeclaredMeld[] };
};

/** 符を積み上げて合計する流れの実例(各例の総符は計算エンジンと一致することをテストで確認している) */
export const FU_WORKED_EXAMPLES: FuWorkedExample[] = [
  {
    key: "closed_tsumo_ankou",
    title: "暗刻あり・嵌張待ちのツモ",
    groups: [
      ["1m", "1m", "1m"],
      ["7s", "8s", "9s"],
      ["2s", "3s", "4s"],
      ["5m", "5m"],
      ["4p", "6p"],
    ],
    agari: "5p",
    winType: "tsumo",
    condition: "門前・ツモ和了(5筒を引いて嵌張が埋まる)",
    breakdown: [
      { label: "副底", fu: 20 },
      { label: "ツモ符", fu: 2 },
      { label: "暗刻(1萬・幺九牌)", fu: 8 },
      { label: "嵌張待ち", fu: 2 },
    ],
    total: 40,
    engine: {
      hand: ["1m", "1m", "1m", "7s", "8s", "9s", "2s", "3s", "4s", "5m", "5m", "4p", "6p"],
    },
  },
  {
    key: "open_pon_ron",
    title: "中をポンして役牌・両面待ちのロン",
    groups: [
      ["2m", "3m", "4m"],
      ["5p", "6p", "7p"],
      ["7s", "8s"],
      ["5m", "5m"],
    ],
    called: [["中", "中", "中"]],
    agari: "9s",
    winType: "ron",
    condition: "中をポンして鳴き手に。ロン和了(門前加符なし)",
    breakdown: [
      { label: "副底", fu: 20 },
      { label: "明刻(中・幺九牌)", fu: 4 },
      { label: "両面待ち", fu: 0 },
    ],
    total: 30,
    engine: {
      hand: ["2m", "3m", "4m", "5p", "6p", "7p", "7s", "8s", "5m", "5m"],
      melds: [{ kind: "pon", tile: "中" }],
    },
  },
  {
    key: "closed_ron_shanpon",
    title: "シャンポンのロンは暗刻が明刻になる",
    groups: [
      ["1m", "1m", "1m"],
      ["9p", "9p", "9p"],
      ["2s", "2s", "2s"],
      ["中", "中"],
      ["5m", "5m"],
    ],
    agari: "5m",
    winType: "ron",
    condition: "門前・ロン和了(5萬でロン→中と5萬のシャンポン待ち)",
    breakdown: [
      { label: "副底", fu: 20 },
      { label: "門前加符", fu: 10 },
      { label: "暗刻(1萬・幺九牌)", fu: 8 },
      { label: "暗刻(9筒・幺九牌)", fu: 8 },
      { label: "暗刻(2索・数牌)", fu: 4 },
      { label: "明刻(5萬・ロンで完成)", fu: 2 },
      { label: "雀頭が役牌(中)", fu: 2 },
    ],
    total: 60,
    engine: {
      hand: ["1m", "1m", "1m", "9p", "9p", "9p", "2s", "2s", "2s", "中", "中", "5m", "5m"],
    },
  },
];
