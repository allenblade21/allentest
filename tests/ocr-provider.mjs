// 验证 OCR 多 provider 分发逻辑(不需真实 API)。
// 用 tsx 运行:npx tsx tests/ocr-provider.mjs
import assert from "node:assert";

// 用 tsx 动态编译加载 TS 模块
const { recognizeImage, ocrConfigError, ocrProvider } = await import("../src/lib/ocr.ts");

let passed = 0;
const ok = (name) => { console.log("PASS", name); passed++; };

// 1. 默认 provider 是 claude
delete process.env.OCR_PROVIDER;
assert.equal(ocrProvider(), "claude");
ok("默认 provider = claude");

// 2. byteplus 只需 ARK_API_KEY;model 不填用默认 lite
process.env.OCR_PROVIDER = "byteplus";
delete process.env.ARK_API_KEY;
delete process.env.ARK_MODEL_ID;
delete process.env.OCR_MOCK;
assert.match(ocrConfigError(), /ARK_API_KEY/);
process.env.ARK_API_KEY = "test-key";
assert.equal(ocrConfigError(), null, "有 key 即可,model 可缺省");
ok("byteplus 配置检查(只需 ARK_API_KEY)");

// 2b. 未设 ARK_MODEL_ID 时默认用 lite 模型
let defaultModel;
globalThis.fetch = async (_url, init) => {
  defaultModel = JSON.parse(init.body).model;
  return { ok: true, json: async () => ({ choices: [{ message: { content: '{"records":[]}' } }] }) };
};
await recognizeImage("X", "image/png", [], "2026-07-12");
assert.equal(defaultModel, "seed-2-0-lite-260228", "默认 model = lite");
ok("未设 ARK_MODEL_ID 时默认 seed-2-0-lite-260228");

// 3. byteplus 分支:显式设 model,mock fetch 验证请求构造 + 响应解析
process.env.ARK_MODEL_ID = "ep-test";
let capturedUrl, capturedBody, capturedAuth;
globalThis.fetch = async (url, init) => {
  capturedUrl = url;
  capturedAuth = init.headers.Authorization;
  capturedBody = JSON.parse(init.body);
  return {
    ok: true,
    json: async () => ({
      choices: [{
        message: {
          content: JSON.stringify({
            records: [
              { type: "expense", amountYuan: 19.9, merchant: "瑞幸咖啡", date: "2026-07-12", time: "09:12", categoryGuess: "餐饮", confidence: "high" },
              { type: "expense", amountYuan: 0, merchant: "空金额应被过滤", date: null, time: null, categoryGuess: null, confidence: "low" },
            ],
          }),
        },
      }],
    }),
  };
};

const out = await recognizeImage("BASE64DATA", "image/png", ["餐饮", "交通"], "2026-07-12");
assert.ok(capturedUrl.includes("ark.ap-southeast.bytepluses.com/api/v3/chat/completions"), "端点正确");
assert.equal(capturedAuth, "Bearer test-key", "带 Bearer key");
assert.equal(capturedBody.model, "ep-test", "用 ARK_MODEL_ID");
assert.equal(capturedBody.response_format.type, "json_object", "json_object 模式");
const content = capturedBody.messages[0].content;
assert.ok(content.some((c) => c.type === "image_url" && c.image_url.url.startsWith("data:image/png;base64,")), "图片按 data URI 传");
assert.equal(out.length, 1, "过滤掉 0 金额,剩 1 条");
assert.equal(out[0].amountCents, 1990, "金额转整数分");
assert.equal(out[0].merchant, "瑞幸咖啡");
ok("byteplus 请求构造与响应解析正确");

// 4. markdown 围栏容错
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ choices: [{ message: { content: '```json\n{"records":[{"type":"income","amountYuan":100,"merchant":"工资","date":"2026-07-01","time":null,"categoryGuess":"工资","confidence":"high"}]}\n```' } }] }),
});
const out2 = await recognizeImage("X", "image/png", ["工资"], "2026-07-12");
assert.equal(out2.length, 1);
assert.equal(out2[0].amountCents, 10000);
ok("剥离 markdown 代码块围栏");

// 5. byteplus 返回非 2xx 时抛出可读错误
globalThis.fetch = async () => ({ ok: false, status: 401, text: async () => "invalid api key" });
await assert.rejects(() => recognizeImage("X", "image/png", [], "2026-07-12"), /401/);
ok("byteplus 错误响应抛可读错误");

// 6. OCR_MOCK 优先于 provider
process.env.OCR_MOCK = "1";
const mock = await recognizeImage("X", "image/png", [], "2026-07-12");
assert.ok(mock.length >= 3, "mock 模式返回样例");
ok("OCR_MOCK 优先,不调 fetch");

console.log(`\n${passed}/7 通过`);
