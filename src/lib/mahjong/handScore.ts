/**
 * 手牌(門前・副露なし)から役・符・点数を求める点数計算エンジン。
 * 13枚の手牌 + 和了牌1枚を受け取り、考えられる面子分解と待ちの取り方をすべて試して
 * 最も高い点数になる解釈を採用する(標準的な日本麻雀のルール)。
 * 対応外: 副露(チー・ポン・カン)、ダブルリーチ・海底・嶺上などの状況役。
 */

import type { TileCode } from "./tiles";

export type Wind = "east" | "south" | "west" | "north";
export type WinType = "tsumo" | "ron";

export type HandInput = {
  /** 手牌13枚(和了牌は含めない) */
  hand: TileCode[];
  agari: TileCode | null;
  winType: WinType;
  riichi: boolean;
  ippatsu: boolean;
  isDealer: boolean;
  roundWind: Wind;
  seatWind: Wind;
  /** ドラ・裏ドラ・赤ドラの合計枚数 */
  dora: number;
};

export type YakuItem = { name: string; han: number; yakuman?: boolean };

export type Payment =
  | { kind: "ron"; total: number }
  | {
      kind: "tsumo";
      /** 親のツモ和了(全員が each ずつ払う)か */
      dealerWin: boolean;
      each: number;
      fromDealer: number;
      fromOthers: number;
      total: number;
    };

export type HandEvaluation =
  | {
      ok: true;
      yaku: YakuItem[];
      dora: number;
      han: number;
      fu: number;
      yakumanCount: number;
      /** 満貫・跳満など。該当しなければ null */
      limitName: string | null;
      payment: Payment;
      agari: TileCode;
      waitName: string;
    }
  | { ok: false; errors: string[] };

const HONORS = ["東", "南", "西", "北", "白", "發", "中"] as const;
const WIND_INDEX: Record<Wind, number> = { east: 27, south: 28, west: 29, north: 30 };

export function codeToIndex(code: TileCode): number {
  const m = code.match(/^([1-9])([mps])$/);
  if (m) return { m: 0, p: 9, s: 18 }[m[2] as "m" | "p" | "s"] + Number(m[1]) - 1;
  const h = (HONORS as readonly string[]).indexOf(code);
  if (h < 0) throw new Error(`不明な牌: ${code}`);
  return 27 + h;
}

export function indexToCode(i: number): TileCode {
  if (i < 27) return `${(i % 9) + 1}${["m", "p", "s"][Math.floor(i / 9)]}`;
  return HONORS[i - 27];
}

const isHonor = (i: number) => i >= 27;
const isTerminal = (i: number) => i < 27 && (i % 9 === 0 || i % 9 === 8);
const isYaochu = (i: number) => isHonor(i) || isTerminal(i);
const isDragon = (i: number) => i >= 31;
const suitOf = (i: number) => (i < 27 ? Math.floor(i / 9) : 3);
const GREEN = new Set([19, 20, 21, 23, 25, 32]);

type Meld = { kind: "seq" | "tri"; start: number };
type Decomp = { pair: number; melds: Meld[] };

function extractMelds(c: number[], from: number): Meld[][] {
  let i = from;
  while (i < 34 && c[i] === 0) i++;
  if (i >= 34) return [[]];
  const res: Meld[][] = [];
  if (c[i] >= 3) {
    c[i] -= 3;
    for (const rest of extractMelds(c, i)) res.push([{ kind: "tri", start: i }, ...rest]);
    c[i] += 3;
  }
  if (i < 27 && i % 9 <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
    c[i]--;
    c[i + 1]--;
    c[i + 2]--;
    for (const rest of extractMelds(c, i)) res.push([{ kind: "seq", start: i }, ...rest]);
    c[i]++;
    c[i + 1]++;
    c[i + 2]++;
  }
  return res;
}

function decompose(counts: number[]): Decomp[] {
  const out: Decomp[] = [];
  for (let p = 0; p < 34; p++) {
    if (counts[p] < 2) continue;
    const c = counts.slice();
    c[p] -= 2;
    for (const melds of extractMelds(c, 0)) out.push({ pair: p, melds });
  }
  return out;
}

type WaitKind = "ryanmen" | "kanchan" | "penchan" | "shanpon" | "tanki";
type Interp = { kind: WaitKind; meldIdx: number };

const WAIT_NAMES: Record<WaitKind, string> = {
  ryanmen: "両面待ち",
  kanchan: "嵌張待ち",
  penchan: "辺張待ち",
  shanpon: "シャンポン待ち",
  tanki: "単騎待ち",
};

