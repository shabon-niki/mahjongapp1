import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { finishOnboarding } from "@/app/login/actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MahjongTileExample } from "@/components/ui/MahjongTile";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh bg-washi-200 px-4 py-8">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div>
          <h1 className="font-serif text-xl font-bold text-ink-900">はじめての麻雀ガイド</h1>
          <p className="mt-1 text-sm text-ink-600">
            対局に参加する前に、麻雀の基本だけさらっと確認しておきましょう。
          </p>
        </div>

        <Card className="p-4 space-y-2">
          <h2 className="text-base font-bold text-ink-900">🀄 麻雀ってどんなゲーム？</h2>
          <p className="text-sm text-ink-600">
            4人で行うカードゲームのようなものです。山から牌を1枚引いて、いらない牌を1枚捨てる
            ことを繰り返しながら、自分の手牌(13枚)を「勝てる形」に整えていきます。
          </p>
        </Card>

        <Card className="p-4 space-y-3">
          <h2 className="text-base font-bold text-ink-900">🏆 どうなったら勝ち？</h2>
          <p className="text-sm text-ink-600">
            手牌が「同じ牌3枚 or 連続する3枚」の組(面子)を4つと、「同じ牌2枚」の組(雀頭)を
            1つ作れると完成(和了/あがり)です。
          </p>
          <div className="rounded-lg bg-washi-200 px-3 py-2.5">
            <MahjongTileExample
              groups={[
                ["1m", "2m", "3m"],
                ["4p", "5p", "6p"],
                ["7s", "8s", "9s"],
                ["中", "中", "中"],
                ["5m", "5m"],
              ]}
            />
            <p className="mt-1.5 text-xs text-ink-600">面子×4 + 雀頭×1 = 完成形の例</p>
          </div>
          <p className="text-sm text-ink-600">
            自分で引いた牌で完成させることを「ツモ」、他の人が捨てた牌で完成させることを
            「ロン」と呼びます。
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <h2 className="text-base font-bold text-ink-900">📜 「役」が最低1つ必要</h2>
          <p className="text-sm text-ink-600">
            形が整っただけでは上がれません。「タンヤオ」「リーチ」など決められた条件(役)を
            1つ以上満たしている必要があります。役の一覧は対局中いつでも「LEARN」タブから
            確認できるので、覚えていなくても大丈夫です。
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <h2 className="text-base font-bold text-ink-900">🔢 点数について</h2>
          <p className="text-sm text-ink-600">
            上がった時の点数は「役の数(翻)」と「手の形の複雑さ(符)」で決まります。詳しい
            計算方法も「LEARN &gt; 点数計算」でいつでも確認できます。
          </p>
        </Card>

        <p className="text-center text-xs text-ink-400">
          対局中に分からなくなったら、いつでもLEARN画面から確認できます。まずは参加してみましょう！
        </p>

        <form action={finishOnboarding}>
          <Button type="submit" variant="secondary" className="w-full">
            はじめる
          </Button>
        </form>
      </div>
    </div>
  );
}
