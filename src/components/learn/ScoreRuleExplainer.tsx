import type { GroupRule } from "@/generated/prisma/client";
import { Card } from "@/components/ui/Card";
import { FuRuleTable } from "@/components/learn/FuRuleTable";
import { HanFuScoreTable } from "@/components/learn/HanFuScoreTable";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-ink-400">{label}</span>
      <span className="font-medium text-ink-900">{value}</span>
    </div>
  );
}

function signed(n: number): string {
  return `${n > 0 ? "+" : ""}${n}`;
}

export function ScoreRuleExplainer({ rule }: { rule: GroupRule }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-ink-900">符(ふ)の計算</h2>
        <p className="mt-1 text-sm text-ink-600">
          和了した手牌の形から符を積み上げて、翻数とあわせて点数を決めます。
        </p>
        <div className="mt-3">
          <FuRuleTable />
        </div>
      </div>

      <div className="border-t border-ink-400/10 pt-6">
        <h2 className="text-base font-bold text-ink-900">翻符点数表(子・親)</h2>
        <p className="mt-1 text-sm text-ink-600">
          翻数と符が決まれば、下の表でそのまま点数が分かります。
        </p>
        <div className="mt-3">
          <HanFuScoreTable />
        </div>
      </div>

      <div className="border-t border-ink-400/10 pt-6">
        <h3 className="mb-2 text-sm font-semibold text-ink-900">この麻雀部の設定</h3>
        <Card className="divide-y divide-ink-400/10">
          <Row label="持ち点" value={`${rule.startingPoints.toLocaleString()}点`} />
          <Row
            label="ウマ(1位/2位/3位/4位)"
            value={[rule.umaFirst, rule.umaSecond, rule.umaThird, rule.umaFourth]
              .map(signed)
              .join(" / ")}
          />
          <Row
            label="オカ(1位への加算)"
            value={rule.okaEnabled ? `${rule.okaPoints.toLocaleString()}点` : "なし"}
          />
          <Row
            label="チップ"
            value={rule.chipEnabled ? `1枚 ${rule.chipValue.toLocaleString()}点` : "なし"}
          />
          <Row
            label="飛びペナルティ"
            value={rule.bustPenaltyEnabled ? `-${rule.bustPenaltyValue.toLocaleString()}点` : "なし"}
          />
          <Row
            label="端数処理"
            value={rule.roundingRule === "gosha_rokunyu" ? "五捨六入" : "そのまま(小数第一位)"}
          />
          <Row
            label="同点時の順位"
            value={rule.tieRule === "shared_rank" ? "同着として分け合う" : "起家からの順で決定"}
          />
        </Card>
      </div>

      <div className="border-t border-ink-400/10 pt-6">
        <h3 className="mb-2 text-sm font-semibold text-ink-900">対局数ボーナス</h3>
        {rule.playCountBonusEnabled ? (
          <>
            <p className="mb-2 text-xs text-ink-400">
              クォーター/年間の期間内で対局数(半荘数)が多い人ほど加点、少ない人ほど減点されます。
            </p>
            <Card className="divide-y divide-ink-400/10">
              <Row
                label="対局数TOP3への加点"
                value={[rule.playCountBonusTop1, rule.playCountBonusTop2, rule.playCountBonusTop3]
                  .map(signed)
                  .join(" / ")}
              />
              <Row
                label="対局数WORST3への加点"
                value={[
                  rule.playCountPenaltyWorst1,
                  rule.playCountPenaltyWorst2,
                  rule.playCountPenaltyWorst3,
                ]
                  .map(signed)
                  .join(" / ")}
              />
            </Card>
          </>
        ) : (
          <p className="text-sm text-ink-400">現在は無効です。管理者が設定画面から有効にできます。</p>
        )}
      </div>
    </div>
  );
}
