"use client";

import { useState } from "react";
import Image from "next/image";
import { tileImageSrc, tileLabel, type TileCode } from "@/lib/mahjong/tiles";
import {
  codeToIndex,
  declaredTiles,
  evaluateHand,
  indexToCode,
  type DeclaredMeld,
  type HandEvaluation,
  type Payment,
  type Wind,
} from "@/lib/mahjong/handScore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const SUITS: { label: string; codes: TileCode[] }[] = [
  { label: "萬子", codes: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m"] },
  { label: "筒子", codes: ["1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p"] },
  { label: "索子", codes: ["1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s"] },
  { label: "字牌", codes: ["東", "南", "西", "北", "白", "發", "中"] },
];

const WINDS: { value: Wind; label: string }[] = [
  { value: "east", label: "東" },
  { value: "south", label: "南" },
  { value: "west", label: "西" },
  { value: "north", label: "北" },
];

const MELD_LABELS: Record<DeclaredMeld["kind"], string> = {
  chi: "チー",
  pon: "ポン",
  minkan: "明槓",
  ankan: "暗槓",
};

type RiichiMode = "none" | "riichi" | "double";
type Situation = { rinshan: boolean; chankan: boolean; lastTile: boolean; heavenEarth: boolean };

const byIndex = (a: TileCode, b: TileCode) => codeToIndex(a) - codeToIndex(b);

