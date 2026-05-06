"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { extractPdfTextInBrowser } from "@/lib/clientPdf";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import DarkModeToggle from "@/components/DarkModeToggle";
import Link from "next/link";
import {
  FilePlus2,
  FileText,
  Headphones,
  Link2,
  Loader2,
  LogOut,
  Mic,
  Plus,
  Upload,
  Youtube,
} from "lucide-react";

interface Document {
  id: string;
  name: string;
  created_at: string;
}

type SourceMode = "blank" | "voice" | "pdf" | "link" | null;

type SpeechRecognitionConstructor = new () => SpeechRecognition;

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<SourceMode>(null);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
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

  const firstName = useMemo(
    () => user?.user_metadata?.first_name || user?.email?.split("@")[0] || "there",
    [user]
  );

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

  const resetComposer = () => {
    setActiveMode(null);
    setTitle("");
    setLinkUrl("");
    setVoiceText("");
    setSelectedFile(null);
    setErrorMessage("");
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const createDocument = async (name: string, content: string) => {
    if (!user) throw new Error("You must be signed in to create a document.");

    const { data, error } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        name,
        content,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Document;
  };

  const createBlankDoc = async () => {
    setIsCreating(true);
    setErrorMessage("");
    try {
      const doc = await createDocument(
        title.trim() || "Untitled document",
        "<h1>Untitled document</h1><p><br></p>"
      );
      router.push(`/dashboard/${doc.id}`);
    } catch (error: any) {
      setErrorMessage(error.message || "Could not create document.");
    } finally {
      setIsCreating(false);
    }
  };

  const createAiDoc = async (sourceType: "voice" | "pdf" | "url", content: string) => {
    const trimmedContent = content.substring(0, 12000);
    const response = await fetch("/api/create-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceType,
        content: trimmedContent,
        url: sourceType === "url" ? linkUrl : undefined,
        title,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not create notes.");

    return createDocument(data.title || title || "Generated study notes", data.html);
  };

  const processPdf = async () => {
    if (!selectedFile) throw new Error("Choose a PDF first.");
    const parsed = await extractPdfTextInBrowser(selectedFile);
    return parsed.content;
  };

  const handleCreateFromSource = async () => {
    setIsCreating(true);
    setErrorMessage("");

    try {
      let doc: Document;

      if (activeMode === "blank") {
        await createBlankDoc();
        return;
      }

      if (activeMode === "voice") {
        if (!voiceText.trim()) throw new Error("Record or paste voice notes first.");
        doc = await createAiDoc("voice", voiceText);
      } else if (activeMode === "pdf") {
        const pdfText = await processPdf();
        doc = await createAiDoc("pdf", pdfText);
      } else if (activeMode === "link") {
        if (!linkUrl.trim()) throw new Error("Paste a website or YouTube link first.");
        doc = await createAiDoc("url", "");
      } else {
        throw new Error("Choose how you want to start.");
      }

      router.push(`/dashboard/${doc.id}`);
    } catch (error: any) {
      setErrorMessage(error.message || "Could not create document.");
    } finally {
      setIsCreating(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognitionApi =
      (window as typeof window & {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      }).SpeechRecognition ||
      (window as typeof window & {
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      }).webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setErrorMessage("Voice recording is not supported in this browser. Paste notes instead.");
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += `${event.results[index][0].transcript} `;
      }
      setVoiceText((current) => `${current} ${transcript}`.replace(/\s+/g, " ").trim());
    };
    recognition.onerror = (event) => {
      setErrorMessage(`Recording error: ${event.error}`);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const sourceOptions = [
    {
      id: "blank" as const,
      title: "Start a blank doc",
      description: "Open a clean editor and write from scratch.",
      icon: FilePlus2,
      accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      id: "voice" as const,
      title: "Voice record notes",
      description: "Record or paste spoken notes and let AI structure them.",
      icon: Headphones,
      accent: "text-blue-700 bg-blue-50 border-blue-200",
    },
    {
      id: "pdf" as const,
      title: "Upload PDF notes",
      description: "Upload study material and convert it into a formatted doc.",
      icon: Upload,
      accent: "text-violet-700 bg-violet-50 border-violet-200",
    },
    {
      id: "link" as const,
      title: "Website or YouTube",
      description: "Paste a webpage or video link and generate notes.",
      icon: Youtube,
      accent: "text-red-700 bg-red-50 border-red-200",
    },
  ];

  if (authLoading || (loading && !documents.length)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col dark:bg-gray-950">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10 dark:border-gray-800 dark:bg-gray-900">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard">
            <Logo size="small" />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-gray-600 font-medium hidden sm:block dark:text-gray-300">
              {firstName}
            </span>
            <DarkModeToggle />
            <button
              onClick={signOut}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-red-950/40 dark:hover:text-red-300"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">What are you studying?</h1>
          <p className="text-gray-500 mt-2 dark:text-gray-400">
            Start from nothing, a recording, a PDF, or a link. Generated notes open as editable docs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {sourceOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setActiveMode(option.id);
                setErrorMessage("");
              }}
              className={`text-left bg-white border rounded-lg p-5 shadow-sm hover:shadow-md transition-all dark:bg-gray-900 dark:shadow-none ${
                activeMode === option.id ? "border-primary-500 ring-2 ring-primary-100 dark:ring-primary-900/50" : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-lg border flex items-center justify-center mb-4 ${option.accent}`}
              >
                <option.icon size={24} />
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-white">{option.title}</h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed dark:text-gray-400">{option.description}</p>
            </button>
          ))}
        </div>

        {activeMode && (
          <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 mb-10 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create document</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activeMode === "blank"
                    ? "Blank documents open immediately without AI."
                    : "AI will format the source into clean study notes before opening the editor."}
                </p>
              </div>
              <button onClick={resetComposer} className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
                Cancel
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Title</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Optional document title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500"
                />
              </label>

              {activeMode === "link" && (
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                    Website or YouTube URL
                  </span>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input
                      value={linkUrl}
                      onChange={(event) => setLinkUrl(event.target.value)}
                      placeholder="https://..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500"
                    />
                  </div>
                </label>
              )}

              {activeMode === "pdf" && (
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">PDF file</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 file:mr-3 file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:rounded-md dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300 dark:file:bg-gray-800 dark:file:text-gray-200"
                  />
                </label>
              )}
            </div>

            {activeMode === "voice" && (
              <div className="mt-4">
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={toggleRecording}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                      isRecording
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-primary-600 text-white hover:bg-primary-700"
                    }`}
                  >
                    <Mic size={18} />
                    {isRecording ? "Stop recording" : "Record"}
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">You can also paste notes below.</span>
                </div>
                <textarea
                  value={voiceText}
                  onChange={(event) => setVoiceText(event.target.value)}
                  placeholder="Recorded or pasted notes appear here."
                  className="w-full min-h-[160px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500"
                />
              </div>
            )}

            {errorMessage && (
              <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-end mt-5">
              <button
                onClick={handleCreateFromSource}
                disabled={isCreating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
              >
                {isCreating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                {activeMode === "blank" ? "Create blank doc" : "Create notes doc"}
              </button>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent docs</h2>
          </div>

          {documents.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 text-center dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
              <FileText size={40} className="text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">No docs yet</h3>
              <p className="text-gray-500 mt-1 dark:text-gray-400">Choose one of the four options above to create your first doc.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/dashboard/${doc.id}`}
                  className="group bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-primary-200 transition-all dark:border-gray-800 dark:bg-gray-900 dark:shadow-none dark:hover:border-primary-700"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 text-primary-600 rounded-lg group-hover:bg-primary-600 group-hover:text-white transition-colors">
                      <FileText size={22} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate dark:text-white">{doc.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
