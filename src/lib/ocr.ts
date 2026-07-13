import Anthropic from "@anthropic-ai/sdk";

// OCR 识别:截图 → 结构化账目记录(视觉大模型,非传统 OCR)
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

type RawRecord = {
  type: "expense" | "income";
  amountYuan: number;
  merchant: string | null;
  date: string | null;
  time: string | null;
  categoryGuess: string | null;
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

// 配置检查:返回错误提示字符串,配置齐全则返回 null。route 层用它给出友好报错。
export function ocrConfigError(): string | null {
  if (process.env.OCR_MOCK === "1") return null;
  if (ocrProvider() === "byteplus") {
    if (!process.env.ARK_API_KEY) return "未配置 ARK_API_KEY(BytePlus ModelArk),无法识别。请在 .env.local 中设置后重启。";
    // ARK_MODEL_ID 不填则用默认 lite 模型,故不强制
    return null;
  }
  if (!process.env.ANTHROPIC_API_KEY) return "未配置 ANTHROPIC_API_KEY,无法识别。请在 .env.local 中设置后重启。";
  return null;
}

const OUTPUT_SCHEMA = {
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

function buildPrompt(categoryNames: string[], today: string, wantJsonHint: boolean): string {
  const base = `这张图片是一张账单相关的图片,可能是:支付宝/微信的账单列表截图(含多笔交易)、单笔支付详情截图、银行 App 交易明细截图,或纸质小票/发票的照片。

请识别出图中的全部交易记录,每笔一条:
- type: 支出为 "expense",收入/退款为 "income"
- amountYuan: 金额(元,正数)
- merchant: 商户/交易对方名称,没有则为 null
- date: 交易日期 "YYYY-MM-DD"。注意"今天/昨天"等相对日期按今天是 ${today} 换算;只有月日没有年份时按最近的过去日期推断;完全识别不到为 null
- time: 交易时间 "HH:mm",没有则为 null
- categoryGuess: 从这个列表中选最合适的分类名: ${categoryNames.join("、")};都不合适则为 null
- confidence: 金额和日期都清晰可读为 "high",任一模糊或靠猜测为 "low"

注意:忽略广告、余额、汇总行(如"本月支出合计"),只提取具体的单笔交易。图中没有任何交易记录时返回空数组。`;
  // byteplus 走 json_object 模式,不强制 schema,需在 prompt 里明确 JSON 结构
  if (wantJsonHint) {
    return (
      base +
      `\n\n只返回一个 JSON 对象,不要任何解释或 markdown 代码块,格式为:{"records":[{"type","amountYuan","merchant","date","time","categoryGuess","confidence"}, ...]}`
    );
  }
  return base;
}

/** 识别一张图片,返回结构化记录。OCR_MOCK=1 时返回固定样例(开发/测试用,不调 API)。 */
export async function recognizeImage(
  imageBase64: string,
  mediaType: MediaType,
  categoryNames: string[],
  today: string,
): Promise<OcrRecord[]> {
  if (process.env.OCR_MOCK === "1") {
    return mockRecords(today);
  }
  const raw =
    ocrProvider() === "byteplus"
      ? await recognizeWithByteplus(imageBase64, mediaType, categoryNames, today)
      : await recognizeWithClaude(imageBase64, mediaType, categoryNames, today);
  return normalize(raw);
}

async function recognizeWithClaude(
  imageBase64: string,
  mediaType: MediaType,
  categoryNames: string[],
  today: string,
): Promise<RawRecord[]> {
  const client = new Anthropic();
  const model = process.env.OCR_MODEL ?? "claude-opus-4-8";

  const response = await client.messages.create({
    model,
    max_tokens: 16000,
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: buildPrompt(categoryNames, today, false) },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("识别请求被安全策略拒绝,请换一张图片");
  }
  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  return parseRecords(text);
}

// BytePlus ModelArk:OpenAI 兼容的 chat completions(vision + json_object)
async function recognizeWithByteplus(
  imageBase64: string,
  mediaType: MediaType,
  categoryNames: string[],
  today: string,
): Promise<RawRecord[]> {
  const baseUrl = process.env.ARK_BASE_URL ?? "https://ark.ap-southeast.bytepluses.com/api/v3";
  // 默认 Doubao-Seed-2.0-lite(全模态含视觉,轻量便宜);可用 ARK_MODEL_ID 覆盖为
  // 更强的 vision 模型或控制台接入点 id(ep-...)
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
            { type: "text", text: buildPrompt(categoryNames, today, true) },
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
  const text = data.choices?.[0]?.message?.content ?? "";
  return parseRecords(text);
}

// 解析模型返回的 JSON 文本(容错:剥离可能的 markdown 代码块围栏)
function parseRecords(text: string): RawRecord[] {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: { records?: RawRecord[] };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("识别结果解析失败,请重试或换一张更清晰的图片");
  }
  return Array.isArray(parsed.records) ? parsed.records : [];
}

// 统一清洗:过滤非法金额、校验日期格式、转为整数分
function normalize(raw: RawRecord[]): OcrRecord[] {
  return raw
    .filter((r) => r && (r.type === "expense" || r.type === "income") && Number.isFinite(r.amountYuan) && r.amountYuan > 0)
    .map((r) => ({
      type: r.type,
      amountCents: Math.round(r.amountYuan * 100),
      merchant: r.merchant ?? null,
      date: typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : null,
      time: r.time ?? null,
      categoryGuess: r.categoryGuess ?? null,
      confidence: r.confidence === "low" ? "low" : "high",
    }));
}

function mockRecords(today: string): OcrRecord[] {
  const records: OcrRecord[] = [
    { type: "expense", amountCents: 1990, merchant: "瑞幸咖啡", date: today, time: "09:12", categoryGuess: "餐饮", confidence: "high" },
    { type: "expense", amountCents: 2350, merchant: "滴滴出行", date: today, time: "18:40", categoryGuess: "交通", confidence: "high" },
    { type: "expense", amountCents: 4500, merchant: "美团外卖", date: today, time: "12:03", categoryGuess: "餐饮", confidence: "high" },
    { type: "expense", amountCents: 0, merchant: "金额未识别样例", date: null, time: null, categoryGuess: null, confidence: "low" },
  ];
  return records;
}
