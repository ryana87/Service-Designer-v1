import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DemoProvider } from "./demo/DemoContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UndoProvider } from "./contexts/UndoContext";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SD4",
  description: "Service Design Tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Material Symbols Outlined */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <UndoProvider>
            <DemoProvider>
              {children}
              <KeyboardShortcutsModal />
            </DemoProvider>
          </UndoProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
