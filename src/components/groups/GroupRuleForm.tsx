"use client";

import { useState } from "react";
import { updateGroupRule } from "@/app/g/[groupId]/settings/actions";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import {
  UMA_PRESETS,
  UMA_CUSTOM_KEY,
  findUmaPresetKey,
  OKA_PRESETS,
  findOkaPresetKey,
  STARTING_POINTS_PRESETS,
  CHIP_PRESETS,
  findChipPresetKey,
  ROUNDING_OPTIONS,
  PENALTY_OPTIONS,
  RESULT_ENTRY_PERMISSION_OPTIONS,
} from "@/lib/mahjong/rulePresets";

type Rule = {
  startingPoints: number;
  umaFirst: number;
  umaSecond: number;
  umaThird: number;
  umaFourth: number;
  okaEnabled: boolean;
  okaPoints: number;
  chipEnabled: boolean;
  chipValue: number;
  redDoraChipEnabled: boolean;
  ippatsuChipEnabled: boolean;
  uraDoraChipEnabled: boolean;
  bustPenaltyEnabled: boolean;
  bustPenaltyValue: number;
  yakitoriEnabled: boolean;
  roundingRule: string;
  tieRule: string;
  resultEntryPermission: string;
  playCountBonusEnabled: boolean;
  playCountBonusTop1: number;
  playCountBonusTop2: number;
  playCountBonusTop3: number;
  playCountPenaltyWorst1: number;
  playCountPenaltyWorst2: number;
  playCountPenaltyWorst3: number;
};

const pointInputClass =
  "w-full rounded-lg border border-ink-400/30 bg-washi-100 px-2 py-2 text-center text-sm outline-none focus:border-gold-500";

const selectClass =
  "w-full rounded-lg border border-ink-400/30 bg-washi-100 px-3 py-2 text-sm outline-none focus:border-gold-500";

