"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Logo from "@/components/Logo";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-3xl mx-auto">
        <div className="flex justify-center mb-8">
          <Logo size="large" />
        </div>
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-purple-600 mb-6">
          Your Intelligent Study Companion
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Upload your study guides and instantly generate quizzes, flashcards,
          matching games, and free response questions. Chat with AI to master
          your material.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Get Started for Free
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 bg-white text-primary-600 border border-primary-200 rounded-lg font-semibold hover:bg-gray-50 transition shadow-md hover:shadow-lg"
          >
            Log In
          </Link>
        </div>
      </div>
    </main>
  );
}
