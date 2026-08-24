export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-dvh bg-washi-200 px-4 py-10">
      <div className="mx-auto w-full max-w-xl space-y-6 text-sm leading-relaxed text-ink-900">
        <h1 className="font-serif text-xl font-bold text-ink-900">プライバシーポリシー</h1>
        <p className="text-xs text-ink-400">最終更新日: 2026年8月25日</p>

        <p>
          「聴牌」(以下「本アプリ」)は、個人(以下「運営者」)が開発・運営するサービスです。
          本ポリシーは、本アプリが取得する情報とその取り扱いについて説明します。
        </p>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">1. 取得する情報</h2>
          <p>本アプリは、利用登録・利用時に以下の情報を取得します。</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>お名前(表示名)</li>
            <li>メールアドレス(ログインに使用)</li>
            <li>パスワード(暗号学的ハッシュ化した状態で保存し、平文では保存・保持しません)</li>
            <li>経験レベル(未経験/初心者/経験者)</li>
            <li>麻雀部内で入力する対局結果・参加履歴などの利用データ</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">2. 利用目的</h2>
          <p>
            取得した情報は、麻雀部内での卓の募集・参加調整・対局記録・ランキング表示など、
            本アプリの機能を提供する目的にのみ利用します。広告表示や第三者への販売・提供、
            本人の同意なく行うマーケティング目的での利用は行いません。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">3. 第三者提供</h2>
          <p>
            法令に基づく場合を除き、取得した情報を本人の同意なく第三者に提供することはありません。
            データベース等のインフラは信頼できるクラウド事業者(Vercel, Neon)を利用していますが、
            これらの事業者は本アプリの運営目的の範囲でのみデータを処理します。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">4. Cookie</h2>
          <p>
            ログイン状態を保持するための必要最小限のCookieのみを使用します。広告目的の
            トラッキングCookieは使用しません。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">5. データの削除</h2>
          <p>
            アプリ内のマイページから、いつでも自分のアカウントを削除できます。削除すると
            メールアドレス・パスワードは削除され、ログインできなくなります。ただし、
            麻雀部の他メンバーと共有される対局結果・ランキング等の履歴データは、他メンバーの
            記録と一体であるため削除せず、お名前のみ記録に残ります。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">6. お問い合わせ</h2>
          <p>
            本ポリシーや個人情報の取り扱いに関するお問い合わせ、データ削除等のご要望は、
            以下の連絡先までご連絡ください。
          </p>
          <p>
            運営者: Daisuke Ito
            <br />
            連絡先:{" "}
            <a href="mailto:daisuke-ito@timewitch.jp" className="underline">
              daisuke-ito@timewitch.jp
            </a>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-ink-900">7. ポリシーの変更</h2>
          <p>
            本ポリシーの内容は、必要に応じて変更されることがあります。重要な変更がある場合は、
            本アプリ内で通知します。
          </p>
        </section>
      </div>
    </div>
  );
}
