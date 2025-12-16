"use client";

import { useMemo, useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import PDFUpload from "@/components/PDFUpload";
import StudyTools from "@/components/StudyTools";
import Logo from "@/components/Logo";
import { MessageSquare, FileText, BookOpen, Folder } from "lucide-react";

interface UploadedDoc {
  id: string;
  name: string;
  pages: number;
  content: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<
    "chat" | "upload" | "library" | "tools"
  >("chat");
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const selectedDoc = useMemo(
    () => uploadedDocs.find((d) => d.id === selectedDocId) || null,
    [uploadedDocs, selectedDocId]
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <Logo size="large" />
          <p className="text-xl text-gray-600 mt-4 font-medium">
            Your intelligent study companion
          </p>
        </header>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-lg p-2 flex gap-2 flex-wrap">
            {[
              { id: "chat", label: "AI Chat", icon: <MessageSquare size={20} /> },
              { id: "upload", label: "Upload PDF", icon: <FileText size={20} /> },
              { id: "library", label: "My PDFs", icon: <Folder size={20} /> },
              { id: "tools", label: "Study Tools", icon: <BookOpen size={20} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-primary-500 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-6xl mx-auto">
          {activeTab === "chat" && <ChatInterface />}
          {activeTab === "upload" && (
            <PDFUpload
              onUploaded={(doc) => {
                setUploadedDocs((prev) => [doc, ...prev]);
                setSelectedDocId(doc.id);
                setActiveTab("tools");
              }}
            />
          )}
          {activeTab === "library" && (
            <div className="bg-white rounded-xl shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">My PDFs</h2>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  Upload New
                </button>
              </div>
              {uploadedDocs.length === 0 ? (
                <p className="text-gray-600">No PDFs yet. Upload one to start.</p>
              ) : (
                <div className="space-y-3">
                  {uploadedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-gray-200 rounded-lg p-4"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{doc.name}</p>
                        <p className="text-sm text-gray-500">{doc.pages} pages</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedDocId(doc.id);
                            setActiveTab("tools");
                          }}
                          className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                        >
                          Use in Study Tools
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === "tools" && (
            <StudyTools
              uploadedContent={selectedDoc?.content || ""}
              selectedDocName={selectedDoc?.name || "No PDF selected"}
            />
          )}
        </div>
      </div>
    </main>
  );
}
