import type { MetadataRoute } from "next";

// PWA manifest(P4·加主屏):安卓 Chrome「添加到主屏幕」后以独立 App 形态运行
// 注意:/manifest.webmanifest 与图标已加入 PUBLIC_PATHS(浏览器无凭证拉取,不能被登录守卫拦截)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "记账本",
    short_name: "记账本",
    description: "个人记账:手动 + OCR 批量导入 + 基金追踪",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f5",
    theme_color: "#047857",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
