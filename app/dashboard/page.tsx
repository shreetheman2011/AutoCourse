"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import Link from "next/link";
import { Folder, Plus, LogOut, FileText, Loader2 } from "lucide-react";
import PDFUpload from "@/components/PDFUpload";

interface Document {
  id: string;
  name: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      fetchDocuments();
    }
  }, [user, authLoading, router]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("documents")
        .select("id, name, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (doc: any) => {
    fetchDocuments();
    setShowUpload(false);
  };

  if (authLoading || (loading && !documents.length)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard">
            <Logo size="small" />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-gray-600 font-medium hidden sm:block">
              Welcome, {user?.user_metadata?.first_name || user?.email?.split('@')[0]}
            </span>
            <button
              onClick={signOut}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Folder className="text-primary-500" />
            My PDFs
          </h1>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition shadow-sm"
          >
            <Plus size={20} />
            Upload New
          </button>
        </div>

        {showUpload && (
          <div className="mb-8 bg-white p-6 rounded-xl shadow-md border border-gray-100 relative">
             <button 
                onClick={() => setShowUpload(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
             >
                ✕
             </button>
             <h2 className="text-lg font-semibold mb-4">Upload a new PDF</h2>
             <PDFUpload onUploaded={handleUploadComplete} />
          </div>
        )}

        {documents.length === 0 && !showUpload ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No PDFs yet
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Upload your study materials to start generating quizzes, flashcards,
              and more.
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              <Plus size={20} />
              Upload your first PDF
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/dashboard/${doc.id}`}
                className="group bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-primary-200 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 text-primary-600 rounded-lg group-hover:bg-primary-600 group-hover:text-white transition-colors">
                    <FileText size={24} />
                  </div>
                </div>
                <h3 className="font-semibold text-gray-800 mb-1 truncate">
                  {doc.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
