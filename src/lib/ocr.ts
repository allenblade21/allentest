import Anthropic from "@anthropic-ai/sdk";

// OCR 识别:截图 → 结构化记录(视觉大模型,非传统 OCR)
// 所有结果都是「待确认记录」,必须经用户校对后才入账
//
// 多 provider:OCR_PROVIDER=claude(默认)| byteplus
//   - claude:  Anthropic Messages API,ANTHROPIC_API_KEY
//   - byteplus: 火山引擎海外版 ModelArk(OpenAI 兼容),ARK_API_KEY + ARK_MODEL_ID

export type OcrRecord = {
  type: "expense" | "income";
  amountCents: number;
  merchant: string | null;
  date: string | null; // YYYY-MM-DD,识别不到为 null
  time: string | null; // HH:mm
  categoryGuess: string | null; // 分类名称推测
  confidence: "high" | "low"; // low = 界面上标「存疑」
};

export type FundOcrRecord = {
  name: string;
  code: string | null; // 基金代码,识别不到为 null(界面提示绑定)
  marketValueCents: number;
  shares: number | null;
  dayChangePct: number | null; // 当日涨跌幅百分数,如 0.42
  holdingProfitCents: number | null;
  confidence: "high" | "low";
};

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

export function toMediaType(mime: string): MediaType | null {
  return (MEDIA_TYPES as readonly string[]).includes(mime) ? (mime as MediaType) : null;
}

export function ocrProvider(): "claude" | "byteplus" {
  return process.env.OCR_PROVIDER === "byteplus" ? "byteplus" : "claude";
}

// 配置检查:返回错误提示字符串,配置齐全则返回 null。
export function ocrConfigError(): string | null {
  if (process.env.OCR_MOCK === "1") return null;
  if (ocrProvider() === "byteplus") {
    if (!process.env.ARK_API_KEY) return "未配置 ARK_API_KEY(BytePlus ModelArk),无法识别。请在 .env.local 中设置后重启。";
    return null;
  }
  if (!process.env.ANTHROPIC_API_KEY) return "未配置 ANTHROPIC_API_KEY,无法识别。请在 .env.local 中设置后重启。";
  return null;
}

// ============ 通用视觉调用(两 provider 共用) ============