function interpretations(d: Decomp, w: number): Interp[] {
  const res: Interp[] = [];
  if (d.pair === w) res.push({ kind: "tanki", meldIdx: -1 });
  d.melds.forEach((m, mi) => {
    if (m.kind === "tri") {
      if (m.start === w) res.push({ kind: "shanpon", meldIdx: mi });
      return;
    }
    if (w < m.start || w > m.start + 2) return;
    if (w === m.start + 1) res.push({ kind: "kanchan", meldIdx: mi });
    else if (w === m.start) res.push({ kind: m.start % 9 === 6 ? "penchan" : "ryanmen", meldIdx: mi });
    else res.push({ kind: m.start % 9 === 0 ? "penchan" : "ryanmen", meldIdx: mi });
  });
  return res;
}

type Candidate = {
  yaku: YakuItem[];
  yakumanCount: number;
  han: number;
  fu: number;
  wait: WaitKind;
  payment: Payment;
  limitName: string | null;
  score: number;
};

const ceil100 = (n: number) => Math.ceil(n / 100) * 100;
const ceil10 = (n: number) => Math.ceil(n / 10) * 10;

function limitInfo(han: number, fu: number, yakumanCount: number) {
  if (yakumanCount > 0) {
    return {
      base: 8000 * yakumanCount,
      name: yakumanCount === 1 ? "役満" : `${yakumanCount}倍役満`,
    };
  }
  if (han >= 13) return { base: 8000, name: "数え役満" };
  if (han >= 11) return { base: 6000, name: "三倍満" };
  if (han >= 8) return { base: 4000, name: "倍満" };
  if (han >= 6) return { base: 3000, name: "跳満" };
  const raw = fu * Math.pow(2, han + 2);
  if (han >= 5 || raw >= 2000) return { base: 2000, name: "満貫" };
  return { base: raw, name: null };
}

function paymentFor(base: number, isDealer: boolean, winType: WinType): Payment {
  if (winType === "ron") return { kind: "ron", total: ceil100(base * (isDealer ? 6 : 4)) };
  if (isDealer) {
    const each = ceil100(base * 2);
    return { kind: "tsumo", dealerWin: true, each, fromDealer: each, fromOthers: each, total: each * 3 };
  }
  const fromDealer = ceil100(base * 2);
  const fromOthers = ceil100(base);
  return {
    kind: "tsumo",
    dealerWin: false,
    each: fromOthers,
    fromDealer,
    fromOthers,
    total: fromDealer + fromOthers * 2,
  };
}

function finalize(
  yaku: YakuItem[],
  fu: number,
  wait: WaitKind,
  input: HandInput
): Candidate | null {
  const yakumanItems = yaku.filter((y) => y.yakuman);
  const yakumanCount = yakumanItems.length;
  const normal = yaku.filter((y) => !y.yakuman);
  if (yakumanCount === 0 && normal.length === 0) return null;

  const han =
    yakumanCount > 0 ? 0 : normal.reduce((s, y) => s + y.han, 0) + Math.max(0, input.dora);
  const limit = limitInfo(han, fu, yakumanCount);
  const payment = paymentFor(limit.base, input.isDealer, input.winType);
  return {
    yaku: yakumanCount > 0 ? yakumanItems : normal,
    yakumanCount,
    han,
    fu,
    wait,
    payment,
    limitName: limit.name,
    score: payment.total,
  };
}

