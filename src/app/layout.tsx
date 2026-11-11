import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduChain — Learn. Connect. Unlock.",
  description: "High-performance gamified curriculum platform. Master independent subject chains, forge past mistakes, and compete on the global scholar leaderboard.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('educhain_v2_store');
                if (stored) {
                  const data = JSON.parse(stored);
                  if (data?.state?.settings?.theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-[#101827] text-slate-900 dark:text-[#F8FAFC] antialiased selection:bg-[#2563EB] selection:text-white dark:selection:bg-[#22D3EE] dark:selection:text-[#101827] font-sans flex flex-col transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
