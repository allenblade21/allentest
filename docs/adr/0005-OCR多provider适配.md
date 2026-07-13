# ADR 0005 — OCR 多 provider 适配(claude / byteplus)

状态:✅ 生效 · 2026-07

## 背景

不同用户对 OCR 引擎诉求不同:成本(豆包/BytePlus 便宜)、数据合规(海外部署不入境中国大陆)、零改动上手(Claude 改环境变量即可)。锁死单一 provider 不够灵活。

## 决策

`src/lib/ocr.ts` 做**多 provider 适配**,用 `OCR_PROVIDER` 环境变量切换:

- `claude`(默认):Anthropic Messages API,`output_config.format` 强约束 JSON。
- `byteplus`:火山引擎海外版 ModelArk(OpenAI 兼容 REST,原生 fetch 无新依赖),`json_object` 模式;默认模型 `seed-2-0-lite-260228`,`ARK_MODEL_ID` 可覆盖。
- `OCR_MOCK=1`:返回样例数据,不调 API(开发/测试用)。

统一 `ocrConfigError()` 按 provider 检查对应 Key;`normalize()` 统一清洗金额/日期。

## 后果

- ✅ 一个环境变量切换引擎;byteplus 走原生 fetch,不引入 openai 依赖。
- ✅ 可 claude 复杂票据兜底 + byteplus 日常省钱。
- 约束:新增 provider 在 `recognizeImage` 分发处加分支,并补 `tests/ocr-provider.mjs` 用例。
