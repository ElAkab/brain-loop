import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brain Loop - AI-Powered Learning",
  description: "Master your knowledge with AI-generated quizzes from your notes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
