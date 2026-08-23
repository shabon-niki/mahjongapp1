import { Card } from "@/components/ui/Card";
import { FU_COMPONENTS, FU_SPECIAL_CASES } from "@/lib/mahjong/scoreTable";

export function FuRuleTable() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-600">
        符(ふ)は手牌の構成要素を積み上げて計算し、最後に10符単位で切り上げます。
      </p>
      <Card className="divide-y divide-ink-400/10">
        {FU_COMPONENTS.map((c) => (
          <div key={c.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div>
              <span className="block text-sm text-ink-900">{c.label}</span>
              {c.note && <span className="block text-xs text-ink-400">{c.note}</span>}
            </div>
            <span className="shrink-0 text-sm font-semibold text-board-800">{c.points}</span>
          </div>
        ))}
      </Card>
      <p className="text-xs text-ink-400">
        合計した符は10符単位で切り上げます(例: 22符 → 30符)。
      </p>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-ink-900">積み上げ計算をしない例外</p>
        <Card className="divide-y divide-ink-400/10">
          {FU_SPECIAL_CASES.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div>
                <span className="block text-sm text-ink-900">{c.label}</span>
                <span className="block text-xs text-ink-400">{c.note}</span>
              </div>
              <span className="shrink-0 text-sm font-semibold text-board-800">{c.points}符</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
