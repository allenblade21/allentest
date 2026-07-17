import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// 金额一律用整数「分」存储,避免浮点误差

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", { enum: ["expense", "income"] }).notNull(),
  icon: text("icon").default(""),
  color: text("color").default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull().default("cash"), // cash | wechat | alipay | bank | other
  initialBalanceCents: integer("initial_balance_cents").notNull().default(0),
});

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  type: text("type", { enum: ["expense", "income", "transfer"] }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  accountId: integer("account_id").references(() => accounts.id),
  date: text("date").notNull(), // YYYY-MM-DD
  time: text("time"), // HH:mm,可空
  merchant: text("merchant"),
  note: text("note"),
  source: text("source", { enum: ["manual", "ocr"] }).notNull().default("manual"),
  imagePath: text("image_path"), // OCR 原图,便于比对
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// 基金主档:同名基金按代码归一
export const funds = sqliteTable("funds", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
});

// 基金快照:每次 OCR/手动录入一条,构成时间序列
export const fundRecords = sqliteTable(
  "fund_records",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fundCode: text("fund_code")
      .notNull()
      .references(() => funds.code),
    date: text("date").notNull(), // 快照日期 YYYY-MM-DD
    marketValueCents: integer("market_value_cents").notNull(),
    shares: real("shares"), // 份额,可空(截图未必有)
    dayChangePct: real("day_change_pct"), // 当日涨跌幅,如 0.42 表示 +0.42%
    holdingProfitCents: integer("holding_profit_cents"),
    source: text("source", { enum: ["manual", "ocr"] }).notNull().default("manual"),
    imagePath: text("image_path"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [
    // 同一基金同一天只允许一条快照(重复导入提示覆盖或跳过)
    uniqueIndex("fund_records_code_date_unique").on(t.fundCode, t.date),
  ],
);

// OCR 导入批次:待确认清单的暂存区,确认后才写入正式表
export const ocrImportBatches = sqliteTable("ocr_import_batches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind", { enum: ["transaction", "fund"] }).notNull(),
  images: text("images", { mode: "json" }).$type<string[]>().notNull(),
  // 待确认项:识别字段 + 置信度 + 疑似重复标记 + 状态(pending/confirmed/discarded)
  items: text("items", { mode: "json" }).notNull(),
  status: text("status", { enum: ["recognizing", "pending", "done"] })
    .notNull()
    .default("recognizing"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// 分类月度预算:常设额度,每月生效(设一次,月月适用)
export const budgets = sqliteTable("budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id")
    .notNull()
    .unique()
    .references(() => categories.id),
  limitCents: integer("limit_cents").notNull(), // 月度限额,整数分
});

// 周期支出:订阅/房租等固定支出,到期提醒 +「记一笔并顺延」
export const recurring = sqliteTable("recurring", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  amountCents: integer("amount_cents").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  cycle: text("cycle", { enum: ["monthly", "yearly"] }).notNull().default("monthly"),
  nextDate: text("next_date").notNull(), // 下次支付日 YYYY-MM-DD
});

// 商户 → 分类 映射:用户修正一次后记住,越用越准
export const merchantRules = sqliteTable("merchant_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keyword: text("keyword").notNull().unique(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
});

// 用户与会话:访问保护(登录/注册)。账本数据为共享账本(家庭场景),不按用户隔离——见 ADR 0012
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // scrypt,格式 salt:hash
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tokenHash: text("token_hash").notNull().unique(), // sha256(cookie 中的明文 token)
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: text("expires_at").notNull(), // ISO 时间
});
