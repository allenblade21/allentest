// 测试报告生成:读取 playwright-report/results.json → 写 docs/测试报告.md
// 用法:npx playwright test 之后执行 npm run test:doc(或 node scripts/test-report.mjs)
import fs from "node:fs";

const SRC = "playwright-report/results.json";
const OUT = "docs/测试报告.md";
if (!fs.existsSync(SRC)) {
  console.error(`找不到 ${SRC},先跑 npx playwright test`);
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(SRC, "utf8"));

// 展开所有用例(suites 可嵌套)
const rows = [];
(function walk(suites, file) {
  for (const s of suites ?? []) {
    const f = s.file ?? file;
    for (const spec of s.specs ?? []) {
      const r = spec.tests?.[0]?.results?.[0];
      rows.push({
        file: f,
        title: spec.title,
        ok: spec.ok,
        ms: r?.duration ?? 0,
        error: r?.error?.message?.split("\n")[0] ?? "",
      });
    }
    walk(s.suites, f);
  }
})(data.suites);

// 按 spec 文件分组(文件 ↔ TC 组 ↔ 功能模块)
const GROUP_NAMES = {
  "navigation.spec.ts": "页面与导航(TC-N)",
  "transactions.spec.ts": "手动记账(TC-T)",
  "ocr.spec.ts": "OCR 批量导入(TC-O)",
  "batch.spec.ts": "批量修改与撤销(TC-B)",
  "funds.spec.ts": "基金模块(TC-F)",
  "analysis.spec.ts": "消费分析(TC-A)",
  "budget.spec.ts": "预算体系(TC-BG)",
  "recurring.spec.ts": "周期支出(TC-RC)",
  "auth.spec.ts": "认证与访问保护(TC-AU)",
};
const groups = new Map();
for (const r of rows) {
  const key = r.file.split("/").pop();
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

const passed = rows.filter((r) => r.ok).length;
const failed = rows.length - passed;
const totalSec = (rows.reduce((a, r) => a + r.ms, 0) / 1000).toFixed(1);
const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

let md = `# 测试报告

> 由 \`npm run test:doc\` 从最近一次 Playwright 运行结果自动生成,勿手改。
> 交互式明细(截图/trace)看 \`npm run test:report\`;用例定义见 [测试用例.md](测试用例.md)。

- **生成时间**:${stamp}
- **结果**:${failed === 0 ? "✅ 全部通过" : `❌ ${failed} 例失败`} — ${passed}/${rows.length} 通过,累计用时 ${totalSec}s
- 另有 OCR provider 单测 7 例(\`npx tsx tests/ocr-provider.mjs\`,不在本表)

## 按功能模块

| 功能模块 | 用例数 | 通过 | 结果 |
|----------|-------:|-----:|------|
`;
for (const [file, list] of [...groups].sort()) {
  const ok = list.filter((r) => r.ok).length;
  md += `| ${GROUP_NAMES[file] ?? file} | ${list.length} | ${ok} | ${ok === list.length ? "✅" : "❌"} |\n`;
}
md += `| **合计** | **${rows.length}** | **${passed}** | ${failed === 0 ? "**✅**" : "**❌**"} |\n\n## 用例明细\n\n`;
for (const [file, list] of [...groups].sort()) {
  md += `### ${GROUP_NAMES[file] ?? file}\n\n| 用例 | 结果 | 用时 |\n|------|------|-----:|\n`;
  for (const r of list) {
    md += `| ${r.title} | ${r.ok ? "✅" : `❌ ${r.error}`} | ${(r.ms / 1000).toFixed(1)}s |\n`;
  }
  md += "\n";
}

fs.writeFileSync(OUT, md);
console.log(`测试报告已生成:${OUT}(${passed}/${rows.length} 通过)`);
if (failed > 0) process.exit(1);
