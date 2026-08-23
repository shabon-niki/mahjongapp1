"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { UMA_PRESETS, UMA_CUSTOM_KEY, OKA_PRESETS, CHIP_PRESETS } from "@/lib/mahjong/rulePresets";

function num(formData: FormData, key: string, fallback: number): number {
  const v = formData.get(key);
  if (v === null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function updateGroupRule(groupId: string, formData: FormData) {
  await requireOwner(groupId);

  const umaPreset = String(formData.get("umaPreset") ?? UMA_CUSTOM_KEY);
  const uma =
    umaPreset === UMA_CUSTOM_KEY
      ? {
          umaFirst: num(formData, "umaFirst", 20),
          umaSecond: num(formData, "umaSecond", 10),
          umaThird: num(formData, "umaThird", -10),
          umaFourth: num(formData, "umaFourth", -20),
        }
      : (() => {
          const preset = UMA_PRESETS.find((p) => p.key === umaPreset) ?? UMA_PRESETS[2];
          return {
            umaFirst: preset.first,
            umaSecond: preset.second,
            umaThird: preset.third,
            umaFourth: preset.fourth,
          };
        })();

  const okaPreset = String(formData.get("okaPreset") ?? "5000");
  const okaMatch = OKA_PRESETS.find((p) => p.key === okaPreset) ?? OKA_PRESETS[0];

  const chipPreset = String(formData.get("chipPreset") ?? "none");
  const chipMatch = CHIP_PRESETS.find((p) => p.key === chipPreset) ?? CHIP_PRESETS[0];

  const roundingRule = String(formData.get("roundingRule") ?? "asis");
  const tieRule = String(formData.get("tieRule") ?? "seat_order");
  const penaltyPreset = String(formData.get("penaltyPreset") ?? "off");
  const resultEntryPermission = String(formData.get("resultEntryPermission") ?? "all_members");

  await prisma.groupRule.update({
    where: { groupId },
    data: {
      startingPoints: num(formData, "startingPoints", 25000),
      ...uma,
      okaEnabled: okaMatch.enabled,
      okaPoints: okaMatch.points || num(formData, "okaPoints", 5000),
      chipEnabled: chipMatch.enabled,
      chipValue: chipMatch.value || num(formData, "chipValue", 1000),
      redDoraChipEnabled: formData.get("redDoraChipEnabled") === "on",
      ippatsuChipEnabled: formData.get("ippatsuChipEnabled") === "on",
      uraDoraChipEnabled: formData.get("uraDoraChipEnabled") === "on",
      bustPenaltyEnabled: penaltyPreset === "on",
      bustPenaltyValue: penaltyPreset === "on" ? num(formData, "bustPenaltyValue", 0) : 0,
      yakitoriEnabled: formData.get("yakitoriEnabled") === "on",
      roundingRule: ["asis", "gosha_rokunyu"].includes(roundingRule) ? roundingRule : "asis",
      tieRule: ["seat_order", "shared_rank"].includes(tieRule) ? tieRule : "seat_order",
      resultEntryPermission: ["all_members", "owner_only"].includes(resultEntryPermission)
        ? resultEntryPermission
        : "all_members",
      playCountBonusEnabled: formData.get("playCountBonusEnabled") === "on",
      playCountBonusTop1: num(formData, "playCountBonusTop1", 3),
      playCountBonusTop2: num(formData, "playCountBonusTop2", 2),
      playCountBonusTop3: num(formData, "playCountBonusTop3", 1),
      playCountPenaltyWorst1: num(formData, "playCountPenaltyWorst1", -3),
      playCountPenaltyWorst2: num(formData, "playCountPenaltyWorst2", -2),
      playCountPenaltyWorst3: num(formData, "playCountPenaltyWorst3", -1),
    },
  });

  revalidatePath(`/g/${groupId}/settings`);
}
