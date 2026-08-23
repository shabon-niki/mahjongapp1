import Link from "next/link";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { FEATURED_YAKU } from "@/lib/mahjong/yaku";
import { YakuCard } from "@/components/learn/YakuCard";
import { YakuFilterList } from "@/components/learn/YakuFilterList";
import { ScoreRuleExplainer } from "@/components/learn/ScoreRuleExplainer";

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { groupId } = await params;
  await requireMembership(groupId);
  const { view } = await searchParams;
  const activeView = view === "score" ? "score" : "yaku";

  const rule = await prisma.groupRule.findUnique({ where: { groupId } });
  if (!rule) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-lg font-bold text-ink-900">LEARN</h1>
        <p className="mt-1 text-sm text-ink-600">
          対局中に分からなくなったら、いつでもここで確認できます。
        </p>
      </div>

      <div className="flex gap-1 rounded-full bg-ink-400/10 p-1 text-sm font-medium">
        <Link
          href={`/g/${groupId}/learn?view=yaku`}
          className={`flex-1 rounded-full py-2 text-center transition-colors ${
            activeView === "yaku" ? "bg-washi-100 text-board-800 shadow-sm" : "text-ink-600"
          }`}
        >
          役一覧
        </Link>
        <Link
          href={`/g/${groupId}/learn?view=score`}
          className={`flex-1 rounded-full py-2 text-center transition-colors ${
            activeView === "score" ? "bg-washi-100 text-board-800 shadow-sm" : "text-ink-600"
          }`}
        >
          点数計算
        </Link>
      </div>

      {activeView === "yaku" ? (
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-ink-900">🔰 まず覚えたい役</h2>
            {FEATURED_YAKU.map((y) => (
              <YakuCard key={y.key} yaku={y} />
            ))}
          </div>

          <div id="all" className="space-y-3 border-t border-ink-400/10 pt-6">
            <h2 className="text-base font-bold text-ink-900">すべての役を見る</h2>
            <YakuFilterList />
          </div>
        </div>
      ) : (
        <ScoreRuleExplainer rule={rule} />
      )}
    </div>
  );
}