function evaluateStandard(
  d: Decomp,
  interp: Interp,
  counts: number[],
  input: HandInput
): Candidate | null {
  const ron = input.winType === "ron";
  const roundIdx = WIND_INDEX[input.roundWind];
  const seatIdx = WIND_INDEX[input.seatWind];

  const melds = d.melds.map((m, i) => ({
    ...m,
    open: ron && interp.kind === "shanpon" && interp.meldIdx === i,
  }));
  const seqs = melds.filter((m) => m.kind === "seq");
  const tris = melds.filter((m) => m.kind === "tri");
  const used = counts.map((c, i) => (c > 0 ? i : -1)).filter((i) => i >= 0);
  const hasHonor = used.some(isHonor);

  const yaku: YakuItem[] = [];

  // ---- 役満 ----
  const dragonTris = tris.filter((t) => isDragon(t.start)).length;
  const windTris = tris.filter((t) => t.start >= 27 && t.start <= 30).length;
  if (dragonTris === 3) yaku.push({ name: "大三元", han: 13, yakuman: true });
  if (windTris === 4) yaku.push({ name: "大四喜", han: 13, yakuman: true });
  else if (windTris === 3 && d.pair >= 27 && d.pair <= 30)
    yaku.push({ name: "小四喜", han: 13, yakuman: true });
  if (tris.length === 4 && tris.every((t) => !t.open))
    yaku.push({ name: "四暗刻", han: 13, yakuman: true });
  if (used.every(isHonor)) yaku.push({ name: "字一色", han: 13, yakuman: true });
  if (used.every(isTerminal)) yaku.push({ name: "清老頭", han: 13, yakuman: true });
  if (used.every((i) => GREEN.has(i))) yaku.push({ name: "緑一色", han: 13, yakuman: true });
  if (!hasHonor && new Set(used.map(suitOf)).size === 1) {
    const base = suitOf(used[0]) * 9;
    const ok =
      counts[base] >= 3 &&
      counts[base + 8] >= 3 &&
      [1, 2, 3, 4, 5, 6, 7].every((k) => counts[base + k] >= 1);
    if (ok) yaku.push({ name: "九蓮宝燈", han: 13, yakuman: true });
  }
  if (yaku.some((y) => y.yakuman)) return finalize(yaku, 30, interp.kind, input);

  // ---- 通常役 ----
  const pairIsYakuhai = isDragon(d.pair) || d.pair === roundIdx || d.pair === seatIdx;
  const pinfu =
    tris.length === 0 && !pairIsYakuhai && interp.kind === "ryanmen";

  if (input.riichi) {
    yaku.push({ name: "リーチ", han: 1 });
    if (input.ippatsu) yaku.push({ name: "一発", han: 1 });
  }
  if (!ron) yaku.push({ name: "門前清自摸和", han: 1 });
  if (pinfu) yaku.push({ name: "平和", han: 1 });
  if (used.every((i) => !isYaochu(i))) yaku.push({ name: "断幺九", han: 1 });

  const seqKey = seqs.map((s) => s.start).sort((a, b) => a - b);
  const pairs: number[] = [];
  const tmp = seqKey.slice();
  while (tmp.length) {
    const v = tmp.shift()!;
    const j = tmp.indexOf(v);
    if (j >= 0) {
      tmp.splice(j, 1);
      pairs.push(v);
    }
  }
  if (pairs.length === 2) yaku.push({ name: "二盃口", han: 3 });
  else if (pairs.length === 1) yaku.push({ name: "一盃口", han: 1 });

  for (const t of tris) {
    if (isDragon(t.start)) {
      yaku.push({ name: `役牌(${HONORS[t.start - 27]})`, han: 1 });
    } else {
      if (t.start === roundIdx) yaku.push({ name: "役牌(場風)", han: 1 });
      if (t.start === seatIdx) yaku.push({ name: "役牌(自風)", han: 1 });
    }
  }

  const rank = (s: number) => s % 9;
  if (
    [0, 1, 2, 3, 4, 5, 6].some((r) =>
      [0, 1, 2].every((su) => seqs.some((s) => suitOf(s.start) === su && rank(s.start) === r))
    )
  ) {
    yaku.push({ name: "三色同順", han: 2 });
  }
  if (
    [0, 1, 2].some((su) =>
      [0, 3, 6].every((r) => seqs.some((s) => suitOf(s.start) === su && rank(s.start) === r))
    )
  ) {
    yaku.push({ name: "一気通貫", han: 2 });
  }
  if (tris.length === 4) yaku.push({ name: "対々和", han: 2 });
  if (tris.filter((t) => !t.open).length === 3) yaku.push({ name: "三暗刻", han: 2 });
  if (
    [0, 1, 2, 3, 4, 5, 6, 7, 8].some((r) =>
      [0, 1, 2].every((su) => tris.some((t) => t.start === su * 9 + r))
    )
  ) {
    yaku.push({ name: "三色同刻", han: 2 });
  }
  if (dragonTris === 2 && isDragon(d.pair)) yaku.push({ name: "小三元", han: 2 });

  const allYaochuMelds =
    isYaochu(d.pair) &&
    melds.every((m) => (m.kind === "tri" ? isYaochu(m.start) : rank(m.start) === 0 || rank(m.start) === 6));
  const allTerminalMelds =
    isTerminal(d.pair) &&
    melds.every((m) => (m.kind === "tri" ? isTerminal(m.start) : rank(m.start) === 0 || rank(m.start) === 6));
  if (seqs.length === 0 && used.every(isYaochu)) {
    yaku.push({ name: "混老頭", han: 2 });
  } else if (seqs.length > 0 && allTerminalMelds) {
    yaku.push({ name: "純全帯幺九", han: 3 });
  } else if (seqs.length > 0 && allYaochuMelds) {
    yaku.push({ name: "混全帯幺九", han: 2 });
  }

  const suits = new Set(used.filter((i) => !isHonor(i)).map(suitOf));
  if (suits.size === 1) yaku.push(hasHonor ? { name: "混一色", han: 3 } : { name: "清一色", han: 6 });

  // ---- 符 ----
  let fu = 20;
  if (ron) fu += 10;
  else if (!pinfu) fu += 2;
  for (const t of melds.filter((m) => m.kind === "tri")) {
    const base = isYaochu(t.start) ? 4 : 2;
    fu += t.open ? base : base * 2;
  }
  if (isDragon(d.pair)) fu += 2;
  if (d.pair === roundIdx) fu += 2;
  if (d.pair === seatIdx) fu += 2;
  if (interp.kind === "kanchan" || interp.kind === "penchan" || interp.kind === "tanki") fu += 2;

  return finalize(yaku, ceil10(fu), interp.kind, input);
}

