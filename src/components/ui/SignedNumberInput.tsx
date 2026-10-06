"use client";

/**
 * マイナスを入力できる数値欄。スマホの数字キーパッドには「-」が無い機種があるため、
 * キーボードに依存せず ± ボタンで符号を反転できるようにしている。
 */
export function SignedNumberInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const toggleSign = () => {
    if (value.startsWith("-")) onChange(value.slice(1));
    else onChange(`-${value === "" || value === "0" ? "" : value}`);
  };

  return (
    <div className="flex w-full items-center gap-1.5">
      <button
        type="button"
        onClick={toggleSign}
        aria-label={`${ariaLabel}の正負を切り替える`}
        className="h-10 w-11 shrink-0 rounded-lg border border-ink-400/30 bg-washi-100 text-base font-semibold text-board-800 active:bg-gold-500/10"
      >
        ±
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => {
          const normalized = e.target.value
            .replace(/[−ー－]/g, "-")
            .replace(/[０-９]/g, (c) => String(c.charCodeAt(0) - 0xff10));
          if (/^-?\d*$/.test(normalized)) onChange(normalized);
        }}
        className="h-10 w-full rounded-lg border border-ink-400/30 bg-washi-100 px-3 text-right text-sm outline-none focus:border-gold-500"
      />
    </div>
  );
}
