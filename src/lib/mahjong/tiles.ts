/**
 * 麻雀牌の表現。
 * 実機/ブラウザ環境によって麻雀牌のUnicode文字(🀇🀈..等)が
 * 正しくレンダリングされない(🀄以外は文字化けする)ため、
 * 牌コードから実際の牌画像(public/tiles/)を表示する。
 */

export type TileCode = string; // "1m".."9m"(萬子) / "1s".."9s"(索子) / "1p".."9p"(筒子) / "東"|"南"|"西"|"北"|"中"|"發"|"白"

const KANJI_DIGITS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const SUIT_LABEL: Record<string, string> = { m: "萬", s: "索", p: "筒" };
const HONOR_IMAGE: Record<string, string> = {
  東: "east",
  南: "south",
  西: "west",
  北: "north",
  中: "chun",
  發: "hatsu",
  白: "haku",
};

export function tileLabel(code: TileCode): string {
  const m = code.match(/^([1-9])([msp])$/);
  if (m) {
    const [, num, suit] = m;
    return `${KANJI_DIGITS[Number(num)]}${SUIT_LABEL[suit]}`;
  }
  return code;
}

/** 牌コードから public/tiles/ 配下の画像パスを組み立てる */
export function tileImageSrc(code: TileCode): string {
  const m = code.match(/^([1-9])([msp])$/);
  if (m) {
    const [, num, suit] = m;
    return `/tiles/${suit}${num}.webp`;
  }
  return `/tiles/${HONOR_IMAGE[code] ?? "haku"}.webp`;
}

/** 役の例を表す牌グループ(1グループ=1面子/雀頭のまとまり) */
export type TileGroup = TileCode[];
