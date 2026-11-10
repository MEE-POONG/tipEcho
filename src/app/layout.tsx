import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

const promptFont = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TipEcho — ระบบส่งของขวัญและแจ้งเตือนการโดเนทแบบเรียลไทม์",
  description:
    "ส่งของขวัญและข้อความขึ้นจอสตรีมเมอร์ได้ทันทีโดยไม่ต้องสมัครสมาชิก พร้อมระบบแจ้งเตือน OBS Overlay แบบเรียลไทม์",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${promptFont.className} antialiased selection:bg-pink-500 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}

