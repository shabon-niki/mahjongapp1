import { describe, it, expect } from "vitest";
import { evaluateHand, indexToCode, type HandInput } from "../handScore";
import type { TileCode } from "../tiles";

const HONOR_BY_DIGIT = ["東", "南", "西", "北", "白", "發", "中"];

/** "123m456p789s11z" 形式を牌コード配列にする(z: 1東2南3西4北5白6發7中) */
function t(str: string): TileCode[] {
  const out: TileCode[] = [];
  for (const m of str.matchAll(/([1-9]+)([mpsz])/g)) {
    for (const d of m[1]) out.push(m[2] === "z" ? HONOR_BY_DIGIT[Number(d) - 1] : `${d}${m[2]}`);
  }
  return out;
}

function input(hand: string, agari: string, over: Partial<HandInput> = {}): HandInput {
  return {
    hand: t(hand),
    agari: t(agari)[0],
    winType: "ron",
    riichi: false,
    ippatsu: false,
    isDealer: false,
    roundWind: "east",
    seatWind: "south",
    dora: 0,
    ...over,
  };
}

describe("evaluateHand", () => {
  it("平和のみロン: 1翻30符 = 1000点", () => {
    const r = evaluateHand(input("123m456m789p55p23s", "1s"));
    expect(r.ok && r.han).toBe(1);
    if (r.ok) {
      expect(r.fu).toBe(30);
      expect(r.payment).toEqual({ kind: "ron", total: 1000 });
      expect(r.yaku.map((y) => y.name)).toEqual(["平和"]);
    }
  });

  it("平和ツモ: 2翻20符 子 400/700", () => {
    const r = evaluateHand(input("123m456m789p55p23s", "1s", { winType: "tsumo" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.han).toBe(2);
      expect(r.fu).toBe(20);
      expect(r.payment).toMatchObject({ kind: "tsumo", fromDealer: 700, fromOthers: 400, total: 1500 });
    }
  });

  it("七対子ロン: 2翻25符 = 1600点", () => {
    const r = evaluateHand(input("1133m5577p9922s4s", "4s"));
    // 手牌13枚 = 1133m(4) 5577p(4) 9922s(4) 4s(1)
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.han).toBe(2);
      expect(r.fu).toBe(25);
      expect(r.payment).toEqual({ kind: "ron", total: 1600 });
    }
  });

  it("国士無双ロン(子): 32000点", () => {
    const r = evaluateHand(input("19m19p19s1234567z", "1m"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.yakumanCount).toBe(1);
      expect(r.limitName).toBe("役満");
      expect(r.payment).toEqual({ kind: "ron", total: 32000 });
    }
  });

  it("親のリーチ・ツモ・タンヤオ・平和: 満貫以下でも親ツモは全員同額", () => {
    const r = evaluateHand(
      input("234m567p678s34p55m", "2p", { winType: "tsumo", riichi: true, isDealer: true, seatWind: "east" })
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.yaku.map((y) => y.name)).toEqual(
        expect.arrayContaining(["リーチ", "門前清自摸和", "平和", "断幺九"])
      );
      expect(r.han).toBe(4);
      expect(r.fu).toBe(20);
      expect(r.payment).toMatchObject({ kind: "tsumo", dealerWin: true, each: 2600, total: 7800 });
    }
  });

  it("役なし(嵌張待ちで平和にならない): エラー", () => {
    const r = evaluateHand(input("123m456p789s55p13s", "2s"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain("役がありません");
  });

  it("役なしでもドラでは和了できない", () => {
    const r = evaluateHand(input("123m456p789s55p13s", "2s", { dora: 3 }));
    expect(r.ok).toBe(false);
  });

  it("四暗刻ツモ(単騎): 役満", () => {
    const r = evaluateHand(input("111m999p222s777z5m", "5m", { winType: "tsumo" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.yakumanCount).toBe(1);
      expect(r.yaku[0].name).toBe("四暗刻");
    }
  });

  it("対々和+三暗刻(シャンポンロンは明刻扱い): 4翻60符 満貫", () => {
    const r = evaluateHand(input("111m999p222s77z55m", "5m"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.yaku.map((y) => y.name).sort()).toEqual(["三暗刻", "対々和"].sort());
      expect(r.han).toBe(4);
      expect(r.fu).toBe(60);
      expect(r.limitName).toBe("満貫");
      expect(r.payment).toEqual({ kind: "ron", total: 8000 });
    }
  });

  it("牌数不足でエラー", () => {
    const r = evaluateHand({ ...input("123m456p", "1s") });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain("あと");
  });

  it("和了牌が未選択でエラー", () => {
    const r = evaluateHand({ ...input("123m456m789p55p23s", "1s"), agari: null });
    expect(r.ok).toBe(false);
  });

  it("同じ牌5枚でエラー", () => {
    const r = evaluateHand(input("1111m456m789p55p1s", "1m"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain("5枚以上");
  });

  it("和了形でなければエラー", () => {
    const r = evaluateHand(input("1357m2468p13579s", "9m"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain("和了の形");
  });

  it("リーチ+タンヤオ+ドラ3で跳満(6翻)", () => {
    const r = evaluateHand(input("234m567p678s34p55m", "2p", { riichi: true, dora: 3 }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.han).toBe(6);
      expect(r.limitName).toBe("跳満");
      expect(r.payment).toEqual({ kind: "ron", total: 12000 });
    }
  });

  it("混一色+役牌(中)+一気通貫 = 6翻", () => {
    const r = evaluateHand(input("123m456m789m777z5m", "5m"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const names = r.yaku.map((y) => y.name);
      expect(names).toContain("混一色");
      expect(names).toContain("役牌(中)");
      expect(names).toContain("一気通貫");
      expect(r.han).toBe(6);
    }
  });

  it("indexToCodeは牌コードに戻せる", () => {
    expect(indexToCode(0)).toBe("1m");
    expect(indexToCode(26)).toBe("9s");
    expect(indexToCode(33)).toBe("中");
  });
});
