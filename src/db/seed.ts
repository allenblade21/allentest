import { db } from "./index";
import { accounts, categories } from "./schema";

// 默认分类与账户,幂等:已有数据时跳过
async function seed() {
  const existing = await db.select().from(categories).limit(1);
  if (existing.length > 0) {
    console.log("已有数据,跳过 seed");
    return;
  }

  await db.insert(categories).values([
    { name: "餐饮", type: "expense", icon: "🍚", sortOrder: 1 },
    { name: "交通", type: "expense", icon: "🚇", sortOrder: 2 },
    { name: "购物", type: "expense", icon: "🛒", sortOrder: 3 },
    { name: "居住", type: "expense", icon: "🏠", sortOrder: 4 },
    { name: "娱乐", type: "expense", icon: "🎬", sortOrder: 5 },
    { name: "医疗", type: "expense", icon: "💊", sortOrder: 6 },
    { name: "人情", type: "expense", icon: "🎁", sortOrder: 7 },
    { name: "其他支出", type: "expense", icon: "📦", sortOrder: 8 },
    { name: "工资", type: "income", icon: "💰", sortOrder: 1 },
    { name: "理财", type: "income", icon: "📈", sortOrder: 2 },
    { name: "其他收入", type: "income", icon: "🧧", sortOrder: 3 },
  ]);

  await db.insert(accounts).values([
    { name: "现金", type: "cash" },
    { name: "微信支付", type: "wechat" },
    { name: "支付宝", type: "alipay" },
  ]);

  console.log("seed 完成:默认分类与账户已写入");
}

seed();
