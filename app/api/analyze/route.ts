import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// Global in-memory cache for hackathon demo
// In production: use Redis/Vercel KV
declare global {
  var analysisCache: Record<string, any> | undefined;
}

global.analysisCache = global.analysisCache || {};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { detail: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('[API] Received file:', file.name, file.type, file.size);

    // Forward to Python FastAPI backend
    const pythonFormData = new FormData();
    pythonFormData.append('file', file);

    const pythonUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
    console.log('[API] Forwarding to Python backend:', `${pythonUrl}/api/analyze`);

    const response = await fetch(`${pythonUrl}/api/analyze`, {
      method: 'POST',
      body: pythonFormData
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[API] Python backend error:', error);
      return NextResponse.json(error, { status: response.status });
    }

    const analysisResult = await response.json();
    console.log('[API] Analysis complete, SHDI:', analysisResult.shdi?.score);

    // Generate unique analysis ID
    const analysisId = nanoid();

    // Store result in cache
    if (!global.analysisCache) {
      global.analysisCache = {};
    }
    global.analysisCache[analysisId] = {
      analysis: analysisResult,
      timestamp: new Date().toISOString()
    };

    console.log('[API] Cached analysis with ID:', analysisId);

    return NextResponse.json({ analysisId });

  } catch (error: any) {
    console.error('[API] Error:', error);
    return NextResponse.json(
      { detail: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
