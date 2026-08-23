import Image from "next/image";
import type { Tile } from "@/lib/mahjong/tableFormation";
import { tileImageSrc, tileLabel } from "@/lib/mahjong/tiles";

export function TileRow({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="img" aria-label="卓成立状況">
      {tiles.map((tile, i) => (
        <span
          key={i}
          aria-hidden
          className={
            tile.filled
              ? "flex h-10 w-8 items-center justify-center overflow-hidden rounded-md border border-gold-500/50 bg-washi-100 shadow-[0_1px_2px_rgba(13,43,34,0.15)]"
              : "flex h-10 w-8 items-center justify-center rounded-md border border-ink-400/25 bg-washi-200/60 text-sm text-ink-400/60"
          }
        >
          {tile.filled ? (
            <Image
              src={tileImageSrc(tile.label)}
              alt={tileLabel(tile.label)}
              width={28}
              height={36}
              className="h-full w-full object-contain"
              unoptimized
            />
          ) : (
            tile.label
          )}
        </span>
      ))}
    </div>
  );
}
