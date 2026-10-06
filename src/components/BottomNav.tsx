"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav({ groupId }: { groupId: string }) {
  const pathname = usePathname();

  const items = [
    { href: `/g/${groupId}`, label: "ホーム", icon: "🏠" },
    { href: `/g/${groupId}/learn`, label: "役一覧", icon: "📖" },
    { href: `/g/${groupId}/calc`, label: "点数計算", icon: "🧮" },
    { href: `/g/${groupId}/ranking`, label: "ランキング", icon: "🏆" },
    { href: `/g/${groupId}/mypage`, label: "マイページ", icon: "👤" },
  ] as const;

  const homeHref = `/g/${groupId}`;

  return (
    <nav className="sticky bottom-0 z-20 border-t border-gold-500/20 bg-washi-100/95 backdrop-blur supports-[backdrop-filter]:bg-washi-100/80">
      <div className="mx-auto flex w-full max-w-xl">
        {items.map((item) => {
          const active =
            item.href === homeHref ? pathname === homeHref : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${
                active ? "text-board-800 font-semibold" : "text-ink-400"
              }`}
            >
              <span className={`text-lg ${active ? "" : "opacity-60"}`}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
