import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT =
  "You are a helpful AI study assistant. You help students understand concepts, answer questions, and provide study guidance. Be clear, concise, and educational.";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // Build Gemini chat history
    const chatHistory = [
      // ✅ System instruction injected as first message
      {
        role: "user",
        parts: [{ text: SYSTEM_PROMPT }],
      },

      // ✅ User + assistant messages
      ...messages
        .filter((m: any) => m.role !== "system")
        .slice(-10)
        .map((m: any) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        })),
    ];

    const result = await model.generateContent({
      contents: chatHistory,
      generationConfig: {
        temperature: 0.7,
      },
    });

    const response = result.response;
    const message = response.text() || "No response generated";

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get chat response" },
      { status: 500 }
    );
  }
}
