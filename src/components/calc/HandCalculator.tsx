"use client";

import { useState } from "react";
import Image from "next/image";
import { tileImageSrc, tileLabel, type TileCode } from "@/lib/mahjong/tiles";
import {
  codeToIndex,
  evaluateHand,
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
  const [winType, setWinType] = useState<"tsumo" | "ron">("ron");
  const [riichi, setRiichi] = useState(false);
  const [ippatsu, setIppatsu] = useState(false);
  const [isDealer, setIsDealer] = useState(false);
  const [roundWind, setRoundWind] = useState<Wind>("east");
  const [seatWind, setSeatWind] = useState<Wind>("south");
  const [dora, setDora] = useState(0);
  const [result, setResult] = useState<HandEvaluation | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const all = agari ? [...hand, agari] : hand;
  const countOf = (code: TileCode) => all.filter((c) => c === code).length;
  const total = all.length;
  const target = hand.length < 13 ? "hand" : "agari";

  const touch = () => {
    setResult(null);
    setNotice(null);
  };

  const addTile = (code: TileCode) => {
    setResult(null);
    if (total >= 14) {
      setNotice("牌が14枚(手牌13枚+和了牌1枚)を超えています。不要な牌をタップして外してください");
      return;
    }
    if (countOf(code) >= 4) {
      setNotice(`${tileLabel(code)}はすでに4枚使っています(同じ牌は4枚まで)`);
      return;
    }
    setNotice(null);
    if (hand.length < 13) setHand((h) => [...h, code].sort(byIndex));
    else setAgari(code);
  };

  const removeHandTile = (i: number) => {
    touch();
    setHand((h) => h.filter((_, idx) => idx !== i));
  };

  const calculate = () => {
    setNotice(null);
    setResult(
      evaluateHand({
        hand,
        agari,
        winType,
        riichi,
        ippatsu: riichi && ippatsu,
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
    touch();
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">
            手牌 <span className="text-ink-400">{hand.length}/13</span>
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
              {target === "agari" ? "次にタップした牌が和了牌になります" : "手牌13枚を入力すると和了牌を選べます"}
            </span>
          )}
        </div>
      </Card>

      <Card className="space-y-2 p-4">
        <p className="text-xs text-ink-600">
          {target === "hand" ? `手牌を入力中(あと${13 - hand.length}枚)` : agari ? "入力完了" : "和了牌を選んでください"}
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
        <SwitchRow
          label="リーチ"
          checked={riichi}
          onChange={(v) => {
            touch();
            setRiichi(v);
            if (!v) setIppatsu(false);
          }}
        />
        <SwitchRow
          label="一発"
          checked={riichi && ippatsu}
          disabled={!riichi}
          onChange={(v) => {
            touch();
            setIppatsu(v);
          }}
        />
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
        <p className="text-xs text-ink-400">※ 門前(鳴きなし)の手牌のみ対応しています。</p>
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
