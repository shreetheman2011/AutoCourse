import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.CHATGPT_SECRET_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const { question, scoring_guideline, user_answer } = await req.json();

    if (!process.env.CHATGPT_SECRET_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key (CHATGPT_SECRET_KEY) not configured" },
        { status: 500 }
      );
    }

    const prompt = `You are an expert AP grader. Grade the student response based strictly on the provided scoring guideline.

Question: "${question}"

Scoring Guideline:
${JSON.stringify(scoring_guideline, null, 2)}

Student Answer: "${user_answer}"

INSTRUCTIONS:
1. Determine how many points the student earned based on the guideline.
2. Determine the TOTAL POSSIBLE points from the guideline.
3. SCALE the score to be out of 10. (e.g. if student got 4/4, score is 10. if 2/4, score is 5). Round to the nearest integer.

Provide:
1. A Score (integer) normalized to be out of 10.
2. Detailed Feedback explaining why points were awarded or missed.


Return ONLY valid JSON in this format:
{
  "score": 7,
  "feedback": "You successfully identified..."
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant that outputs JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0].message.content || "{}";
    const parsed = JSON.parse(responseText);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("FRQ grading error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to grade FRQ" },
      { status: 500 }
    );
  }
}
