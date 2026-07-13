import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { fundRecords } from "@/db/schema";
import { ocrConfigError, recognizeFundImage, toMediaType, type FundOcrRecord } from "@/lib/ocr";

export const maxDuration = 120;

export type PendingFund = FundOcrRecord & {
  id: string; // 客户端临时 id
  imagePath: string;
  date: string; // 默认今天,可改
  duplicate: boolean; // 同基金代码 + 同日期已有快照
};

// 基金 OCR 批量识别:上传持仓截图 → 待确认清单(不写库)
export async function POST(req: NextRequest) {
  const configErr = ocrConfigError();
  if (configErr) return NextResponse.json({ error: configErr }, { status: 400 });

  const form = await req.formData().catch(() => null);
  const files = form?.getAll("images").filter((f): f is File => f instanceof File) ?? [];
  const today = (form?.get("today") as string) || new Date().toISOString().slice(0, 10);
  if (files.length === 0) return NextResponse.json({ error: "请至少上传一张图片" }, { status: 400 });
  if (files.length > 10) return NextResponse.json({ error: "一次最多 10 张图片" }, { status: 400 });

  const uploadDir = path.join(process.cwd(), "data", "uploads");
  fs.mkdirSync(uploadDir, { recursive: true });

  const items: PendingFund[] = [];
  const errors: string[] = [];

  for (const [i, file] of files.entries()) {
    const mediaType = toMediaType(file.type);
    if (!mediaType) {
      errors.push(`${file.name}: 不支持的图片格式`);
      continue;
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const fileName = `fund-${Date.now()}-${i}.${mediaType.split("/")[1]}`;
    fs.writeFileSync(path.join(uploadDir, fileName), buf);
    const imagePath = `data/uploads/${fileName}`;

    try {
      const records = await recognizeFundImage(buf.toString("base64"), mediaType);
      for (const [j, r] of records.entries()) {
        items.push({
          ...r,
          id: `${fileName}-${j}`,
          imagePath,
          date: today,
          duplicate: r.code ? await isDuplicate(r.code, today) : false,
        });
      }
    } catch (e) {
      errors.push(`${file.name}: ${e instanceof Error ? e.message : "识别失败"}`);
    }
  }

  return NextResponse.json({ items, errors });
}

async function isDuplicate(code: string, date: string): Promise<boolean> {
  const rows = await db
    .select({ id: fundRecords.id })
    .from(fundRecords)
    .where(and(eq(fundRecords.fundCode, code), eq(fundRecords.date, date)))
    .limit(1);
  return rows.length > 0;
}
