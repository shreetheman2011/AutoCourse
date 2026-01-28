"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  HelpCircle,
  FileText,
  Clock,
  LayoutGrid,
  Loader2,
  Settings,
  Brain,
  CheckCircle,
  AlertCircle,
  LogOut,
  Folder,
  ChevronDown
} from "lucide-react";
import StudyTools from "@/components/StudyTools";
import FRQ from "@/components/FRQ";
import Quiz from "@/components/Quiz";
import Flashcards from "@/components/Flashcards";
import Matching from "@/components/Matching";

interface Document {
  id: string;
  name: string;
  content: string;
  created_at: string;
}

export default function DocumentPage() {
  const { docId } = useParams();
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [docContent, setDocContent] = useState("");
  const [activeTab, setActiveTab] = useState<"tools" | "saved">("tools");
  const [toolMode, setToolMode] = useState<"select" | "mcq" | "frq">("select");
  const [generatedTools, setGeneratedTools] = useState<any[]>([]);

  // Fetch Document
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && docId && !document) {
      fetchDocument(true);
    }
  }, [docId, user, authLoading, router, document]);

  const fetchDocument = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) setLoading(true);
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", docId)
        .single();

      if (error) throw error;
      setDocument(data);
      setDocContent(data.content);
    } catch (error) {
      console.error("Error fetching document:", error);
      if (isInitialLoad) router.push("/dashboard");
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  if (authLoading || loading || !document) {
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
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="h-6 w-px bg-gray-200"></div>
            <h1 className="font-semibold text-gray-800 truncate max-w-xs sm:max-w-md">
              {document.name}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("tools")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === "tools"
                    ? "bg-white text-primary-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <BookOpen size={16} />
                Create New
              </button>
              <button
                onClick={() => setActiveTab("saved")}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === "saved"
                    ? "bg-white text-primary-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Folder size={16} />
                Saved Tools
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium mr-2">
               {user?.user_metadata?.first_name || "User"}
            </div>

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
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl h-[calc(100vh-64px)] overflow-hidden">
        {activeTab === "saved" ? (
           <SavedToolsList docId={document.id} docContent={docContent} />
        ) : (
          <div className="h-full overflow-y-auto pb-10">
            {/* Tool Selection */}
            {toolMode === "select" && (
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">
                    Choose a Study Tool
                  </h2>
                  <p className="text-gray-500 max-w-xl mx-auto">
                    Select the type of practice you need. Customize your content
                    and difficulty before generating.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* MCQ Option */}
                  <div
                    onClick={() => setToolMode("mcq")}
                    className="group bg-white p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-primary-500 hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="w-16 h-16 bg-blue-50 text-primary-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                      <LayoutGrid size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-3">
                      Standard Practice
                    </h3>
                    <p className="text-gray-500 leading-relaxed">
                      Generate Quizzes, Flashcards, and Matching games. Perfect for
                      memorization and concept checking.
                    </p>
                  </div>

                  {/* FRQ Option */}
                  <div
                    onClick={() => setToolMode("frq")}
                    className="group bg-white p-8 rounded-2xl shadow-sm border-2 border-transparent hover:border-purple-500 hover:shadow-md cursor-pointer transition-all"
                  >
                    <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <FileText size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-3">
                      Free Response Questions
                    </h3>
                    <p className="text-gray-500 leading-relaxed">
                      Practice AP-style Free Response Questions with marking guides.
                      Great for deep understanding and writing practice.
                    </p>
                  </div>
                </div>
              </div>
            )}

             {/* MCQ Tools Wrapper */}
            {toolMode === "mcq" && (
               <div className="space-y-6">
                 <button 
                   onClick={() => setToolMode("select")}
                   className="flex items-center gap-2 text-gray-500 hover:text-gray-800"
                 >
                   <ArrowLeft size={16} /> Back to Selection
                 </button>
                 <StudyTools 
                    uploadedContent={docContent} 
                    selectedDocName={document.name}
                    docId={document.id}
                    onGenerate={() => setActiveTab("saved")}
                 />
               </div>
            )}

            {/* FRQ Tool Wrapper */}
            {toolMode === "frq" && (
              <div className="space-y-6">
                 <button 
                   onClick={() => setToolMode("select")}
                   className="flex items-center gap-2 text-gray-500 hover:text-gray-800"
                 >
                   <ArrowLeft size={16} /> Back to Selection
                 </button>
                 
                 <FRQ 
                    uploadedContent={docContent} 
                    docId={document.id} 
                    onGenerate={() => setActiveTab("saved")}
                 />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Saved Tools Component
function SavedToolsList({ docId, docContent }: { docId: string, docContent: string }) {
   const [tools, setTools] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [viewingTool, setViewingTool] = useState<any | null>(null);

    useEffect(() => {
      fetchTools(true);
    }, [docId]);
 
    const fetchTools = async (isInitialLoad = false) => {
      try {
        if (isInitialLoad) setLoading(true);
        const { data, error } = await supabase
          .from("study_tools")
          .select("*")
          .eq("document_id", docId)
          .order("created_at", { ascending: false });
  
        if (error) throw error;
        setTools(data || []);
      } catch (error) {
        console.error("Error fetching tools:", error);
      } finally {
        if (isInitialLoad) setLoading(false);
      }
    };
   
   // FIX: I need to render the specific tool component directly passing initialData
   if (viewingTool) {
       return (
          <div className="h-full overflow-y-auto pb-10 space-y-6">
             <button 
                onClick={() => setViewingTool(null)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-800"
             >
                <ArrowLeft size={16} /> Back to Saved Tools
             </button>
             
             <div className="bg-white rounded-xl shadow-xl p-6">
                <div className="mb-6 pb-6 border-b border-gray-100">
                   <h2 className="text-2xl font-bold text-gray-800">{viewingTool.title}</h2>
                   <p className="text-sm text-gray-500">Created on {new Date(viewingTool.created_at).toLocaleDateString()}</p>
                </div>

                {viewingTool.type === 'quiz' && (
                   <Quiz uploadedContent={docContent} customization={{ difficulty: 'medium', count: 10, topics: '' }} docId={docId} initialData={viewingTool.data} />
                )}
                {viewingTool.type === 'flashcards' && (
                   <Flashcards uploadedContent={docContent} customization={{ difficulty: 'medium', count: 10, topics: '' }} docId={docId} initialData={viewingTool.data} />
                )}
                {viewingTool.type === 'matching' && (
                   <Matching uploadedContent={docContent} customization={{ difficulty: 'medium', count: 10, topics: '' }} docId={docId} initialData={viewingTool.data} />
                )}
                {viewingTool.type === 'frq' && (
                   <FRQ uploadedContent={docContent} docId={docId} initialData={viewingTool.data} toolId={viewingTool.id} />
                )}
             </div>
          </div>
       );
   }

   if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary-500" /></div>;

   return (
      <div className="h-full overflow-y-auto pb-10">
         {tools.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
               <Folder size={48} className="mx-auto mb-4 text-gray-300" />
               <p>No saved tools yet. Generate some!</p>
            </div>
         ) : (
            <div className="grid gap-4">
               {tools.map(tool => (
                  <div 
                     key={tool.id} 
                     onClick={() => setViewingTool(tool)}
                     className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-primary-300 cursor-pointer transition-all flex items-center justify-between group"
                  >
                     <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${
                           tool.type === 'frq' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                           {tool.type === 'frq' ? <FileText size={24} /> : <LayoutGrid size={24} />}
                        </div>
                        <div>
                           <h3 className="font-semibold text-gray-800 group-hover:text-primary-600 transition-colors">{tool.title}</h3>
                           <p className="text-sm text-gray-500 capitalize">{tool.type} • {new Date(tool.created_at).toLocaleDateString()}</p>
                        </div>
                     </div>
                     <ChevronDown className="text-gray-300 -rotate-90 group-hover:text-primary-500 transition-colors" />
                  </div>
               ))}
            </div>
         )}
      </div>
   );
}
