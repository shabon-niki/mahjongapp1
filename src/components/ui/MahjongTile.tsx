import Image from "next/image";
import { tileLabel, tileImageSrc, type TileCode, type TileGroup } from "@/lib/mahjong/tiles";

export function MahjongTile({ code }: { code: TileCode }) {
  return (
    <span className="inline-flex h-9 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gold-500/40 bg-washi-100 shadow-sm">
      <Image
        src={tileImageSrc(code)}
        alt={tileLabel(code)}
        width={28}
        height={36}
        className="h-full w-full object-contain"
        unoptimized
      />
    </span>
  );
}

/** 面子ごとにグループ分けして横並び表示する(グループ間はやや広めの余白) */
export function MahjongTileExample({ groups }: { groups: TileGroup[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {groups.map((group, gi) => (
        <div key={gi} className="flex max-w-full flex-wrap gap-1">
          {group.map((code, ti) => (
            <MahjongTile key={ti} code={code} />
          ))}
        </div>
      ))}
    </div>
  );
}
