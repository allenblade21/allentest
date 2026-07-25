// 分类/账户管理的入参校验(路由文件不允许导出额外函数,故独立成 lib)

export function validateCategory(b: { name?: unknown; type?: unknown; icon?: unknown }): string | null {
  if (typeof b.name !== "string" || !b.name.trim() || b.name.trim().length > 8) return "分类名需 1-8 字";
  if (b.type !== undefined && b.type !== "expense" && b.type !== "income") return "类型仅支持 expense | income";
  if (b.icon !== undefined && (typeof b.icon !== "string" || b.icon.length > 8)) return "图标过长";
  return null;
}

export function validateAccount(b: { name?: unknown }): string | null {
  if (typeof b.name !== "string" || !b.name.trim() || b.name.trim().length > 12) return "账户名需 1-12 字";
  return null;
}
