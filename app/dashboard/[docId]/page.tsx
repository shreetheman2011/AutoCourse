"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  BookOpen,
  ChevronDown,
  Clock,
  Eye,
  FileText,
  Folder,
  History,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  LogOut,
  Redo2,
  RemoveFormatting,
  Save,
  Share2,
  Type,
  Underline,
  Undo2,
  Users,
  X,
} from "lucide-react";
import Logo from "@/components/Logo";
import DarkModeToggle from "@/components/DarkModeToggle";
import StudyTools from "@/components/StudyTools";
import FRQ from "@/components/FRQ";
import Quiz from "@/components/Quiz";
import Flashcards from "@/components/Flashcards";
import Matching from "@/components/Matching";

interface Document {
  id: string;
  user_id: string;
  name: string;
  content: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string | null;
}

interface ShareTarget {
  id: string;
  type: "user" | "group";
  label: string;
  sublabel?: string;
}

interface Group {
  id: string;
  name: string;
}

interface VersionRecord {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

type AccessLevel = "view" | "comment" | "edit";
type RightPanel = "tools" | "saved" | "frq";

const EMPTY_DOC = "<h1>Untitled document</h1><p><br></p>";
const AUTOSAVE_DELAY_MS = 1400;

interface EditorSnapshot {
  title: string;
  content: string;
}

interface ToolbarTooltipState {
  label: string;
  left: number;
  top: number;
}

function htmlToPlainText(html: string) {
  if (typeof window === "undefined") return html;
  const element = window.document.createElement("div");
  element.innerHTML = html;
  return element.innerText;
}

export default function DocumentPage() {
  const { docId } = useParams();
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const activeColorSelectionRef = useRef<Range | null>(null);
  const autosaveTimeoutRef = useRef<number | null>(null);
  const loadedRef = useRef(false);
  const lastSavedSnapshotRef = useRef<EditorSnapshot | null>(null);

  const [document, setDocument] = useState<Document | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState(EMPTY_DOC);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanel>("tools");
  const [showShare, setShowShare] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [toolbarTooltip, setToolbarTooltip] = useState<ToolbarTooltipState | null>(null);
  const [historyStack, setHistoryStack] = useState<EditorSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorSnapshot[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && docId) {
      fetchDocument();
    }
  }, [docId, user, authLoading, router]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (!isMod) return;

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveDocument();
      }

      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undoSnapshot();
      }

      if (
        event.key.toLowerCase() === "y" ||
        (event.key.toLowerCase() === "z" && event.shiftKey)
      ) {
        event.preventDefault();
        redoSnapshot();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [docTitle, docContent, document, historyStack, redoStack]);

  useEffect(() => {
    const saveSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || !editorRef.current) return;

      const range = selection.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        selectionRangeRef.current = range.cloneRange();
      }
    };

    window.document.addEventListener("selectionchange", saveSelection);
    return () => window.document.removeEventListener("selectionchange", saveSelection);
  }, []);

  useEffect(() => {
    if (!loadedRef.current || !document) return;

    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = window.setTimeout(() => {
      void saveDocument({ silent: true });
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [docTitle, docContent, document]);

  useEffect(() => {
    if (!loading && document && editorRef.current) {
      editorRef.current.innerHTML = document.content || EMPTY_DOC;
    }
  }, [loading, document?.id]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", docId)
        .single();

      if (error) throw error;
      const nextDocument = data as Document;
      const nextContent = nextDocument.content || EMPTY_DOC;
      setDocument(nextDocument);
      setDocTitle(nextDocument.name);
      setDocContent(nextContent);
      setLastSavedAt(nextDocument.updated_at || nextDocument.created_at);
      const snapshot = { title: nextDocument.name, content: nextContent };
      setHistoryStack([snapshot]);
      setRedoStack([]);
      lastSavedSnapshotRef.current = snapshot;
      loadedRef.current = true;
    } catch (error) {
      console.error("Error fetching document:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const pushHistory = (snapshot: EditorSnapshot) => {
    setHistoryStack((current) => {
      const last = current[current.length - 1];
      if (last?.title === snapshot.title && last?.content === snapshot.content) {
        return current;
      }

      return [...current, snapshot].slice(-80);
    });
    setRedoStack([]);
  };

  const applySnapshot = (snapshot: EditorSnapshot) => {
    setDocTitle(snapshot.title);
    setDocContent(snapshot.content);
    if (editorRef.current) {
      editorRef.current.innerHTML = snapshot.content;
      editorRef.current.focus();
    }
  };

  const undoSnapshot = () => {
    setHistoryStack((current) => {
      if (current.length <= 1) return current;

      const nextHistory = current.slice(0, -1);
      const currentSnapshot = current[current.length - 1];
      const previousSnapshot = nextHistory[nextHistory.length - 1];
      setRedoStack((redo) => [currentSnapshot, ...redo].slice(0, 80));
      applySnapshot(previousSnapshot);
      return nextHistory;
    });
  };

  const redoSnapshot = () => {
    setRedoStack((current) => {
      if (current.length === 0) return current;

      const [nextSnapshot, ...remaining] = current;
      setHistoryStack((history) => [...history, nextSnapshot].slice(-80));
      applySnapshot(nextSnapshot);
      return remaining;
    });
  };

  const updateEditorContent = () => {
    const content = editorRef.current?.innerHTML || EMPTY_DOC;
    setDocContent(content);
    pushHistory({ title: docTitle, content });
  };

  const restoreSelection = () => {
    const range = activeColorSelectionRef.current || selectionRangeRef.current;
    if (!range) return;

    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const runCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    restoreSelection();
    window.document.execCommand(command, false, value);
    updateEditorContent();
  };

  const captureColorSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current) return;

    const range = selection.getRangeAt(0);
    if (editorRef.current.contains(range.commonAncestorContainer)) {
      activeColorSelectionRef.current = range.cloneRange();
      selectionRangeRef.current = range.cloneRange();
    }
  };

  const releaseColorSelection = () => {
    activeColorSelectionRef.current = null;
  };

  const removeHighlight = () => {
    editorRef.current?.focus();
    restoreSelection();
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;

    if (!range || !editorRef.current) {
      runCommand("hiliteColor", "transparent");
      return;
    }

    const clearBackground = (element: Element) => {
      if (!(element instanceof HTMLElement)) return;
      element.style.background = "";
      element.style.backgroundColor = "";
      if (!element.getAttribute("style")) {
        element.removeAttribute("style");
      }
    };

    if (range.collapsed) {
      const parent =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? range.startContainer
          : range.startContainer.parentElement;
      if (parent instanceof Element) clearBackground(parent);
    } else {
      const walker = window.document.createTreeWalker(
        editorRef.current,
        NodeFilter.SHOW_ELEMENT
      );
      let current: Node | null = walker.currentNode;
      while (current) {
        if (current instanceof Element && range.intersectsNode(current)) {
          clearBackground(current);
        }
        current = walker.nextNode();
      }
    }

    updateEditorContent();
  };

  const handleTitleChange = (nextTitle: string) => {
    setDocTitle(nextTitle);
    pushHistory({ title: nextTitle, content: editorRef.current?.innerHTML || docContent });
  };

  const handleEditorInput = () => {
    const content = editorRef.current?.innerHTML || EMPTY_DOC;
    setDocContent(content);
    pushHistory({ title: docTitle, content });
  };

  const saveVersion = async (content: string) => {
    if (!document || !user) return;

    await supabase.from("document_versions").insert({
      document_id: document.id,
      user_id: user.id,
      title: docTitle || "Untitled document",
      content,
    });
  };

  const saveDocument = async (options?: { silent?: boolean }) => {
    if (!document) return;

    const content = editorRef.current?.innerHTML || docContent;
    const normalizedTitle = docTitle.trim() || "Untitled document";
    const lastSaved = lastSavedSnapshotRef.current;

    if (lastSaved?.title === normalizedTitle && lastSaved?.content === content) {
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      if (lastSaved?.content && lastSaved.content !== content) {
        await saveVersion(lastSaved.content).catch((error) =>
          console.warn("Could not save version", error)
        );
      }

      const { error } = await supabase
        .from("documents")
        .update({
          name: normalizedTitle,
          content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", document.id);

      if (error) throw error;

      const savedAt = new Date().toISOString();
      setDocument({ ...document, name: normalizedTitle, content, updated_at: savedAt });
      setDocTitle(normalizedTitle);
      setDocContent(content);
      setLastSavedAt(savedAt);
      lastSavedSnapshotRef.current = { title: normalizedTitle, content };
    } catch (error: any) {
      const message =
        error.message || "Could not autosave document. Make sure the Supabase update policy is applied.";
      setSaveError(message);
      if (!options?.silent) alert(message);
    } finally {
      setSaving(false);
    }
  };

  const studyContent = useMemo(() => htmlToPlainText(docContent), [docContent]);
  const toolbarTooltipHandlers = { onTooltipChange: setToolbarTooltip };

  if (authLoading || loading || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col dark:bg-gray-950">
      <header className="bg-white border-b sticky top-0 z-20 dark:border-gray-800 dark:bg-gray-900">
        <div className="px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-primary-300"
              title="Back"
            >
              <ArrowLeft size={20} />
            </Link>
            <Logo size="small" />
            <input
              value={docTitle}
              onChange={(event) => handleTitleChange(event.target.value)}
              className="min-w-0 w-[260px] sm:w-[360px] px-2 py-1 font-semibold text-gray-900 border border-transparent rounded-md hover:border-gray-200 focus:border-primary-300 focus:outline-none dark:bg-transparent dark:text-white dark:hover:border-gray-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className={`hidden sm:inline text-xs mr-2 ${saveError ? "text-red-600" : "text-gray-500"}`}>
              {saveError
                ? "Autosave failed"
                : saving
                  ? "Saving..."
                  : lastSavedAt
                    ? `Autosaved at ${new Date(lastSavedAt).toLocaleTimeString()}`
                    : "Not saved yet"}
            </span>
            <button
              onClick={() => setShowVersions(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <History size={17} />
              <span className="hidden sm:inline">History</span>
            </button>
            <button
              onClick={() => void saveDocument()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
              <span className="hidden sm:inline">Save</span>
            </button>
            <button
              onClick={() => setShowShare(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg text-sm font-semibold"
            >
              <Share2 size={17} />
              Share
            </button>
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

        <div className="px-4 h-12 flex items-center gap-1 border-t overflow-x-auto dark:border-gray-800">
          <ToolbarButton title="Undo" onClick={undoSnapshot} icon={<Undo2 size={16} />} disabled={historyStack.length <= 1} {...toolbarTooltipHandlers} />
          <ToolbarButton title="Redo" onClick={redoSnapshot} icon={<Redo2 size={16} />} disabled={redoStack.length === 0} {...toolbarTooltipHandlers} />
          <div className="h-6 w-px bg-gray-200 mx-1" />
          <ToolbarButton title="Bold" onClick={() => runCommand("bold")} icon={<Bold size={16} />} {...toolbarTooltipHandlers} />
          <ToolbarButton title="Italic" onClick={() => runCommand("italic")} icon={<Italic size={16} />} {...toolbarTooltipHandlers} />
          <ToolbarButton title="Underline" onClick={() => runCommand("underline")} icon={<Underline size={16} />} {...toolbarTooltipHandlers} />
          <div className="h-6 w-px bg-gray-200 mx-1" />
          <ToolbarSelect
            title="Paragraph style"
            ariaLabel="Paragraph style"
            defaultValue="P"
            onChange={(value) => runCommand("formatBlock", value)}
            {...toolbarTooltipHandlers}
            options={[
              { value: "P", label: "Normal text" },
              { value: "H1", label: "Title" },
              { value: "H2", label: "Heading" },
              { value: "H3", label: "Subheading" },
              { value: "BLOCKQUOTE", label: "Quote" },
            ]}
          />
          <ToolbarSelect
            title="Font"
            ariaLabel="Font"
            defaultValue="Arial"
            onChange={(value) => runCommand("fontName", value)}
            {...toolbarTooltipHandlers}
            options={[
              { value: "Arial", label: "Arial" },
              { value: "Georgia", label: "Georgia" },
              { value: "Times New Roman", label: "Times" },
              { value: "Verdana", label: "Verdana" },
              { value: "Courier New", label: "Courier" },
            ]}
          />
          <ToolbarSelect
            title="Font size"
            ariaLabel="Font size"
            defaultValue="3"
            onChange={(value) => runCommand("fontSize", value)}
            {...toolbarTooltipHandlers}
            options={[
              { value: "2", label: "Small" },
              { value: "3", label: "Normal" },
              { value: "4", label: "Large" },
              { value: "5", label: "Huge" },
              { value: "6", label: "Massive" },
            ]}
          />
          <ColorControl
            title="Text color"
            icon={<Type size={16} />}
            defaultValue="#111827"
            onOpen={captureColorSelection}
            onClose={releaseColorSelection}
            onChange={(value) => runCommand("foreColor", value)}
            {...toolbarTooltipHandlers}
          />
          <ColorControl
            title="Highlight color"
            icon={<Highlighter size={16} />}
            defaultValue="#fff3a3"
            onOpen={captureColorSelection}
            onClose={releaseColorSelection}
            onChange={(value) => runCommand("hiliteColor", value)}
            {...toolbarTooltipHandlers}
          />
          <ToolbarButton title="Remove highlight" onClick={removeHighlight} icon={<Highlighter size={16} className="opacity-45" />} {...toolbarTooltipHandlers} />
          <div className="h-6 w-px bg-gray-200 mx-1" />
          <ToolbarButton title="Bulleted list" onClick={() => runCommand("insertUnorderedList")} icon={<List size={16} />} {...toolbarTooltipHandlers} />
          <ToolbarButton title="Numbered list" onClick={() => runCommand("insertOrderedList")} icon={<ListOrdered size={16} />} {...toolbarTooltipHandlers} />
          <ToolbarButton title="Align left" onClick={() => runCommand("justifyLeft")} icon={<AlignLeft size={16} />} {...toolbarTooltipHandlers} />
          <ToolbarButton title="Align center" onClick={() => runCommand("justifyCenter")} icon={<AlignCenter size={16} />} {...toolbarTooltipHandlers} />
          <ToolbarButton title="Align right" onClick={() => runCommand("justifyRight")} icon={<AlignRight size={16} />} {...toolbarTooltipHandlers} />
          <ToolbarButton title="Clear formatting" onClick={() => runCommand("removeFormat")} icon={<RemoveFormatting size={16} />} {...toolbarTooltipHandlers} />
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-4 p-4 overflow-hidden">
        <section className="min-h-[calc(100vh-128px)] overflow-auto">
          <div className="bg-white border border-gray-200 shadow-sm mx-auto max-w-[900px] min-h-[calc(100vh-160px)] p-8 sm:p-12 rounded-lg dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="prose-editor min-h-[calc(100vh-260px)] outline-none text-gray-900 leading-7 dark:text-gray-100"
              onInput={handleEditorInput}
            />
          </div>
        </section>

        <aside className="bg-white border border-gray-200 rounded-lg shadow-sm min-h-[520px] xl:max-h-[calc(100vh-144px)] overflow-hidden flex flex-col dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
          <div className="flex bg-gray-100 p-1 m-3 rounded-lg">
            <PanelTab active={rightPanel === "tools"} onClick={() => setRightPanel("tools")} icon={<BookOpen size={15} />} label="Tools" />
            <PanelTab active={rightPanel === "frq"} onClick={() => setRightPanel("frq")} icon={<FileText size={15} />} label="FRQ" />
            <PanelTab active={rightPanel === "saved"} onClick={() => setRightPanel("saved")} icon={<Folder size={15} />} label="Saved" />
          </div>
          <div className="flex-1 overflow-auto p-4">
            {rightPanel === "tools" && (
              <StudyTools
                uploadedContent={studyContent}
                selectedDocName={docTitle}
                docId={document.id}
                onGenerate={() => setRightPanel("saved")}
              />
            )}
            {rightPanel === "frq" && (
              <FRQ
                uploadedContent={studyContent}
                docId={document.id}
                onGenerate={() => setRightPanel("saved")}
              />
            )}
            {rightPanel === "saved" && (
              <SavedToolsList docId={document.id} docContent={studyContent} />
            )}
          </div>
        </aside>
      </main>

      {showShare && (
        <ShareDialog
          documentId={document.id}
          documentTitle={docTitle}
          ownerId={document.user_id}
          onClose={() => setShowShare(false)}
        />
      )}

      {showVersions && (
        <VersionHistoryDialog
          documentId={document.id}
          onClose={() => setShowVersions(false)}
          onRestore={(version) => {
            setDocTitle(version.title);
            setDocContent(version.content);
            if (editorRef.current) editorRef.current.innerHTML = version.content;
            setShowVersions(false);
          }}
        />
      )}

      <ToolbarFloatingTooltip tooltip={toolbarTooltip} />
    </div>
  );
}

function ToolbarButton({
  title,
  icon,
  onClick,
  disabled = false,
  onTooltipChange,
}: {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  onTooltipChange?: (tooltip: ToolbarTooltipState | null) => void;
}) {
  const showTooltip = (event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onTooltipChange?.({
      label: title,
      left: rect.left + rect.width / 2,
      top: rect.bottom + 8,
    });
  };

  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={showTooltip}
      onFocus={showTooltip}
      onMouseLeave={() => onTooltipChange?.(null)}
      onBlur={() => onTooltipChange?.(null)}
      onClick={onClick}
      disabled={disabled}
      className="w-9 h-9 inline-flex items-center justify-center rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
    >
      {icon}
    </button>
  );
}

function ToolbarSelect({
  title,
  ariaLabel,
  defaultValue,
  options,
  onChange,
  onTooltipChange,
}: {
  title: string;
  ariaLabel: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  onTooltipChange?: (tooltip: ToolbarTooltipState | null) => void;
}) {
  const showTooltip = (event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onTooltipChange?.({
      label: title,
      left: rect.left + rect.width / 2,
      top: rect.bottom + 8,
    });
  };

  return (
    <label
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={() => onTooltipChange?.(null)}
    >
      <span className="sr-only">{ariaLabel}</span>
      <select
        title={title}
        defaultValue={defaultValue}
        onMouseDown={(event) => event.stopPropagation()}
        onFocus={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          onTooltipChange?.({
            label: title,
            left: rect.left + rect.width / 2,
            top: rect.bottom + 8,
          });
        }}
        onBlur={() => onTooltipChange?.(null)}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 max-w-[132px] rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-800"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColorControl({
  title,
  icon,
  defaultValue,
  onOpen,
  onClose,
  onChange,
  onTooltipChange,
}: {
  title: string;
  icon: React.ReactNode;
  defaultValue: string;
  onOpen?: () => void;
  onClose?: () => void;
  onChange: (value: string) => void;
  onTooltipChange?: (tooltip: ToolbarTooltipState | null) => void;
}) {
  const [color, setColor] = useState(defaultValue);
  const showTooltip = (event: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onTooltipChange?.({
      label: title,
      left: rect.left + rect.width / 2,
      top: rect.bottom + 8,
    });
  };

  return (
    <label
      className="h-9 w-11 inline-flex items-center justify-center rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer relative dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
      onMouseEnter={showTooltip}
      onMouseLeave={() => onTooltipChange?.(null)}
    >
      <span className="sr-only">{title}</span>
      {icon}
      <input
        title={title}
        type="color"
        value={color}
        onMouseDown={(event) => {
          event.stopPropagation();
          onOpen?.();
        }}
        onFocus={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          onTooltipChange?.({
            label: title,
            left: rect.left + rect.width / 2,
            top: rect.bottom + 8,
          });
          onOpen?.();
        }}
        onBlur={() => {
          onTooltipChange?.(null);
          onClose?.();
        }}
        onInput={(event) => {
          setColor(event.currentTarget.value);
          onChange(event.currentTarget.value);
        }}
        onChange={(event) => {
          setColor(event.currentTarget.value);
          onChange(event.currentTarget.value);
        }}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      <span
        className="absolute bottom-1 left-2 right-2 h-0.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    </label>
  );
}

function ToolbarFloatingTooltip({ tooltip }: { tooltip: ToolbarTooltipState | null }) {
  if (!tooltip || typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed z-[100] -translate-x-1/2 rounded-md bg-gray-950 px-2 py-1 text-xs text-white shadow-lg pointer-events-none"
      style={{ left: tooltip.left, top: tooltip.top }}
    >
      {tooltip.label}
    </div>,
    window.document.body
  );
}

function PanelTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition ${
        active ? "bg-white text-primary-700 shadow-sm dark:bg-gray-800 dark:text-primary-300" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ShareDialog({
  documentId,
  documentTitle,
  ownerId,
  onClose,
}: {
  documentId: string;
  documentTitle: string;
  ownerId: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState<ShareTarget[]>([]);
  const [suggestions, setSuggestions] = useState<ShareTarget[]>([]);
  const [access, setAccess] = useState<AccessLevel>("view");
  const [publicAccess, setPublicAccess] = useState<AccessLevel>("view");
  const [publicToken, setPublicToken] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<ShareTarget[]>([]);
  const [notifyPeople, setNotifyPeople] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    void loadPublicLink();
  }, [documentId]);

  useEffect(() => {
    const runSearch = async () => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }

      const [profileResult, groupResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(6),
        supabase
          .from("document_groups")
          .select("id, name")
          .eq("owner_id", user?.id || "")
          .ilike("name", `%${query}%`)
          .limit(4),
      ]);

      const profiles =
        (profileResult.data as Profile[] | null)?.map((profile) => ({
          id: profile.id,
          type: "user" as const,
          label:
            `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
            profile.email ||
            "User",
          sublabel: profile.email || undefined,
        })) || [];

      const groups =
        (groupResult.data as Group[] | null)?.map((group) => ({
          id: group.id,
          type: "group" as const,
          label: group.name,
          sublabel: "Group",
        })) || [];

      setSuggestions([...profiles, ...groups]);
    };

    const timer = window.setTimeout(() => void runSearch(), 200);
    return () => window.clearTimeout(timer);
  }, [query, user?.id]);

  const loadPublicLink = async () => {
    const { data } = await supabase
      .from("document_public_links")
      .select("token, access_level")
      .eq("document_id", documentId)
      .eq("is_active", true)
      .maybeSingle();

    if (data) {
      setPublicToken(data.token);
      setPublicAccess((data.access_level || "view") as AccessLevel);
    }
  };

  const addTarget = (target: ShareTarget, destination: "share" | "group" = "share") => {
    if (destination === "group") {
      setGroupMembers((current) =>
        current.some((item) => item.id === target.id) ? current : [...current, target]
      );
    } else {
      setTargets((current) =>
        current.some((item) => item.id === target.id && item.type === target.type)
          ? current
          : [...current, target]
      );
    }
    setQuery("");
    setSuggestions([]);
  };

  const shareDocument = async () => {
    setStatus("");
    try {
      const recipients = targets
        .filter((target) => target.type === "user" && target.sublabel?.includes("@"))
        .map((target) => ({
          email: target.sublabel as string,
          name: target.label,
        }));

      const inserts = targets.map((target) => ({
        document_id: documentId,
        target_user_id: target.type === "user" ? target.id : null,
        group_id: target.type === "group" ? target.id : null,
        access_level: access,
        created_by: ownerId,
      }));

      if (inserts.length > 0) {
        const { error } = await supabase.from("document_shares").upsert(inserts);
        if (error) throw error;
      }

      if (notifyPeople && recipients.length > 0) {
        const response = await fetch("/api/share-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipients,
            documentTitle,
            accessLevel: access,
            shareUrl:
              typeof window === "undefined"
                ? ""
                : `${window.location.origin}/dashboard/${documentId}`,
            senderName:
              user?.user_metadata?.first_name ||
              user?.email ||
              "Someone from AutoCourse",
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          setStatus(`Shared, but email notification failed: ${result.error || "SMTP error"}`);
        } else {
          setStatus("Shared and email notification sent.");
        }
      } else {
        setStatus("Shared.");
      }
      setTargets([]);
    } catch (error: any) {
      setStatus(error.message || "Could not share. Apply the sharing schema first.");
    }
  };

  const createGroup = async () => {
    if (!user || !groupName.trim()) return;
    setStatus("");

    try {
      const { data: group, error } = await supabase
        .from("document_groups")
        .insert({ owner_id: user.id, name: groupName.trim() })
        .select()
        .single();

      if (error) throw error;

      const members = groupMembers
        .filter((member) => member.type === "user")
        .map((member) => ({ group_id: group.id, user_id: member.id, added_by: user.id }));

      if (members.length > 0) {
        const { error: memberError } = await supabase.from("document_group_members").insert(members);
        if (memberError) throw memberError;
      }

      setTargets((current) => [
        ...current,
        { id: group.id, type: "group", label: group.name, sublabel: "Group" },
      ]);
      setGroupName("");
      setGroupMembers([]);
      setStatus("Group created and added to share list.");
    } catch (error: any) {
      setStatus(error.message || "Could not create group.");
    }
  };

  const createPublicLink = async () => {
    setStatus("");
    try {
      const { data: existingLink, error: lookupError } = await supabase
        .from("document_public_links")
        .select("id, token")
        .eq("document_id", documentId)
        .maybeSingle();

      if (lookupError) throw lookupError;

      let token = existingLink?.token || publicToken;

      if (existingLink) {
        const result = await supabase
          .from("document_public_links")
          .update({
            access_level: publicAccess,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingLink.id);
        if (result.error) throw result.error;
      } else {
        token = crypto.randomUUID();
        const result = await supabase.from("document_public_links").insert({
          document_id: documentId,
          created_by: ownerId,
          token,
          access_level: publicAccess,
          is_active: true,
        });
        if (result.error) throw result.error;
      }

      setPublicToken(token);
      setStatus("Public link ready.");
    } catch (error: any) {
      setStatus(error.message || "Could not create public link.");
    }
  };

  const publicHref =
    typeof window === "undefined" || !publicToken
      ? ""
      : `${window.location.origin}/share/${publicToken}`;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col dark:bg-gray-900">
        <div className="px-5 py-4 border-b flex items-center justify-between dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Share document</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Add people or groups, then choose access.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">People and groups</label>
            <div className="border border-gray-300 rounded-lg px-2 py-2 min-h-[46px] flex flex-wrap gap-2 relative dark:border-gray-700 dark:bg-gray-950">
              {targets.map((target) => (
                <Badge
                  key={`${target.type}-${target.id}`}
                  label={target.label}
                  sublabel={target.type === "group" ? "Group" : target.sublabel}
                  onRemove={() =>
                    setTargets((current) =>
                      current.filter((item) => item.id !== target.id || item.type !== target.type)
                    )
                  }
                />
              ))}
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={targets.length ? "" : "Type a name, email, or group"}
                className="flex-1 min-w-[220px] outline-none px-2 py-1 dark:bg-transparent dark:text-white dark:placeholder:text-gray-500"
              />
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden dark:border-gray-700 dark:bg-gray-900">
                  {suggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.type}-${suggestion.id}`}
                      onClick={() => addTarget(suggestion)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between dark:hover:bg-gray-800"
                    >
                      <span>
                        <span className="font-medium text-gray-900 dark:text-white">{suggestion.label}</span>
                        {suggestion.sublabel && (
                          <span className="block text-xs text-gray-500 dark:text-gray-400">{suggestion.sublabel}</span>
                        )}
                      </span>
                      {suggestion.type === "group" ? <Users size={16} /> : <Eye size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <select
                value={access}
                onChange={(event) => setAccess(event.target.value as AccessLevel)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              >
                <option value="view">View</option>
                <option value="comment">Comment</option>
                <option value="edit">Edit</option>
              </select>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={notifyPeople}
                  onChange={(event) => setNotifyPeople(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Notify people
              </label>
              <button
                onClick={shareDocument}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700"
              >
                Share
              </button>
            </div>
          </div>

          <div className="border-t pt-5">
            <h3 className="font-semibold text-gray-900 mb-3 dark:text-white">Create a group</h3>
            <div className="grid sm:grid-cols-[1fr_auto] gap-2 mb-3">
              <input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Group name"
                className="border border-gray-300 rounded-lg px-3 py-2 dark:border-gray-700 dark:bg-gray-950 dark:text-white dark:placeholder:text-gray-500"
              />
              <button
                onClick={createGroup}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold"
              >
                Create group
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {groupMembers.map((member) => (
                <Badge
                  key={member.id}
                  label={member.label}
                  sublabel={member.sublabel}
                  onRemove={() =>
                    setGroupMembers((current) => current.filter((item) => item.id !== member.id))
                  }
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Search a person above, then select them before creating a group.
            </p>
            {suggestions.some((item) => item.type === "user") && (
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions
                  .filter((item) => item.type === "user")
                  .slice(0, 4)
                  .map((suggestion) => (
                    <button
                      key={`member-${suggestion.id}`}
                      onClick={() => addTarget(suggestion, "group")}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full"
                    >
                      Add {suggestion.label}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="border-t pt-5">
            <h3 className="font-semibold text-gray-900 mb-3 dark:text-white">Public link</h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={publicAccess}
                onChange={(event) => setPublicAccess(event.target.value as AccessLevel)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
              >
                <option value="view">Anyone can view</option>
                <option value="comment">Anyone can comment</option>
                <option value="edit">Anyone can edit</option>
              </select>
              <button
                onClick={createPublicLink}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <LinkIcon size={16} />
                {publicToken ? "Update link" : "Create link"}
              </button>
            </div>
            {publicHref && (
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 break-all dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">
                {publicHref}
              </div>
            )}
          </div>

          {status && <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">{status}</div>}
        </div>
      </div>
    </div>
  );
}

function Badge({
  label,
  sublabel,
  onRemove,
}: {
  label: string;
  sublabel?: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 border border-blue-100 rounded-full px-3 py-1 text-sm">
      <span>
        {label}
        {sublabel && <span className="text-blue-500 ml-1">{sublabel}</span>}
      </span>
      <button onClick={onRemove} className="hover:text-blue-950">
        <X size={14} />
      </button>
    </span>
  );
}

function VersionHistoryDialog({
  documentId,
  onClose,
  onRestore,
}: {
  documentId: string;
  onClose: () => void;
  onRestore: (version: VersionRecord) => void;
}) {
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const { data, error } = await supabase
          .from("document_versions")
          .select("*")
          .eq("document_id", documentId)
          .order("created_at", { ascending: false })
          .limit(30);

        if (error) throw error;
        setVersions((data as VersionRecord[] | null) || []);
      } catch (error: any) {
        setError(error.message || "Could not load version history.");
      } finally {
        setLoading(false);
      }
    };

    void fetchVersions();
  }, [documentId]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col dark:bg-gray-900">
        <div className="px-5 py-4 border-b flex items-center justify-between dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Version history</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Restore an earlier saved version.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 overflow-auto">
          {loading && <Loader2 className="animate-spin text-primary-600 mx-auto my-10" />}
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
          {!loading && !error && versions.length === 0 && (
            <div className="text-center text-gray-500 py-10 dark:text-gray-400">
              <Clock size={34} className="mx-auto mb-2 text-gray-300" />
              No saved versions yet.
            </div>
          )}
          <div className="space-y-2">
            {versions.map((version) => (
              <button
                key={version.id}
                onClick={() => onRestore(version)}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 dark:border-gray-800 dark:hover:border-primary-700 dark:hover:bg-primary-950/30"
              >
                <div className="font-medium text-gray-900 dark:text-white">{version.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(version.created_at).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SavedToolsList({ docId, docContent }: { docId: string; docContent: string }) {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingTool, setViewingTool] = useState<any | null>(null);

  useEffect(() => {
    void fetchTools(true);
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

  if (viewingTool) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setViewingTool(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="border border-gray-200 rounded-lg p-4 dark:border-gray-800">
          <div className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">{viewingTool.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Created on {new Date(viewingTool.created_at).toLocaleDateString()}
            </p>
          </div>

          {viewingTool.type === "quiz" && (
            <Quiz
              uploadedContent={docContent}
              customization={{ difficulty: "medium", count: 10, topics: "" }}
              docId={docId}
              initialData={viewingTool.data}
            />
          )}
          {viewingTool.type === "flashcards" && (
            <Flashcards
              uploadedContent={docContent}
              customization={{ difficulty: "medium", count: 10, topics: "" }}
              docId={docId}
              initialData={viewingTool.data}
            />
          )}
          {viewingTool.type === "matching" && (
            <Matching
              uploadedContent={docContent}
              customization={{ difficulty: "medium", count: 10, topics: "" }}
              docId={docId}
              initialData={viewingTool.data}
            />
          )}
          {viewingTool.type === "frq" && (
            <FRQ
              uploadedContent={docContent}
              docId={docId}
              initialData={viewingTool.data}
              toolId={viewingTool.id}
            />
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div>
      {tools.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Folder size={44} className="mx-auto mb-4 text-gray-300" />
          <p>No saved tools yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setViewingTool(tool)}
              className="bg-white p-4 rounded-lg border border-gray-200 hover:border-primary-300 cursor-pointer transition-all flex items-center justify-between group text-left dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-700"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2 rounded-lg ${
                    tool.type === "frq" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {tool.type === "frq" ? <FileText size={20} /> : <BookOpen size={20} />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-300">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-gray-500 capitalize dark:text-gray-400">
                    {tool.type} • {new Date(tool.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <ChevronDown className="text-gray-300 -rotate-90 group-hover:text-primary-500" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
