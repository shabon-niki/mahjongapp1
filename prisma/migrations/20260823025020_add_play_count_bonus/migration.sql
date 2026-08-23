-- AlterTable
ALTER TABLE "group_rules" ADD COLUMN     "play_count_bonus_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "play_count_bonus_top1" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "play_count_bonus_top2" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "play_count_bonus_top3" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "play_count_penalty_worst1" INTEGER NOT NULL DEFAULT -3,
ADD COLUMN     "play_count_penalty_worst2" INTEGER NOT NULL DEFAULT -2,
ADD COLUMN     "play_count_penalty_worst3" INTEGER NOT NULL DEFAULT -1;
