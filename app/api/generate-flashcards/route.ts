import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.CHATGPT_SECRET_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const { content, count, difficulty, topics } = await req.json();

    if (!process.env.CHATGPT_SECRET_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key (CHATGPT_SECRET_KEY) not configured" },
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant that outputs JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0].message.content || "{}";
    const parsed = JSON.parse(responseText);

    return NextResponse.json({ flashcards: parsed.flashcards || [] });
  } catch (error: any) {
    console.error("Flashcard generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate flashcards" },
      { status: 500 }
    );
  }
}

