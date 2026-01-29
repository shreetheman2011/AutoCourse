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

    const prompt = `You are an educational content generator specializing in AP-style Free Response Questions (FRQs).
    
Based on the following study content${
      topics ? ` focusing on: ${topics}` : ""
    }, generate ${count} FRQ (Free Response Question) prompts with a ${difficulty} difficulty level.

Content:
${content.substring(0, 4000)}

For each FRQ, provide:
1. The Question Prompt (scenario based or conceptual. start it with the frq dedicated terms from AP classes: define, explain, describe, identify, compare, etc.).
2. A detailed Scoring Guideline (rubric) explaining how points are awarded.
3. A Sample High-Quality Answer.

Generate the output in the following JSON format:
{
  "frqs": [
    {
      "prompt": "The detailed question prompt...",
      "scoring_guideline": [
         "1 point for explaining X",
         "1 point for identifying Y"
      ],
      "sample_answer": "A perfect response would be..."
    }
  ]
}

Ensure the questions encourage critical thinking and deep understanding.
Return ONLY valid JSON.`;

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

    return NextResponse.json({ frqs: parsed.frqs || [] });
  } catch (error: any) {
    console.error("FRQ generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate FRQs" },
      { status: 500 }
    );
  }
}