function evaluateChiitoitsu(counts: number[], input: HandInput): Candidate | null {
  const pairIdx = counts.map((c, i) => (c === 2 ? i : -1)).filter((i) => i >= 0);
  if (pairIdx.length !== 7) return null;
  const used = pairIdx;
  const yaku: YakuItem[] = [];
  if (used.every(isHonor)) return finalize([{ name: "字一色", han: 13, yakuman: true }], 25, "tanki", input);

  if (input.riichi) {
    yaku.push({ name: "リーチ", han: 1 });
    if (input.ippatsu) yaku.push({ name: "一発", han: 1 });
  }
  if (input.winType === "tsumo") yaku.push({ name: "門前清自摸和", han: 1 });
  yaku.push({ name: "七対子", han: 2 });
  if (used.every((i) => !isYaochu(i))) yaku.push({ name: "断幺九", han: 1 });
  if (used.every(isYaochu)) yaku.push({ name: "混老頭", han: 2 });
  const suits = new Set(used.filter((i) => !isHonor(i)).map(suitOf));
  const hasHonor = used.some(isHonor);
  if (suits.size === 1) yaku.push(hasHonor ? { name: "混一色", han: 3 } : { name: "清一色", han: 6 });
  return finalize(yaku, 25, "tanki", input);
}

function evaluateKokushi(counts: number[], input: HandInput): Candidate | null {
  const orphans = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
  if (!orphans.every((i) => counts[i] >= 1)) return null;
  if (counts.reduce((s, c) => s + c, 0) !== 14) return null;
  return finalize([{ name: "国士無双", han: 13, yakuman: true }], 30, "tanki", input);
}

/** 手牌13枚+和了牌1枚から最高点の解釈で点数を計算する。入力に誤りがあればerrorsを返す。 */
export function evaluateHand(input: HandInput): HandEvaluation {
  const errors: string[] = [];
  const total = input.hand.length + (input.agari ? 1 : 0);

  if (input.hand.length < 13) {
    errors.push(`手牌が${input.hand.length}枚です。あと${13 - input.hand.length}枚入力してください`);
  }
  if (!input.agari) errors.push("和了牌が選ばれていません");
  if (errors.length > 0) return { ok: false, errors };
  if (total !== 14) return { ok: false, errors: [`牌が${total}枚です。手牌13枚+和了牌1枚にしてください`] };

  const agari = input.agari as TileCode;
  const counts = new Array(34).fill(0) as number[];
  for (const t of [...input.hand, agari]) counts[codeToIndex(t)]++;
  const over = counts.findIndex((c) => c > 4);
  if (over >= 0) {
    return { ok: false, errors: [`同じ牌(${indexToCode(over)})が5枚以上あります。入力を確認してください`] };
  }

  const w = codeToIndex(agari);
  const candidates: Candidate[] = [];

  for (const d of decompose(counts)) {
    for (const interp of interpretations(d, w)) {
      const c = evaluateStandard(d, interp, counts, input);
      if (c) candidates.push(c);
    }
  }
  const chiitoi = evaluateChiitoitsu(counts, input);
  if (chiitoi) candidates.push(chiitoi);
  const kokushi = evaluateKokushi(counts, input);
  if (kokushi) candidates.push(kokushi);

  if (candidates.length === 0) {
    const hasShape =
      decompose(counts).length > 0 ||
      counts.filter((c) => c === 2).length === 7 ||
      [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33].every((i) => counts[i] >= 1);
    return {
      ok: false,
      errors: [
        hasShape
          ? "役がありません。役なしでは和了できません(ドラだけでは和了不可)"
          : "和了の形(4面子+1雀頭・七対子・国士無双)になっていません。牌を確認してください",
      ],
    };
  }

  candidates.sort((a, b) => b.score - a.score || b.han - a.han || b.fu - a.fu);
  const best = candidates[0];
  return {
    ok: true,
    yaku: best.yaku,
    dora: best.yakumanCount > 0 ? 0 : Math.max(0, input.dora),
    han: best.han,
    fu: best.fu,
    yakumanCount: best.yakumanCount,
    limitName: best.limitName,
    payment: best.payment,
    agari,
    waitName: WAIT_NAMES[best.wait],
  };
}
