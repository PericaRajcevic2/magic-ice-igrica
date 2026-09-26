import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Magic Ice — Stack the Magic",
  description: "Pomakni kornet, uhvati kuglice i složi najslađi rekord. 35 sekundi Magic Ice čarolije!",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
