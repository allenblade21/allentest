import { NextResponse } from "next/server";

// OCR 识别 API 占位:接收截图 → 调视觉模型 → 返回待确认清单(下个迭代实现)
export async function POST() {
  return NextResponse.json(
    { error: "OCR 识别接口尚未实现;将接入视觉大模型 API,输出结构化待确认记录" },
    { status: 501 },
  );
}
