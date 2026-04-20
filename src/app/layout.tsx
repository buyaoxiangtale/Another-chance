import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/auth-provider";
import NavHeader from "@/components/nav-header";

export const metadata: Metadata = {
  title: "古事 - 分叉故事续写平台",
  description: "基于历史/经典故事的关键片段和人物产生分叉剧情的故事续写平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <AuthProvider>
          <NavHeader />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
