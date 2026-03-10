import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SubLingo - שבור את מחסום השפה",
  description: "צפה בסרטוני יוטיוב עם כתוביות בעברית",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