function Tile({ code, size = "md" }: { code: TileCode; size?: "md" | "sm" }) {
  const w = size === "md" ? 32 : 28;
  const h = size === "md" ? 42 : 36;
  return (
    <Image
      src={tileImageSrc(code)}
      alt={tileLabel(code)}
      width={w}
      height={h}
      unoptimized
      className="h-full w-full object-contain"
    />
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-full bg-ink-400/10 p-1 text-sm font-medium">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-full py-1.5 text-center transition-colors ${
            value === o.value ? "bg-washi-100 text-board-800 shadow-sm" : "text-ink-600"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between py-1 text-sm font-medium text-ink-900 disabled:opacity-40"
    >
      {label}
      <span
        className={`relative inline-block h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-board-700" : "bg-ink-400/25"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-washi-100 shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </span>
    </button>
  );
}

function PaymentText({ payment }: { payment: Payment }) {
  if (payment.kind === "ron") {
    return <p className="text-3xl font-bold text-board-800">{payment.total.toLocaleString()}点</p>;
  }
  if (payment.dealerWin) {
    return (
      <div>
        <p className="text-3xl font-bold text-board-800">{payment.each.toLocaleString()}点オール</p>
        <p className="text-sm text-ink-600">合計 {payment.total.toLocaleString()}点</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-3xl font-bold text-board-800">
        {payment.fromOthers.toLocaleString()}・{payment.fromDealer.toLocaleString()}点
      </p>
      <p className="text-sm text-ink-600">
        子 {payment.fromOthers.toLocaleString()}点 / 親 {payment.fromDealer.toLocaleString()}点(合計{" "}
        {payment.total.toLocaleString()}点)
      </p>
    </div>
  );
}

export function HandCalculator() {
  const [hand, setHand] = useState<TileCode[]>([]);
  const [agari, setAgari] = useState<TileCode | null>(null);
  const [melds, setMelds] = useState<DeclaredMeld[]>([]);
  const [meldMode, setMeldMode] = useState<DeclaredMeld["kind"] | null>(null);
  const [winType, setWinType] = useState<"tsumo" | "ron">("ron");
  const [riichiMode, setRiichiMode] = useState<RiichiMode>("none");
  const [ippatsu, setIppatsu] = useState(false);
  const [situation, setSituation] = useState<Situation>({
    rinshan: false,
    chankan: false,
    lastTile: false,
    heavenEarth: false,
  });
  const [isDealer, setIsDealer] = useState(false);
  const [roundWind, setRoundWind] = useState<Wind>("east");
  const [seatWind, setSeatWind] = useState<Wind>("south");
  const [dora, setDora] = useState(0);
  const [result, setResult] = useState<HandEvaluation | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const cap = 13 - 3 * melds.length;
  const closed = melds.every((m) => m.kind === "ankan");
  const hasKan = melds.some((m) => m.kind === "minkan" || m.kind === "ankan");
  const canRinshan = winType === "tsumo" && hasKan;
  const canChankan = winType === "ron";
  const canHeavenEarth = winType === "tsumo" && melds.length === 0;
  const eff = {
    rinshan: situation.rinshan && canRinshan,
    chankan: situation.chankan && canChankan,
    lastTile: situation.lastTile,
    heavenEarth: situation.heavenEarth && canHeavenEarth,
  };

  const meldTileCodes = (m: DeclaredMeld) => declaredTiles(m).map(indexToCode);
  const countOf = (code: TileCode) =>
    hand.filter((c) => c === code).length +
    (agari === code ? 1 : 0) +
    melds.reduce((n, m) => n + meldTileCodes(m).filter((c) => c === code).length, 0);
  const target = hand.length < cap ? "hand" : "agari";

  const touch = () => {
    setResult(null);
    setNotice(null);
  };

  const addMeld = (code: TileCode, kind: DeclaredMeld["kind"]) => {
    setResult(null);
    if (melds.length >= 4) {
      setNotice("副露は4組までです");
      return;
    }
    const idx = codeToIndex(code);
    if (kind === "chi" && (idx >= 27 || idx % 9 > 6)) {
      setNotice("チーは、順子の一番小さい数牌をタップしてください(例: 345萬なら三萬)。八・九・字牌からは作れません");
      return;
    }
    if (hand.length > 13 - 3 * (melds.length + 1)) {
      setNotice("手牌の枚数が多いため副露を追加できません。先に手牌から牌を外してください");
      return;
    }
    const meld: DeclaredMeld = { kind, tile: code };
    const tiles = meldTileCodes(meld);
    for (const c of new Set(tiles)) {
      const need = tiles.filter((x) => x === c).length;
      if (countOf(c) + need > 4) {
        setNotice(`${tileLabel(c)}は同じ牌を4枚までしか使えません。この副露は追加できません`);
        return;
      }
    }
    setNotice(null);
    setMelds((m) => [...m, meld]);
    setMeldMode(null);
    if (kind !== "ankan") {
      setRiichiMode("none");
      setIppatsu(false);
      setSituation((st) => ({ ...st, heavenEarth: false }));
    }
  };

  const addTile = (code: TileCode) => {
    if (meldMode) {
      addMeld(code, meldMode);
      return;
    }
    setResult(null);
    if (hand.length >= cap && agari) {
      setNotice(`牌が多すぎます(手牌${cap}枚+和了牌1枚まで)。不要な牌をタップして外してください`);
      return;
    }
    if (countOf(code) >= 4) {
      setNotice(`${tileLabel(code)}はすでに4枚使っています(同じ牌は4枚まで)`);
      return;
    }
    setNotice(null);
    if (hand.length < cap) setHand((h) => [...h, code].sort(byIndex));
    else setAgari(code);
  };

  const removeHandTile = (i: number) => {
    touch();
    setHand((h) => h.filter((_, idx) => idx !== i));
  };

  const toggleSituation = (key: keyof Situation, on: boolean) => {
    touch();
    if (on && key === "heavenEarth") {
      setRiichiMode("none");
      setIppatsu(false);
    }
    setSituation((st) => {
      if (!on) return { ...st, [key]: false };
      if (key === "heavenEarth") {
        return { rinshan: false, chankan: false, lastTile: false, heavenEarth: true };
      }
      return {
        ...st,
        [key]: true,
        heavenEarth: false,
        ...(key === "rinshan" ? { lastTile: false } : {}),
        ...(key === "lastTile" ? { rinshan: false } : {}),
      };
    });
  };

  const calculate = () => {
    setNotice(null);
    setResult(
      evaluateHand({
        hand,
        agari,
        melds,
        winType,
        riichi: riichiMode === "riichi",
        doubleRiichi: riichiMode === "double",
        ippatsu: riichiMode !== "none" && ippatsu,
        rinshan: eff.rinshan,
        chankan: eff.chankan,
        lastTile: eff.lastTile,
        heavenEarth: eff.heavenEarth,
        isDealer,
        roundWind,
        seatWind,
        dora,
      })
    );
  };

  const clearAll = () => {
    setHand([]);
    setAgari(null);
    setMelds([]);
    setMeldMode(null);
    touch();
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">
            手牌 <span className="text-ink-400">{hand.length}/{cap}</span>
          </h2>
          <button type="button" onClick={clearAll} className="text-xs text-ink-400 underline">
            全部クリア
          </button>
        </div>
        <div className="flex min-h-[46px] flex-wrap gap-1">
          {hand.length === 0 && (
            <p className="py-2.5 text-xs text-ink-400">下の牌をタップして手牌を入力します(同じ牌は複数回タップ)</p>
          )}
          {hand.map((code, i) => (
            <button
              key={`${code}-${i}`}
              type="button"
              onClick={() => removeHandTile(i)}
              aria-label={`${tileLabel(code)}を外す`}
              className="h-[42px] w-8 overflow-hidden rounded-md border border-gold-500/40 bg-washi-100 shadow-sm"
            >
              <Tile code={code} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-ink-400/10 pt-3">
          <h2 className="text-sm font-semibold text-ink-900">和了牌</h2>
          {agari ? (
            <button
              type="button"
              onClick={() => {
                touch();
                setAgari(null);
              }}
              aria-label={`和了牌${tileLabel(agari)}を外す`}
              className="h-[42px] w-8 overflow-hidden rounded-md border-2 border-red-500 bg-washi-100 shadow-sm"
            >
              <Tile code={agari} />
            </button>
          ) : (
            <span className="text-xs text-ink-400">
              {target === "agari" ? "次にタップした牌が和了牌になります" : `手牌${cap}枚を入力すると和了牌を選べます`}
            </span>
          )}
        </div>
      </Card>

      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold text-ink-900">
          副露(鳴き) <span className="text-ink-400">{melds.length}/4</span>
        </h2>
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(MELD_LABELS) as DeclaredMeld["kind"][]).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => {
                touch();
                setMeldMode((m) => (m === kind ? null : kind));
              }}
              className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                meldMode === kind
                  ? "border-gold-500 bg-gold-500/15 text-board-800"
                  : "border-ink-400/30 bg-washi-100 text-ink-900"
              }`}
            >
              ＋{MELD_LABELS[kind]}
            </button>
          ))}
        </div>
        {melds.length === 0 ? (
          <p className="text-xs text-ink-400">鳴きなし(門前)。鳴いた場合は上のボタンを押してから牌をタップします</p>
        ) : (
          <ul className="space-y-1.5">
            {melds.map((m, i) => (
              <li key={`${m.kind}-${m.tile}-${i}`} className="flex items-center gap-2">
                <span className="w-9 shrink-0 text-xs text-ink-600">{MELD_LABELS[m.kind]}</span>
                <div className="flex flex-1 gap-0.5">
                  {meldTileCodes(m).map((c, ti) => (
                    <span
                      key={ti}
                      className="h-9 w-7 overflow-hidden rounded border border-gold-500/40 bg-washi-100"
                    >
                      <Tile code={c} size="sm" />
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label={`${MELD_LABELS[m.kind]}を取り消す`}
                  onClick={() => {
                    touch();
                    setMelds((all) => all.filter((_, idx) => idx !== i));
                  }}
                  className="h-8 w-8 rounded-lg border border-ink-400/30 text-ink-600"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-2 p-4">
        <p className="text-xs text-ink-600">
          {meldMode
            ? meldMode === "chi"
              ? "チー: 順子の一番小さい牌をタップ(例: 345萬 → 三萬)"
              : `${MELD_LABELS[meldMode]}: 対象の牌をタップ`
            : target === "hand"
              ? `手牌を入力中(あと${cap - hand.length}枚)`
              : agari
                ? "入力完了"
                : "和了牌を選んでください"}
        </p>
        {SUITS.map((suit) => (
          <div key={suit.label} className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-[11px] text-ink-400">{suit.label}</span>
            <div className="flex flex-1 gap-1">
              {suit.codes.map((code) => {
                const n = countOf(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => addTile(code)}
                    aria-label={`${tileLabel(code)}を追加`}
                    className="relative aspect-[3/4] min-w-0 flex-1 overflow-hidden rounded-md border border-gold-500/40 bg-washi-100 shadow-sm active:bg-gold-500/20"
                  >
                    <Tile code={code} size="sm" />
                    {n > 0 && (
                      <span className="absolute right-0 bottom-0 rounded-tl bg-board-800 px-1 text-[10px] leading-4 text-washi-100">
                        {n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Card>

      {notice && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {notice}
        </div>
      )}

      <Card className="space-y-3 p-4">
        <Segmented
          value={winType}
          onChange={(v) => {
            touch();
            setWinType(v);
          }}
          options={[
            { value: "ron", label: "ロン" },
            { value: "tsumo", label: "ツモ" },
          ]}
        />
        <div className="space-y-1.5">
          <p className="text-xs text-ink-400">リーチ{closed ? "" : "(鳴いているため不可)"}</p>
          <Segmented<RiichiMode>
            value={riichiMode}
            options={[
              { value: "none", label: "なし" },
              { value: "riichi", label: "リーチ" },
              { value: "double", label: "ダブルリーチ" },
            ]}
            onChange={(v) => {
              if (v !== "none" && !closed) {
                setNotice("鳴いているためリーチはできません(暗槓のみ可)");
                return;
              }
              touch();
              setRiichiMode(v);
              if (v === "none") setIppatsu(false);
              else setSituation((st) => ({ ...st, heavenEarth: false }));
            }}
          />
        </div>
        <SwitchRow
          label="一発"
          checked={riichiMode !== "none" && ippatsu}
          disabled={riichiMode === "none"}
          onChange={(v) => {
            touch();
            setIppatsu(v);
          }}
        />
        <div className="space-y-1 border-t border-ink-400/10 pt-2">
          <p className="text-xs text-ink-400">運の役・状況役</p>
          <SwitchRow
            label="嶺上開花(カン後のツモ)"
            checked={eff.rinshan}
            disabled={!canRinshan}
            onChange={(v) => toggleSituation("rinshan", v)}
          />
          <SwitchRow
            label="槍槓(他家のカンにロン)"
            checked={eff.chankan}
            disabled={!canChankan}
            onChange={(v) => toggleSituation("chankan", v)}
          />
          <SwitchRow
            label={winType === "tsumo" ? "海底摸月(最後の牌でツモ)" : "河底撈魚(最後の捨て牌でロン)"}
            checked={eff.lastTile}
            onChange={(v) => toggleSituation("lastTile", v)}
          />
          <SwitchRow
            label="天和・地和(配牌・第一ツモで和了)"
            checked={eff.heavenEarth}
            disabled={!canHeavenEarth}
            onChange={(v) => toggleSituation("heavenEarth", v)}
          />
        </div>
        <SwitchRow
          label="親(東家)"
          checked={isDealer}
          onChange={(v) => {
            touch();
            setIsDealer(v);
          }}
        />
        <div className="space-y-1.5">
          <p className="text-xs text-ink-400">場風</p>
          <Segmented value={roundWind} options={WINDS} onChange={(v) => { touch(); setRoundWind(v); }} />
          <p className="pt-1 text-xs text-ink-400">自風</p>
          <Segmented value={seatWind} options={WINDS} onChange={(v) => { touch(); setSeatWind(v); }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink-900">ドラ(表・裏・赤の合計枚数)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="ドラを減らす"
              onClick={() => { touch(); setDora((d) => Math.max(0, d - 1)); }}
              className="h-9 w-9 rounded-lg border border-ink-400/30 bg-washi-100 text-lg"
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-semibold">{dora}</span>
            <button
              type="button"
              aria-label="ドラを増やす"
              onClick={() => { touch(); setDora((d) => Math.min(20, d + 1)); }}
              className="h-9 w-9 rounded-lg border border-ink-400/30 bg-washi-100 text-lg"
            >
              ＋
            </button>
          </div>
        </div>
        <p className="text-xs text-ink-400">※ ドラは表・裏・赤・カンドラの合計枚数を入力してください。</p>
      </Card>

      <Button variant="primary" className="w-full" onClick={calculate}>
        点数を計算する
      </Button>

      {result && !result.ok && (
        <div role="alert" className="space-y-1 rounded-lg border border-red-300 bg-red-50 px-3 py-3 text-sm text-red-700">
          {result.errors.map((e) => (
            <p key={e}>⚠️ {e}</p>
          ))}
        </div>
      )}

      {result && result.ok && (
        <Card className="space-y-3 border-gold-500/50 p-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-400">和了牌</span>
            <span className="h-[42px] w-8 overflow-hidden rounded-md border-2 border-red-500 bg-washi-100">
              <Tile code={result.agari} />
            </span>
            <span className="text-xs text-ink-600">{result.waitName}</span>
          </div>
          <div>
            {result.limitName && (
              <p className="text-sm font-semibold text-red-600">{result.limitName}</p>
            )}
            <p className="text-sm text-ink-600">
              {result.yakumanCount > 0 ? "役満" : `${result.han}翻 ${result.fu}符`}
              {winType === "tsumo" ? "(ツモ)" : "(ロン)"}・{isDealer ? "親" : "子"}
            </p>
            <PaymentText payment={result.payment} />
          </div>
          <ul className="divide-y divide-ink-400/10 rounded-lg border border-ink-400/10 text-sm">
            {result.yaku.map((y) => (
              <li key={y.name} className="flex justify-between px-3 py-1.5">
                <span className="text-ink-900">{y.name}</span>
                <span className="text-ink-600">{y.yakuman ? "役満" : `${y.han}翻`}</span>
              </li>
            ))}
            {result.dora > 0 && (
              <li className="flex justify-between px-3 py-1.5">
                <span className="text-ink-900">ドラ</span>
                <span className="text-ink-600">{result.dora}翻</span>
              </li>
            )}
          </ul>
        </Card>
      )}
    </div>
  );
}
