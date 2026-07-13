// 基金计算:投资总览汇总 + 单基金跨期序列

export type FundRecordRow = {
  id: number;
  fundCode: string;
  date: string;
  marketValueCents: number;
  shares: number | null;
  dayChangePct: number | null;
  holdingProfitCents: number | null;
  source: "manual" | "ocr";
};

export type FundInfo = { code: string; name: string };

// 单只基金:取最新快照,并算当日收益(市值 × 当日涨跌幅)
export type FundLatest = {
  code: string;
  name: string;
  latest: FundRecordRow;
  dayProfitCents: number; // 最新快照的当日收益额(涨跌幅折算)
};

export type Overview = {
  totalMarketValueCents: number;
  totalHoldingProfitCents: number;
  todayProfitCents: number;
  list: FundLatest[];
};

// 当日收益额 ≈ 市值 × 当日涨跌幅%(dayChangePct 为百分数,如 0.42 表示 +0.42%)
export function dayProfitCents(marketValueCents: number, dayChangePct: number | null): number {
  if (dayChangePct == null) return 0;
  return Math.round(marketValueCents * (dayChangePct / 100));
}

// 汇总投资总览:每只基金取最新一期快照
export function summarize(funds: FundInfo[], records: FundRecordRow[]): Overview {
  const nameOf = new Map(funds.map((f) => [f.code, f.name]));
  const byCode = new Map<string, FundRecordRow[]>();
  for (const r of records) {
    const arr = byCode.get(r.fundCode) ?? [];
    arr.push(r);
    byCode.set(r.fundCode, arr);
  }

  const list: FundLatest[] = [];
  for (const [code, rs] of byCode) {
    const sorted = [...rs].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const latest = sorted[0];
    list.push({
      code,
      name: nameOf.get(code) ?? code,
      latest,
      dayProfitCents: dayProfitCents(latest.marketValueCents, latest.dayChangePct),
    });
  }
  list.sort((a, b) => b.latest.marketValueCents - a.latest.marketValueCents);

  return {
    totalMarketValueCents: list.reduce((s, f) => s + f.latest.marketValueCents, 0),
    totalHoldingProfitCents: list.reduce((s, f) => s + (f.latest.holdingProfitCents ?? 0), 0),
    todayProfitCents: list.reduce((s, f) => s + f.dayProfitCents, 0),
    list,
  };
}

export type SeriesPoint = FundRecordRow & {
  periodChangePct: number | null; // 较上一期的区间涨跌幅(按市值)
};

export type FundSeries = {
  points: SeriesPoint[]; // 按日期升序
  totalChangePct: number | null; // 持有期总涨跌(首→末市值)
  maxPoint: FundRecordRow | null;
  minPoint: FundRecordRow | null;
};

// 单基金跨期序列:按日期升序,算相邻期区间涨跌 + 汇总
export function buildSeries(records: FundRecordRow[]): FundSeries {
  const asc = [...records].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const points: SeriesPoint[] = asc.map((r, i) => {
    const prev = asc[i - 1];
    const periodChangePct =
      prev && prev.marketValueCents > 0
        ? ((r.marketValueCents - prev.marketValueCents) / prev.marketValueCents) * 100
        : null;
    return { ...r, periodChangePct };
  });

  if (asc.length === 0) {
    return { points, totalChangePct: null, maxPoint: null, minPoint: null };
  }
  const first = asc[0];
  const last = asc[asc.length - 1];
  const totalChangePct =
    first.marketValueCents > 0
      ? ((last.marketValueCents - first.marketValueCents) / first.marketValueCents) * 100
      : null;
  const maxPoint = asc.reduce((m, r) => (r.marketValueCents > m.marketValueCents ? r : m), asc[0]);
  const minPoint = asc.reduce((m, r) => (r.marketValueCents < m.marketValueCents ? r : m), asc[0]);

  return { points, totalChangePct, maxPoint, minPoint };
}

export function fmtPct(pct: number | null): string {
  if (pct == null) return "—";
  return (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%";
}
