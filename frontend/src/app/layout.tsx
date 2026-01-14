import type { Metadata } from "next";
import { Nunito, Fira_Code } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MarketDataProvider } from "@/contexts/MarketDataContext";
import { SideNavLayout } from "@/components/layout";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const firaCode = Fira_Code({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Trader - Fibonacci Trading Analysis",
  description: "Fibonacci trading analysis platform with harmonic patterns",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${nunito.variable} ${firaCode.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={0}>
            <MarketDataProvider>
              <SideNavLayout>
                {children}
              </SideNavLayout>
            </MarketDataProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
