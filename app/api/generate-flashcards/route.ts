import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const { content, count, difficulty, topics } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    const prompt = `You are an educational content generator. Always respond with valid JSON only.

Based on the following study content${
      topics ? ` focusing on: ${topics}` : ""
    }, generate ${count} flashcards with a ${difficulty} difficulty level.

Content:
${content.substring(0, 3000)}

Generate flashcards in the following JSON format:
{
  "flashcards": [
    {
      "front": "Question or term",
      "back": "Answer or definition"
    }
  ]
}

Make sure the flashcards are educational, clear, and appropriate for ${difficulty} level. Return ONLY valid JSON, no additional text.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
      },
    });

    const response = await result.response;
    const responseText = response.text();

    // Try to extract JSON from the response (in case there's markdown formatting)
    let jsonText = responseText.trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    return NextResponse.json({ flashcards: parsed.flashcards || [] });
  } catch (error: any) {
    console.error("Flashcard generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate flashcards" },
      { status: 500 }
    );
  }
}