export function GroupRuleForm({ groupId, rule }: { groupId: string; rule: Rule }) {
  const [umaPreset, setUmaPreset] = useState(findUmaPresetKey(rule));
  const [penaltyPreset, setPenaltyPreset] = useState(rule.bustPenaltyEnabled ? "on" : "off");
  const [playCountBonusEnabled, setPlayCountBonusEnabled] = useState(rule.playCountBonusEnabled);

  return (
    <form action={updateGroupRule.bind(null, groupId)} className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-900">持ち点</label>
        <select
          name="startingPoints"
          defaultValue={rule.startingPoints}
          className={selectClass}
        >
          {STARTING_POINTS_PRESETS.map((v) => (
            <option key={v} value={v}>
              {v.toLocaleString()}点
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-900">
          ウマ
          <span className="ml-1 font-normal text-ink-400">(2位差-1位差)</span>
        </label>
        <select
          name="umaPreset"
          value={umaPreset}
          onChange={(e) => setUmaPreset(e.target.value)}
          className={selectClass}
        >
          {UMA_PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
          <option value={UMA_CUSTOM_KEY}>カスタム</option>
        </select>

        {umaPreset === UMA_CUSTOM_KEY && (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[
              { name: "umaFirst", label: "1位", value: rule.umaFirst },
              { name: "umaSecond", label: "2位", value: rule.umaSecond },
              { name: "umaThird", label: "3位", value: rule.umaThird },
              { name: "umaFourth", label: "4位", value: rule.umaFourth },
            ].map((u) => (
              <div key={u.name}>
                <span className="mb-1 block text-center text-xs text-ink-400">{u.label}</span>
                <input
                  type="number"
                  name={u.name}
                  defaultValue={u.value}
                  className="w-full rounded-lg border border-ink-400/30 bg-washi-100 px-2 py-2 text-center text-sm outline-none focus:border-gold-500"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-900">
          オカ
          <span className="ml-1 font-normal text-ink-400">(1位への加算点)</span>
        </label>
        <select name="okaPreset" defaultValue={findOkaPresetKey(rule)} className={selectClass}>
          {OKA_PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-900">
          チップレート
          <span className="ml-1 font-normal text-ink-400">(枚数は対局ごとに手入力)</span>
        </label>
        <select name="chipPreset" defaultValue={findChipPresetKey(rule)} className={selectClass}>
          {CHIP_PRESETS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-900">
          スコア計算における端数の取扱
        </label>
        <select name="roundingRule" defaultValue={rule.roundingRule} className={selectClass}>
          {ROUNDING_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink-900">
          ペナルティー機能
          <span className="ml-1 font-normal text-ink-400">(チョンボ等の記録用)</span>
        </label>
        <select
          name="penaltyPreset"
          value={penaltyPreset}
          onChange={(e) => setPenaltyPreset(e.target.value)}
          className={selectClass}
        >
          {PENALTY_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        {penaltyPreset === "on" && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-ink-600">ペナルティ点</span>
            <input
              type="number"
              name="bustPenaltyValue"
              defaultValue={rule.bustPenaltyValue || 10000}
              className="w-24 rounded-lg border border-ink-400/30 bg-washi-100 px-2 py-1.5 text-center text-sm outline-none focus:border-gold-500"
            />
          </div>
        )}
      </div>

      <div className="border-t border-ink-400/10 pt-4">
        <label className="mb-1 block text-sm font-medium text-ink-900">成績入力権限</label>
        <select
          name="resultEntryPermission"
          defaultValue={rule.resultEntryPermission}
          className={selectClass}
        >
          {RESULT_ENTRY_PERMISSION_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="border-t border-ink-400/10 pt-4">
        <Toggle
          name="playCountBonusEnabled"
          label="対局数ボーナス"
          description="期間内の対局数(半荘数)TOP3に加点、WORST3に加点(通常は負の値)します"
          defaultChecked={rule.playCountBonusEnabled}
          onChange={setPlayCountBonusEnabled}
        />
        {playCountBonusEnabled && (
          <div className="mt-3 space-y-3">
            <div>
              <p className="mb-1 text-xs text-ink-400">対局数TOP3への加点</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { name: "playCountBonusTop1", label: "1位", value: rule.playCountBonusTop1 },
                  { name: "playCountBonusTop2", label: "2位", value: rule.playCountBonusTop2 },
                  { name: "playCountBonusTop3", label: "3位", value: rule.playCountBonusTop3 },
                ].map((f) => (
                  <div key={f.name}>
                    <span className="mb-1 block text-center text-xs text-ink-400">{f.label}</span>
                    <input
                      type="number"
                      name={f.name}
                      defaultValue={f.value}
                      className={pointInputClass}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs text-ink-400">対局数WORST3への加点(通常は負の値)</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    name: "playCountPenaltyWorst1",
                    label: "1位",
                    value: rule.playCountPenaltyWorst1,
                  },
                  {
                    name: "playCountPenaltyWorst2",
                    label: "2位",
                    value: rule.playCountPenaltyWorst2,
                  },
                  {
                    name: "playCountPenaltyWorst3",
                    label: "3位",
                    value: rule.playCountPenaltyWorst3,
                  },
                ].map((f) => (
                  <div key={f.name}>
                    <span className="mb-1 block text-center text-xs text-ink-400">{f.label}</span>
                    <input
                      type="number"
                      name={f.name}
                      defaultValue={f.value}
                      className={pointInputClass}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <details className="rounded-xl border border-ink-400/15 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-board-800">
          詳細ルール
        </summary>
        <div className="mt-4 space-y-4">
          <div className="space-y-3">
            <p className="text-xs text-ink-400">
              チップが発生する状況(記録は対局ごとに手入力します)
            </p>
            <Toggle
              name="redDoraChipEnabled"
              label="赤ドラチップ"
              defaultChecked={rule.redDoraChipEnabled}
            />
            <Toggle
              name="ippatsuChipEnabled"
              label="一発チップ"
              defaultChecked={rule.ippatsuChipEnabled}
            />
            <Toggle
              name="uraDoraChipEnabled"
              label="裏ドラチップ"
              defaultChecked={rule.uraDoraChipEnabled}
            />
          </div>

          <div className="border-t border-ink-400/10 pt-3">
            <Toggle
              name="yakitoriEnabled"
              label="焼き鳥"
              description="ルールとして記録しますが、精算は対局外で行ってください"
              defaultChecked={rule.yakitoriEnabled}
            />
          </div>

          <div className="border-t border-ink-400/10 pt-3">
            <label className="mb-1 block text-sm font-medium text-ink-900">同点時の順位</label>
            <select name="tieRule" defaultValue={rule.tieRule} className={selectClass}>
              <option value="seat_order">起家からの順で決める</option>
              <option value="shared_rank">同着として順位を分け合う</option>
            </select>
          </div>
        </div>
      </details>

      <Button type="submit" variant="secondary" className="w-full">
        保存する
      </Button>
    </form>
  );
}
