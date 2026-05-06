"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FileText, Loader2 } from "lucide-react";
import Logo from "@/components/Logo";

interface PublicLink {
  document_id: string;
  access_level: "view" | "comment" | "edit";
}

interface PublicDocument {
  id: string;
  name: string;
  content: string | null;
  updated_at?: string | null;
}

export default function PublicSharePage() {
  const { token } = useParams();
  const router = useRouter();
  const [document, setDocument] = useState<PublicDocument | null>(null);
  const [access, setAccess] = useState("view");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPublicDocument = async () => {
      try {
        const { data: link, error: linkError } = await supabase
          .from("document_public_links")
          .select("document_id, access_level")
          .eq("token", token)
          .eq("is_active", true)
          .single();

        if (linkError) throw linkError;

        const publicLink = link as PublicLink;
        setAccess(publicLink.access_level);

        const { data: doc, error: docError } = await supabase
          .from("documents")
          .select("id, name, content, updated_at")
          .eq("id", publicLink.document_id)
          .single();

        if (docError) throw docError;
        setDocument(doc as PublicDocument);
      } catch (error) {
        console.error("Public document error:", error);
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    if (token) void loadPublicDocument();
  }, [token, router]);

  if (loading || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="small" />
          <div className="inline-flex items-center gap-2 text-sm text-gray-600">
            <FileText size={16} />
            Public {access} link
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <article className="bg-white border border-gray-200 shadow-sm mx-auto max-w-[900px] min-h-[70vh] p-8 sm:p-12 rounded-lg">
          <h1 className="sr-only">{document.name}</h1>
          <div
            className="prose-editor text-gray-900 leading-7"
            dangerouslySetInnerHTML={{ __html: document.content || "" }}
          />
        </article>
      </main>
    </div>
  );
}

