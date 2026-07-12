import BottomNav from "@/components/BottomNav";

// 四个主标签页共用:内容区 + 底部导航
export default function TabsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto max-w-md">
      <main className="px-4 pb-24 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
