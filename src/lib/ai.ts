// AI 财务问答(P4):把账本聚合成紧凑事实 JSON,交给 LLM 回答自然语言问题
// 复用 OCR 的 provider 配置(OCR_PROVIDER / ANTHROPIC_API_KEY / ARK_*);OCR_MOCK=1 返回确定性演示回答

import Anthropic from "@anthropic-ai/sdk";
import type { Cat, Tx } from "./analytics";
import { categoryBreakdown, shiftMonth } from "./analytics";
import { formatCents } from "./money";
import { ocrProvider } from "./ocr";

export type FinanceContext = {
  month: string;
  expenseCents: number;
  incomeCents: number;
  prevExpenseCents: number;
  topCats: { name: string; cents: number }[];
  txCount: number;
};

// 聚合近况事实:只给 LLM 汇总数据,不外发逐笔明细(隐私最小化)
export function financeContext(txs: Tx[], cats: Cat[], month: string): FinanceContext {
  const inMonth = txs.filter((t) => t.date.startsWith(month + "-"));
  let expenseCents = 0, incomeCents = 0;
  for (const t of inMonth) {
    if (t.type === "expense") expenseCents += t.amountCents;
    if (t.type === "income") incomeCents += t.amountCents;
  }
  const prev = shiftMonth(month, -1);
  const prevExpenseCents = txs
    .filter((t) => t.type === "expense" && t.date.startsWith(prev + "-"))
    .reduce((a, t) => a + t.amountCents, 0);
  const topCats = categoryBreakdown(inMonth, cats, month).slice(0, 5)
    .map((r) => ({ name: r.name, cents: r.cents }));
  return { month, expenseCents, incomeCents, prevExpenseCents, topCats, txCount: inMonth.length };
}

const SYSTEM = `你是个人记账助手。只依据用户提供的 JSON 账本事实回答,金额以元为单位、保留两位小数;
事实里没有的信息要明说"账本数据不足",严禁编造数字。回答用中文,简洁(不超过 120 字)。`;

export async function askAI(question: string, ctx: FinanceContext): Promise<string> {
  if (process.env.OCR_MOCK === "1") {
    const top = ctx.topCats[0];
    return `【演示模式】${ctx.month} 支出 ${formatCents(ctx.expenseCents)},收入 ${formatCents(ctx.incomeCents)}` +
      (top ? `;支出最高分类是${top.name}(${formatCents(top.cents)})。` : "。") +
      `你的问题「${question}」在接入真实模型后将得到针对性回答。`;
  }
  const user = `账本事实(金额单位:分):${JSON.stringify(ctx)}\n\n问题:${question}`;
  if (ocrProvider() === "byteplus") {
    const baseUrl = process.env.ARK_BASE_URL ?? "https://ark.ap-southeast.bytepluses.com/api/v3";
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.ARK_API_KEY}` },
      body: JSON.stringify({
        model: process.env.ARK_MODEL_ID ?? "seed-2-0-lite-260228",
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }],
        max_tokens: 500,
      }),
    });
    if (!res.ok) throw new Error(`AI 请求失败(${res.status}):${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() || "(空回答)";
  }
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: process.env.OCR_MODEL ?? "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
  });
  const block = msg.content[0];
  return block?.type === "text" ? block.text.trim() : "(空回答)";
}
