/**
 * 年間シーズン・クォーター算出ロジック。
 * シーズン境界(例: 9/1〜翌8/31)をアプリ全体へハードコードせず、
 * Group.seasonStartMonth(1-12)を基準にDate計算で導出する(仕様28〜29章)。
 *
 * 重要: 本番(Vercel)はUTCで実行されるが、ユーザーは日本時間(JST, UTC+9固定/
 * DST無し)を前提にしている。実行環境のローカルタイムゾーンでnew Date(y,m,d)を
 * 組み立てると、サーバーの実行環境によって「今日」や季節の境界がズレてしまう
 * (例: 日本時間で9/1になっていてもUTCではまだ8/31)。そのため、この
 * ファイルの日付計算はすべて実行環境のタイムゾーンに依存しない
 * JST固定のUTC計算(toJstParts/fromJstParts)で行う。
 */

export type Quarter = 1 | 2 | 3 | 4;

export type DateRange = {
  start: Date;
  end: Date;
};

export type QuarterInfo = DateRange & {
  seasonYear: number;
  quarter: Quarter;
  label: string;
};

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 実行環境のタイムゾーンに関わらず、指定した瞬間の日本時間としての年月日を返す */
function toJstParts(date: Date): { year: number; monthIndex0: number; day: number } {
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    monthIndex0: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

/** 日本時間としての年月日時分秒ミリ秒から、対応する実際の瞬間(Date)を組み立てる */
function fromJstParts(
  year: number,
  monthIndex0: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0
): Date {
  return new Date(Date.UTC(year, monthIndex0, day, hour, minute, second, ms) - JST_OFFSET_MS);
}

const startOfDay = (year: number, monthIndex0: number, day: number): Date =>
  fromJstParts(year, monthIndex0, day, 0, 0, 0, 0);

/**
 * absoluteMonthIndex0の"前月末日23:59:59.999"を返す(日本時間基準)。
 * JSのDateは月のオーバーフローを自動的に年へ繰り上げるため、
 * シーズン開始月がどの月でも年跨ぎを正しく処理できる。
 */
const endOfMonthBefore = (year: number, absoluteMonthIndex0: number): Date =>
  fromJstParts(year, absoluteMonthIndex0, 0, 23, 59, 59, 999);

/** 日付が属する年間シーズンの開始年を返す(seasonStartMonthは1-12、日本時間基準で判定) */
export function getSeasonYear(date: Date, seasonStartMonth: number): number {
  const { year, monthIndex0 } = toJstParts(date);
  const startMonthIndex0 = seasonStartMonth - 1;
  return monthIndex0 >= startMonthIndex0 ? year : year - 1;
}

/** シーズン年度(開始年)から年間シーズンの期間を返す */
export function getSeasonRange(seasonYear: number, seasonStartMonth: number): DateRange {
  const startMonthIndex0 = seasonStartMonth - 1;
  return {
    start: startOfDay(seasonYear, startMonthIndex0, 1),
    end: endOfMonthBefore(seasonYear, startMonthIndex0 + 12),
  };
}

/** シーズン年度とクォーター番号からその期間を返す(うるう年・年跨ぎを正しく算出) */
export function getQuarterRange(
  seasonYear: number,
  quarter: Quarter,
  seasonStartMonth: number
): QuarterInfo {
  const startMonthIndex0 = seasonStartMonth - 1;
  const quarterStartAbs = startMonthIndex0 + (quarter - 1) * 3;
  return {
    seasonYear,
    quarter,
    start: startOfDay(seasonYear, quarterStartAbs, 1),
    end: endOfMonthBefore(seasonYear, quarterStartAbs + 3),
    label: `${seasonYear}年度 Q${quarter}`,
  };
}

/** 日付が属するクォーターを返す */
export function getQuarterForDate(date: Date, seasonStartMonth: number): QuarterInfo {
  const seasonYear = getSeasonYear(date, seasonStartMonth);
  for (const q of [1, 2, 3, 4] as Quarter[]) {
    const range = getQuarterRange(seasonYear, q, seasonStartMonth);
    if (date >= range.start && date <= range.end) {
      return range;
    }
  }
  // 理論上到達しないが、フォールバックとしてQ4を返す
  return getQuarterRange(seasonYear, 4, seasonStartMonth);
}

/** 指定シーズン年度の全4クォーターを順番に返す */
export function listQuarters(seasonYear: number, seasonStartMonth: number): QuarterInfo[] {
  return [1, 2, 3, 4].map((q) => getQuarterRange(seasonYear, q as Quarter, seasonStartMonth));
}

export function seasonLabel(
  seasonYear: number,
  seasonStartMonth: number,
  seasonNumberOffset?: number | null
): string {
  const endMonth = ((seasonStartMonth + 10) % 12) + 1; // 開始月の11ヶ月後(=season末月)
  const name =
    seasonNumberOffset != null ? `第${seasonYear + seasonNumberOffset}期` : `${seasonYear}年度シーズン`;
  return `${name} (${seasonYear}/${String(seasonStartMonth).padStart(2, "0")}〜${seasonYear + (seasonStartMonth === 1 ? 0 : 1)}/${String(endMonth).padStart(2, "0")})`;
}

/** ランキング画面のシーズン切り替えタブ等に使う短いラベル(例: 「第6期」「2025年度」) */
export function seasonShortLabel(seasonYear: number, seasonNumberOffset?: number | null): string {
  return seasonNumberOffset != null ? `第${seasonYear + seasonNumberOffset}期` : `${seasonYear}年度`;
}
