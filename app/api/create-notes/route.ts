import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.CHATGPT_SECRET_KEY || "",
});

export const runtime = "nodejs";

type SourceType = "voice" | "pdf" | "url" | "text";

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

async function fetchReadableUrl(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; AutoCourseNotes/1.0; +https://autocourse.local)",
      accept: "text/html, text/plain;q=0.9, */*;q=0.8",
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Could not fetch URL (${response.status})`);
  }

  const html = await response.text();
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaMatch = html.match(
    /<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["'][^>]*>/i
  );

  return {
    title: stripHtml(titleMatch?.[1] || "Imported notes"),
    text: [metaMatch?.[1], stripHtml(html)].filter(Boolean).join("\n\n"),
  };
}

export async function POST(req: NextRequest) {
  try {
    const {
      sourceType = "text",
      content = "",
      url = "",
      title = "",
    }: {
      sourceType?: SourceType;
      content?: string;
      url?: string;
      title?: string;
    } = await req.json();

    if (!process.env.CHATGPT_SECRET_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key (CHATGPT_SECRET_KEY) not configured" },
        { status: 500 }
      );
    }

    let sourceTitle = title || "Untitled study doc";
    let sourceContent = content;

    if (sourceType === "url") {
      if (!url) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 });
      }

      const fetched = await fetchReadableUrl(url);
      sourceTitle = title || fetched.title || url;
      sourceContent = [content, fetched.text, `Source URL: ${url}`]
        .filter(Boolean)
        .join("\n\n");
    }

    if (!sourceContent.trim()) {
      return NextResponse.json(
        { error: "No source content was provided" },
        { status: 400 }
      );
    }

    const prompt = `Turn the source material into fully structured study notes for an editable document.

Source type: ${sourceType}
Suggested title: ${sourceTitle}

Source material:
${sourceContent.substring(0, 12000)}

Create notes that are clean, complete, and ready to study from. Use strong formatting: headings, short paragraphs, bulleted lists, tables when useful, key-term callouts, formulas or timelines when relevant, and a final review section.

Return ONLY valid JSON in this shape:
{
  "title": "Short useful document title",
  "html": "<h1>...</h1><p>...</p>",
  "summary": "One sentence summary"
}

Rules:
- html must contain only simple document tags: h1, h2, h3, p, ul, ol, li, strong, em, blockquote, table, thead, tbody, tr, th, td, hr.
- Do not include markdown fences.
- Do not invent facts beyond the provided material. If the source is thin, create a clearly labeled outline from what is available.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You output valid JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.35,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(completion.choices[0].message.content || "{}");
    const html = sanitizeHtml(parsed.html || "");

    return NextResponse.json({
      title: parsed.title || sourceTitle,
      html,
      summary: parsed.summary || "",
    });
  } catch (error: any) {
    console.error("Create notes error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create notes" },
      { status: 500 }
    );
  }
}

