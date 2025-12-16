import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import pdf from "pdf-parse";

// Ensure Node.js runtime for pdf-parse compatibility
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56b95b3c-eb0c-44fe-a59a-a8ce431c86b1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-pdf/route.ts:7',message:'POST handler entry',data:{hasFormData:true},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
    // #endregion

    const formData = await req.formData();
    const file = formData.get("file") as File;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56b95b3c-eb0c-44fe-a59a-a8ce431c86b1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-pdf/route.ts:11',message:'File extracted from formData',data:{fileExists:!!file,fileName:file?.name,fileSize:file?.size,fileType:file?.type,isFileInstance:file instanceof File},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B,D'})}).catch(()=>{});
    // #endregion

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56b95b3c-eb0c-44fe-a59a-a8ce431c86b1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-pdf/route.ts:20',message:'ArrayBuffer created',data:{bytesExists:!!bytes,bytesType:typeof bytes,bytesLength:bytes?.byteLength,isArrayBuffer:bytes instanceof ArrayBuffer},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    const buffer = Buffer.from(bytes);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56b95b3c-eb0c-44fe-a59a-a8ce431c86b1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-pdf/route.ts:24',message:'Buffer created before pdf-parse',data:{bufferExists:!!buffer,isBuffer:Buffer.isBuffer(buffer),bufferLength:buffer?.length,bufferType:typeof buffer,hasBufferConstructor:typeof Buffer !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,C,E'})}).catch(()=>{});
    // #endregion

    // Parse PDF
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56b95b3c-eb0c-44fe-a59a-a8ce431c86b1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-pdf/route.ts:30',message:'About to call pdf-parse',data:{pdfFunctionExists:typeof pdf === 'function',bufferFirstBytes:buffer?.slice(0,10)?.toString('hex')},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,C,D'})}).catch(()=>{});
    // #endregion

    const data = await pdf(buffer);
    const text = data.text;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56b95b3c-eb0c-44fe-a59a-a8ce431c86b1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-pdf/route.ts:35',message:'pdf-parse succeeded',data:{hasData:!!data,hasText:!!text,textLength:text?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,C,D'})}).catch(()=>{});
    // #endregion

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from PDF" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      content: text,
      pages: data.numpages,
    });
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56b95b3c-eb0c-44fe-a59a-a8ce431c86b1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'upload-pdf/route.ts:50',message:'Error caught',data:{errorName:error?.name,errorMessage:error?.message,errorStack:error?.stack?.substring(0,500),errorType:typeof error,hasBuffer:typeof Buffer !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
    // #endregion

    console.error("PDF upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process PDF" },
      { status: 500 }
    );
  }
}
