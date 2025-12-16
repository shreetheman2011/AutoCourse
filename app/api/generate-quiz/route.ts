import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56b95b3c-eb0c-44fe-a59a-a8ce431c86b1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-quiz/route.ts:7',message:'POST handler entry',data:{hasReq:true},timestamp:Date.now(),sessionId:'debug-session',runId:'quiz-run2',hypothesisId:'Q1,Q2,Q3,Q4'})}).catch(()=>{});
    // #endregion

    const { content, count, difficulty, topics } = await req.json();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56b95b3c-eb0c-44fe-a59a-a8ce431c86b1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-quiz/route.ts:13',message:'Inputs received',data:{hasContent:!!content,count, difficulty, topics},timestamp:Date.now(),sessionId:'debug-session',runId:'quiz-run2',hypothesisId:'Q2,Q3'})}).catch(()=>{});
    // #endregion

    if (!process.env.GEMINI_API_KEY) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/56b95b3c-eb0c-44fe-a59a-a8ce431c86b1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-quiz/route.ts:20',message:'Missing GEMINI_API_KEY',data:{envPresent:false},timestamp:Date.now(),sessionId:'debug-session',runId:'quiz-run2',hypothesisId:'Q1'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    const prompt = `You are an educational content generator. Always respond with valid JSON only.

Based on the following study content${
      topics ? ` focusing on: ${topics}` : ""
    }, generate ${count} multiple-choice quiz questions with ${difficulty} difficulty level.

Content:
${content?.substring(0, 3000) ?? ""}

Generate quiz questions in the following JSON format:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Make sure:
- correctAnswer is the index (0-3) of the correct option
- All questions have exactly 4 options
- Questions are appropriate for ${difficulty} level
- Include helpful explanations

Return ONLY valid JSON, no additional text.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
      },
    });

    const response = await result.response;
    const responseText = response.text();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56b95b3c-eb0c-44fe-a59a-a8ce431c86b1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-quiz/route.ts:58',message:'Model responded',data:{responseLength:responseText?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'quiz-run2',hypothesisId:'Q2,Q3'})}).catch(()=>{});
    // #endregion

    // Try to extract JSON from the response (in case there's markdown formatting)
    let jsonText = responseText.trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56b95b3c-eb0c-44fe-a59a-a8ce431c86b1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-quiz/route.ts:71',message:'JSON parsed',data:{questionsCount:parsed?.questions?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'quiz-run2',hypothesisId:'Q2,Q3'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({ questions: parsed.questions || [] });
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56b95b3c-eb0c-44fe-a59a-a8ce431c86b1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-quiz/route.ts:78',message:'Error caught',data:{errorName:error?.name,errorMessage:error?.message,errorStack:error?.stack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'quiz-run2',hypothesisId:'Q1,Q2,Q3,Q4'})}).catch(()=>{});
    // #endregion

    console.error("Quiz generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate quiz" },
      { status: 500 }
    );
  }
}
