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

  describe("副露", () => {
    it("中ポン+役牌: 1翻30符(鳴きはメンゼン加符なし)", () => {
      const r = evaluateHand(
        input("234m567p78s55m", "9s", { melds: [{ kind: "pon", tile: "中" }] })
      );
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.yaku.map((y) => y.name)).toEqual(["役牌(中)"]);
        expect(r.han).toBe(1);
        expect(r.fu).toBe(30);
        expect(r.payment).toEqual({ kind: "ron", total: 1000 });
      }
    });

    it("暗槓はメンゼン扱いでリーチ可: 暗槓(幺九)32符+単騎で70符", () => {
      const r = evaluateHand(
        input("234p567p789s5m", "5m", { riichi: true, melds: [{ kind: "ankan", tile: "1m" }] })
      );
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.fu).toBe(70);
        expect(r.payment).toEqual({ kind: "ron", total: 2300 });
      }
    });

    it("明槓の符は暗槓の半分(幺九牌の明槓16符)", () => {
      const r = evaluateHand(
        input("234m567p789s5m", "5m", {
          winType: "tsumo",
          rinshan: true,
          melds: [{ kind: "minkan", tile: "中" }],
        })
      );
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.yaku.map((y) => y.name).sort()).toEqual(["嶺上開花", "役牌(中)"].sort());
        expect(r.han).toBe(2);
        expect(r.fu).toBe(40);
        expect(r.payment).toMatchObject({ kind: "tsumo", fromDealer: 1300, fromOthers: 700 });
      }
    });

    it("鳴いた清一色は5翻(門前6翻より1翻下がる)", () => {
      const r = evaluateHand(
        input("234m567m11m78m", "9m", { melds: [{ kind: "chi", tile: "7m" }] })
      );
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.yaku.map((y) => y.name)).toContain("清一色");
        expect(r.yaku.find((y) => y.name === "清一色")?.han).toBe(5);
      }
    });

    it("鳴き平和形はロンでも30符に引き上げる", () => {
      const r = evaluateHand(
        input("234m567p67s55m", "8s", { melds: [{ kind: "chi", tile: "2p" }] })
      );
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.yaku.map((y) => y.name)).toEqual(["断幺九"]);
        expect(r.fu).toBe(30);
      }
    });

    it("鳴いているのにリーチするとエラー", () => {
      const r = evaluateHand(
        input("234m567p78s55m", "9s", { riichi: true, melds: [{ kind: "pon", tile: "中" }] })
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors[0]).toContain("リーチ");
    });

    it("副露を含む手牌枚数の不足・超過を検出する", () => {
      const few = evaluateHand(input("234m567p", "9s", { melds: [{ kind: "pon", tile: "中" }] }));
      expect(few.ok).toBe(false);
      const many = evaluateHand(input("123m456p789s11z1s", "2s", { melds: [{ kind: "pon", tile: "中" }] }));
      expect(many.ok).toBe(false);
    });

    it("チーできない牌(8・9・字牌始まり)はエラー", () => {
      const r = evaluateHand(input("234m567p78s55m", "9s", { melds: [{ kind: "chi", tile: "8m" }] }));
      expect(r.ok).toBe(false);
    });

    it("副露込みで同じ牌が5枚あるとエラー", () => {
      const r = evaluateHand(input("234m567p78s1m1m", "9s", { melds: [{ kind: "ankan", tile: "1m" }] }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors[0]).toContain("5枚以上");
    });

    it("四槓子は役満", () => {
      const r = evaluateHand(
        input("5m", "5m", {
          winType: "tsumo",
          melds: [
            { kind: "ankan", tile: "1m" },
            { kind: "ankan", tile: "2p" },
            { kind: "minkan", tile: "3s" },
            { kind: "minkan", tile: "東" },
          ],
        })
      );
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.yaku.map((y) => y.name)).toContain("四槓子");
    });
  });

  describe("状況役", () => {
    const base = "234m567p678s34p55m";

    it("槍槓: +1翻(平和+断幺九+槍槓 = 3翻30符 3900点)", () => {
      const r = evaluateHand(input(base, "2p", { chankan: true }));
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.yaku.map((y) => y.name)).toContain("槍槓");
        expect(r.han).toBe(3);
        expect(r.payment).toEqual({ kind: "ron", total: 3900 });
      }
    });

    it("海底摸月(ツモ)・河底撈魚(ロン)", () => {
      const tsumo = evaluateHand(input(base, "2p", { winType: "tsumo", lastTile: true }));
      expect(tsumo.ok && tsumo.yaku.map((y) => y.name)).toContain("海底摸月");
      if (tsumo.ok) expect(tsumo.han).toBe(4);
      const ron = evaluateHand(input(base, "2p", { lastTile: true }));
      expect(ron.ok && ron.yaku.map((y) => y.name)).toContain("河底撈魚");
    });

    it("ダブルリーチは2翻(リーチと重複しない)", () => {
      const r = evaluateHand(input(base, "2p", { doubleRiichi: true }));
      expect(r.ok).toBe(true);
      if (r.ok) {
        const names = r.yaku.map((y) => y.name);
        expect(names).toContain("ダブルリーチ");
        expect(names).not.toContain("リーチ");
        expect(r.han).toBe(4);
      }
    });

    it("天和(親)・地和(子)は役満", () => {
      const tenhou = evaluateHand(
        input(base, "2p", { winType: "tsumo", isDealer: true, heavenEarth: true })
      );
      expect(tenhou.ok).toBe(true);
      if (tenhou.ok) {
        expect(tenhou.yaku[0].name).toBe("天和");
        expect(tenhou.payment).toMatchObject({ kind: "tsumo", total: 48000 });
      }
      const chiihou = evaluateHand(input(base, "2p", { winType: "tsumo", heavenEarth: true }));
      expect(chiihou.ok && chiihou.yaku[0].name).toBe("地和");
    });

    it("七対子にも状況役が付く", () => {
      const r = evaluateHand(input("1133m5577p9922s4s", "4s", { winType: "tsumo", lastTile: true }));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.han).toBe(4);
    });

    it("条件を満たさない状況役はエラー", () => {
      expect(evaluateHand(input(base, "2p", { rinshan: true })).ok).toBe(false);
      expect(evaluateHand(input(base, "2p", { winType: "tsumo", chankan: true })).ok).toBe(false);
      expect(evaluateHand(input(base, "2p", { heavenEarth: true })).ok).toBe(false);
      expect(
        evaluateHand(input(base, "2p", { winType: "tsumo", rinshan: true, lastTile: true, melds: [] })).ok
      ).toBe(false);
    });
  });
});
