"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import {
  calculateHanFuScore,
  HAN_COLUMNS,
  FU_ROWS,
  FIXED_SCORES,
} from "@/lib/mahjong/scoreTable";

export function HanFuScoreTable() {
  const [mode, setMode] = useState<"ron" | "tsumo">("ron");

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-full bg-ink-400/10 p-1 text-sm font-medium">
        <button
          onClick={() => setMode("ron")}
          className={`flex-1 rounded-full py-1.5 text-center transition-colors ${
            mode === "ron" ? "bg-washi-100 text-board-800 shadow-sm" : "text-ink-600"
          }`}
        >
          ロン
        </button>
        <button
          onClick={() => setMode("tsumo")}
          className={`flex-1 rounded-full py-1.5 text-center transition-colors ${
            mode === "tsumo" ? "bg-washi-100 text-board-800 shadow-sm" : "text-ink-600"
          }`}
        >
          ツモ
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-400/15">
        <table className="w-full min-w-[420px] border-collapse text-center text-xs">
          <thead>
            <tr className="bg-ink-400/10">
              <th className="w-14 px-1.5 py-2 text-left font-medium text-ink-600">符</th>
              {HAN_COLUMNS.map((han) => (
                <th key={han} className="px-1.5 py-2 font-medium text-ink-600">
                  {han}翻
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FU_ROWS.map((fu) => (
              <tr key={fu} className="border-t border-ink-400/10">
                <td className="px-1.5 py-1.5 text-left font-medium text-ink-900">{fu}</td>
                {HAN_COLUMNS.map((han) => {
                  const s = calculateHanFuScore(han, fu);
                  return (
                    <td key={han} className="px-1.5 py-1.5 leading-tight">
                      {mode === "ron" ? (
                        <>
                          <span className="block text-ink-900">子{s.nonDealerRon}</span>
                          <span className="block text-ink-400">親{s.dealerRon}</span>
                        </>
                      ) : (
                        <>
                          <span className="block text-ink-900">
                            子{s.nonDealerTsumoFromOther}/{s.nonDealerTsumoFromDealer}
                          </span>
                          <span className="block text-ink-400">親{s.dealerTsumoEach}オール</span>
                        </>
                      )}
                      {s.isMangan && <span className="block text-gold-600">(満貫)</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-400">
        {mode === "ron"
          ? "ロンした側が和了者にまとめて支払う点数です。"
          : "子ツモは「他の子から/親から」、親ツモは3人から同額を受け取ります。"}
      </p>

      <div>
        <p className="mb-1.5 text-xs font-semibold text-ink-900">5翻以上・頭打ち(符に関係なく翻のみで決定)</p>
        <Card className="divide-y divide-ink-400/10">
          {FIXED_SCORES.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div>
                <span className="block text-sm font-medium text-ink-900">{f.label}</span>
                <span className="block text-xs text-ink-400">{f.hanRange}</span>
              </div>
              <span className="shrink-0 text-right text-sm font-semibold text-board-800">
                子{f.nonDealerTotal.toLocaleString()}
                <span className="mx-1 text-ink-400">/</span>
                親{f.dealerTotal.toLocaleString()}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
