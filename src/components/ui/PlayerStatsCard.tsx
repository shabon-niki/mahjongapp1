import { Card } from "@/components/ui/Card";
import type { PlayerStats } from "@/lib/mahjong/playerStats";

const pct = (v: number | null) => (v === null ? "-" : `${(v * 100).toFixed(1)}%`);
const signed = (v: number) => `${v > 0 ? "+" : ""}${v}`;

export function PlayerStatsCard({ stats }: { stats: PlayerStats }) {
  const rows: [string, string][] = [
    ["対局数", `${stats.gamesPlayed}半荘`],
    ["トップ数", `${stats.rankCounts[0]}回`],
    ["順位分布", `${stats.rankCounts.join(" - ")}`],
    ["平均順位", stats.averageRank === null ? "-" : `${stats.averageRank.toFixed(2)}位`],
    [
      "平均点数",
      stats.averagePoint === null ? "-" : signed(Math.round(stats.averagePoint * 10) / 10),
    ],
    ["通算点数", signed(Math.round(stats.totalPoint * 10) / 10)],
    ["トップ率", pct(stats.topRate)],
    ["連対率", pct(stats.rentaiRate)],
    ["ラス回避率", pct(stats.lastAvoidRate)],
  ];

  return (
    <Card className="divide-y divide-ink-400/10">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-ink-400">{label}</span>
          <span className="font-medium text-ink-900">{value}</span>
        </div>
      ))}
    </Card>
  );
}
