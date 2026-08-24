"use client";

import { useActionState } from "react";
import { deleteAccount, type DeleteAccountFormState } from "@/app/account/delete/actions";
import { Button } from "@/components/ui/Button";

const INITIAL_STATE: DeleteAccountFormState = {};

export function DeleteAccountForm() {
  const [state, formAction, isPending] = useActionState(deleteAccount, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-3">
      <input
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="現在のパスワード"
        className="w-full rounded-lg border border-ink-400/30 bg-washi-100 px-3 py-2 text-sm outline-none focus:border-gold-500"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" variant="danger" className="w-full" disabled={isPending}>
        {isPending ? "削除しています..." : "パスワードを確認してアカウントを削除する"}
      </Button>
    </form>
  );
}
