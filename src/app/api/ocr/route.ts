import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, merchantRules, transactions } from "@/db/schema";
import { recognizeImage, toMediaType, type OcrRecord } from "@/lib/ocr";
import { today } from "@/lib/date";

export const maxDuration = 120; // 多图识别可能较慢

export type PendingItem = OcrRecord & {
  id: string; // 客户端临时 id
  imagePath: string;
  categoryId: number | null;
  duplicate: boolean; // 疑似重复:金额+日期+商户 与已有账目匹配
};

// OCR 批量识别:上传多张截图 → 返回待确认清单(不写库)
export async function POST(req: NextRequest) {
  if (process.env.OCR_MOCK !== "1" && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "未配置 ANTHROPIC_API_KEY,无法识别。请在 .env.local 中设置后重启。" },
      { status: 400 },
    );
  }

  const form = await req.formData().catch(() => null);
  const files = form?.getAll("images").filter((f): f is File => f instanceof File) ?? [];
  if (files.length === 0) {
    return NextResponse.json({ error: "请至少上传一张图片" }, { status: 400 });
  }
  if (files.length > 10) {
    return NextResponse.json({ error: "一次最多 10 张图片" }, { status: 400 });
  }

  const cats = await db.select().from(categories);
  const rules = await db.select().from(merchantRules);
  const catNames = cats.map((c) => c.name);
  const todayStr = today();

  const uploadDir = path.join(process.cwd(), "data", "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });

  const items: PendingItem[] = [];
  const errors: string[] = [];

  for (const [i, file] of files.entries()) {
    const mediaType = toMediaType(file.type);
    if (!mediaType) {
      errors.push(`${file.name}: 不支持的图片格式`);
      continue;
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = mediaType.split("/")[1];
    const fileName = `${Date.now()}-${i}.${ext}`;
    fs.writeFileSync(path.join(uploadDir, fileName), buf);
    const imagePath = `data/uploads/${fileName}`;

    try {
      const records = await recognizeImage(buf.toString("base64"), mediaType, catNames, todayStr);
      for (const [j, r] of records.entries()) {
        items.push({
          ...r,
          id: `${fileName}-${j}`,
          imagePath,
          categoryId: await guessCategoryId(r, cats, rules),
          duplicate: await isDuplicate(r),
        });
      }
    } catch (e) {
      errors.push(`${file.name}: ${e instanceof Error ? e.message : "识别失败"}`);
    }
  }

  return NextResponse.json({ items, errors });
}

type Cat = { id: number; name: string; type: string };
type Rule = { keyword: string; categoryId: number };

// 分类推测:商户映射规则优先(用户修正过的记忆),其次模型给的分类名
async function guessCategoryId(r: OcrRecord, cats: Cat[], rules: Rule[]): Promise<number | null> {
  if (r.merchant) {
    const rule = rules.find((rule) => r.merchant!.includes(rule.keyword));
    if (rule) return rule.categoryId;
  }
  if (r.categoryGuess) {
    const cat = cats.find((c) => c.name === r.categoryGuess && c.type === r.type);
    if (cat) return cat.id;
  }
  return null;
}

// 去重:金额 + 日期 + 商户 三项与已有账目匹配 → 疑似重复
async function isDuplicate(r: OcrRecord): Promise<boolean> {
  if (!r.date || !r.merchant) return false;
  const rows = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.amountCents, r.amountCents),
        eq(transactions.date, r.date),
        eq(transactions.merchant, r.merchant),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