/** 调用视觉模型,返回文本(应为 JSON)。schema 仅对 claude 强约束。 */
async function callVision(
  imageBase64: string,
  mediaType: MediaType,
  prompt: string,
  schema: Record<string, unknown>,
): Promise<string> {
  if (ocrProvider() === "byteplus") {
    const baseUrl = process.env.ARK_BASE_URL ?? "https://ark.ap-southeast.bytepluses.com/api/v3";
    const model = process.env.ARK_MODEL_ID ?? "seed-2-0-lite-260228";
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ARK_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`BytePlus 识别失败(${res.status})${detail ? ": " + detail.slice(0, 200) : ""}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? "";
  }

  const client = new Anthropic();
  const model = process.env.OCR_MODEL ?? "claude-opus-4-8";
  const response = await client.messages.create({
    model,
    max_tokens: 16000,
    output_config: { format: { type: "json_schema", schema } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") {
    throw new Error("识别请求被安全策略拒绝,请换一张图片");
  }
  return response.content.find((b) => b.type === "text")?.text ?? "";
}

// 解析模型返回的 JSON(容错:剥离 markdown 围栏)
function parseJson<T>(text: string): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error("识别结果解析失败,请重试或换一张更清晰的图片");
  }
}

const wantsJsonHint = () => ocrProvider() === "byteplus";

// ============ 交易识别 ============

const TX_SCHEMA = {
  type: "object",
  properties: {
    records: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["expense", "income"] },
          amountYuan: { type: "number" },
          merchant: { type: ["string", "null"] },
          date: { type: ["string", "null"] },
          time: { type: ["string", "null"] },
          categoryGuess: { type: ["string", "null"] },
          confidence: { type: "string", enum: ["high", "low"] },
        },
        required: ["type", "amountYuan", "merchant", "date", "time", "categoryGuess", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["records"],
  additionalProperties: false,
} as const;

function txPrompt(categoryNames: string[], today: string): string {
  const base = `这张图片是一张账单相关的图片,可能是:支付宝/微信的账单列表截图(含多笔交易)、单笔支付详情截图、银行 App 交易明细截图,或纸质小票/发票的照片。

请识别出图中的全部交易记录,每笔一条:
- type: 支出为 "expense",收入/退款为 "income"
- amountYuan: 金额(元,正数)
- merchant: 商户/交易对方名称,没有则为 null
- date: 交易日期 "YYYY-MM-DD"。"今天/昨天"按今天是 ${today} 换算;只有月日按最近的过去日期推断;识别不到为 null
- time: 交易时间 "HH:mm",没有则为 null
- categoryGuess: 从这个列表选最合适的分类名: ${categoryNames.join("、")};都不合适则为 null
- confidence: 金额和日期都清晰可读为 "high",任一模糊或靠猜测为 "low"

忽略广告、余额、汇总行,只提取具体的单笔交易。没有交易记录时返回空数组。`;
  return wantsJsonHint()
    ? base + `\n\n只返回一个 JSON 对象,不要解释或代码块,格式:{"records":[{"type","amountYuan","merchant","date","time","categoryGuess","confidence"}, ...]}`
    : base;
}

export async function recognizeImage(
  imageBase64: string,
  mediaType: MediaType,
  categoryNames: string[],
  today: string,
): Promise<OcrRecord[]> {
  if (process.env.OCR_MOCK === "1") return mockTxRecords(today);
  const text = await callVision(imageBase64, mediaType, txPrompt(categoryNames, today), TX_SCHEMA);
  const parsed = parseJson<{ records?: Array<Record<string, unknown>> }>(text);
  const raw = Array.isArray(parsed.records) ? parsed.records : [];
  return raw
    .filter((r) => (r.type === "expense" || r.type === "income") && Number.isFinite(r.amountYuan) && (r.amountYuan as number) > 0)
    .map((r) => ({
      type: r.type as "expense" | "income",
      amountCents: Math.round((r.amountYuan as number) * 100),
      merchant: (r.merchant as string) ?? null,
      date: typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : null,
      time: (r.time as string) ?? null,
      categoryGuess: (r.categoryGuess as string) ?? null,
      confidence: r.confidence === "low" ? "low" : "high",
    }));
}

// ============ 基金识别 ============

const FUND_SCHEMA = {
  type: "object",
  properties: {
    records: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          code: { type: ["string", "null"] },
          marketValueYuan: { type: "number" },
          shares: { type: ["number", "null"] },
          dayChangePct: { type: ["number", "null"] },
          holdingProfitYuan: { type: ["number", "null"] },
          confidence: { type: "string", enum: ["high", "low"] },
        },
        required: ["name", "code", "marketValueYuan", "shares", "dayChangePct", "holdingProfitYuan", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["records"],
  additionalProperties: false,
} as const;

function fundPrompt(): string {
  const base = `这张图片是基金 App(支付宝基金/天天基金/银行/券商)的持仓列表或单只基金收益截图。

请识别出图中每一只基金的持仓,每只一条:
- name: 基金名称
- code: 基金代码(6 位数字),识别不到为 null
- marketValueYuan: 当前持有市值(元)
- shares: 持有份额,没有则 null
- dayChangePct: 当日涨跌幅百分数(如 +0.42% 记 0.42,跌记负数),没有则 null
- holdingProfitYuan: 持有收益(元,亏损为负),没有则 null
- confidence: 名称/代码/市值都清晰为 "high",任一模糊或靠猜测为 "low"

忽略汇总行(如"总资产""总收益")。没有基金时返回空数组。`;
  return wantsJsonHint()
    ? base + `\n\n只返回一个 JSON 对象,不要解释或代码块,格式:{"records":[{"name","code","marketValueYuan","shares","dayChangePct","holdingProfitYuan","confidence"}, ...]}`
    : base;
}

export async function recognizeFundImage(
  imageBase64: string,
  mediaType: MediaType,
): Promise<FundOcrRecord[]> {
  if (process.env.OCR_MOCK === "1") return mockFundRecords();
  const text = await callVision(imageBase64, mediaType, fundPrompt(), FUND_SCHEMA);
  const parsed = parseJson<{ records?: Array<Record<string, unknown>> }>(text);
  const raw = Array.isArray(parsed.records) ? parsed.records : [];
  return raw
    .filter((r) => typeof r.name === "string" && Number.isFinite(r.marketValueYuan) && (r.marketValueYuan as number) > 0)
    .map((r) => ({
      name: r.name as string,
      code: typeof r.code === "string" && /^\d{6}$/.test(r.code) ? r.code : null,
      marketValueCents: Math.round((r.marketValueYuan as number) * 100),
      shares: Number.isFinite(r.shares) ? (r.shares as number) : null,
      dayChangePct: Number.isFinite(r.dayChangePct) ? (r.dayChangePct as number) : null,
      holdingProfitCents: Number.isFinite(r.holdingProfitYuan) ? Math.round((r.holdingProfitYuan as number) * 100) : null,
      confidence: r.confidence === "low" ? "low" : "high",
    }));
}

// ============ mock 数据 ============

function mockTxRecords(today: string): OcrRecord[] {
  return [
    { type: "expense", amountCents: 1990, merchant: "瑞幸咖啡", date: today, time: "09:12", categoryGuess: "餐饮", confidence: "high" },
    { type: "expense", amountCents: 2350, merchant: "滴滴出行", date: today, time: "18:40", categoryGuess: "交通", confidence: "high" },
    { type: "expense", amountCents: 4500, merchant: "美团外卖", date: today, time: "12:03", categoryGuess: "餐饮", confidence: "high" },
    { type: "expense", amountCents: 0, merchant: "金额未识别样例", date: null, time: null, categoryGuess: null, confidence: "low" },
  ];
}

function mockFundRecords(): FundOcrRecord[] {
  return [
    { name: "华夏沪深300ETF联接A", code: "000051", marketValueCents: 2015000, shares: 12000, dayChangePct: 0.4, holdingProfitCents: 115000, confidence: "high" },
    { name: "易方达蓝筹精选混合", code: "005827", marketValueCents: 1540000, shares: 6800, dayChangePct: -2.1, holdingProfitCents: -32000, confidence: "high" },
    { name: "天弘余额宝货币", code: "000198", marketValueCents: 1023000, shares: null, dayChangePct: 0.01, holdingProfitCents: 3000, confidence: "high" },
    { name: "招商中证白酒指数A", code: null, marketValueCents: 656000, shares: null, dayChangePct: -4.5, holdingProfitCents: -80000, confidence: "low" },
  ];
}
