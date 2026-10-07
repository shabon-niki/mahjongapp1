import { Card } from "@/components/ui/Card";
import { MahjongTile, MahjongTileExample } from "@/components/ui/MahjongTile";
import {
  FU_COMPONENTS,
  FU_SPECIAL_CASES,
  FU_WORKED_EXAMPLES,
} from "@/lib/mahjong/scoreTable";

export function FuRuleTable() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-600">
        符(ふ)は手牌の構成要素を積み上げて計算し、最後に10符単位で切り上げます。
        それぞれの符が「どんな形・どんな和了のときに付くか」を、牌の例つきで確認できます。
      </p>

      <div className="space-y-2">
        {FU_COMPONENTS.map((c) => (
          <Card key={c.key} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-bold text-ink-900">{c.label}</h3>
              <span className="shrink-0 rounded-full bg-board-800 px-2.5 py-0.5 text-sm font-semibold text-washi-100">
                {c.points}
              </span>
            </div>
            <p className="text-sm text-ink-600">{c.how}</p>
            {c.note && <p className="text-xs text-ink-400">※ {c.note}</p>}
            {(c.example || c.exampleNote) && (
              <div className="space-y-1.5 rounded-lg bg-washi-200 px-3 py-2.5">
                {c.example && <MahjongTileExample groups={c.example} />}
                {c.exampleNote && <p className="text-xs text-ink-600">{c.exampleNote}</p>}
              </div>
            )}
          </Card>
        ))}
      </div>
      <p className="text-xs text-ink-400">
        合計した符は10符単位で切り上げます(例: 22符 → 30符)。
      </p>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-ink-900">積み上げ計算をしない例外</p>
        <div className="space-y-2">
          {FU_SPECIAL_CASES.map((c) => (
            <Card key={c.key} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-bold text-ink-900">{c.label}</h3>
                <span className="shrink-0 rounded-full bg-board-800 px-2.5 py-0.5 text-sm font-semibold text-washi-100">
                  {c.points}符
                </span>
              </div>
              <p className="text-sm text-ink-600">{c.note}</p>
              {(c.example || c.exampleNote) && (
                <div className="space-y-1.5 rounded-lg bg-washi-200 px-3 py-2.5">
                  {c.example && <MahjongTileExample groups={c.example} />}
                  {c.exampleNote && <p className="text-xs text-ink-600">{c.exampleNote}</p>}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-ink-900">符計算の実例</p>
        <div className="space-y-2">
          {FU_WORKED_EXAMPLES.map((ex) => {
            const raw = ex.breakdown.reduce((sum, b) => sum + b.fu, 0);
            return (
              <Card key={ex.key} className="space-y-3 p-4">
                <h3 className="text-sm font-bold text-ink-900">{ex.title}</h3>
                <div className="space-y-2 rounded-lg bg-washi-200 px-3 py-2.5">
                  <MahjongTileExample groups={ex.groups} />
                  {ex.called && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-400">鳴き</span>
                      <MahjongTileExample groups={ex.called} />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-400">
                      和了牌({ex.winType === "tsumo" ? "ツモ" : "ロン"})
                    </span>
                    <span className="rounded-md ring-2 ring-red-500">
                      <MahjongTile code={ex.agari} />
                    </span>
                  </div>
                  <p className="text-xs text-ink-600">{ex.condition}</p>
                </div>
                <ul className="divide-y divide-ink-400/10 rounded-lg border border-ink-400/10 text-sm">
                  {ex.breakdown.map((b) => (
                    <li key={b.label} className="flex justify-between px-3 py-1.5">
                      <span className="text-ink-900">{b.label}</span>
                      <span className="text-ink-600">{b.fu === 0 ? "0" : `+${b.fu}`}符</span>
                    </li>
                  ))}
                  <li className="flex justify-between bg-board-800/5 px-3 py-1.5 font-semibold">
                    <span className="text-ink-900">
                      合計 {raw}符{raw !== ex.total && ` → 切り上げ`}
                    </span>
                    <span className="text-board-800">{ex.total}符</span>
                  </li>
                </ul>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
