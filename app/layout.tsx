import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AutoCourse - Your Intelligent Study Companion",
  description:
    "Chat with AI and generate flashcards, quizzes, and matching exercises from your study guides",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {/* Contact Banner */}
          <div className="bg-primary-600 text-white text-center py-2 text-sm font-medium z-50">
             Any questions or issues? Contact Shree Manickaraja
          </div>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
