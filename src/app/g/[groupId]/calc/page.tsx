import { requireMembership } from "@/lib/auth";
import { HandCalculator } from "@/components/calc/HandCalculator";

export default async function CalcPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  await requireMembership(groupId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-lg font-bold text-ink-900">点数計算</h1>
        <p className="mt-1 text-sm text-ink-600">
          牌をタップして手牌と和了牌を入力すると、役・符・点数を計算します。
        </p>
      </div>
      <HandCalculator />
    </div>
  );
}
