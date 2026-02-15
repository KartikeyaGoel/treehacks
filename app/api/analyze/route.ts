import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { appendFileSync } from 'fs';
import { join } from 'path';
import { SleepAnalyzer, parseAppleHealthXML, parseFitbitCSV, parseOuraCSV, validateSleepData } from '@/lib/sleep-analysis';
import { setAnalysis } from '@/lib/cache';

const DEBUG_LOG = join(process.cwd(), '.cursor', 'debug.log');
function debugLog(payload: object) {
  // Only write to filesystem in development (not on Vercel)
  if (process.env.VERCEL !== '1') {
    try {
      appendFileSync(DEBUG_LOG, JSON.stringify(payload) + '\n');
    } catch (_) {
      // Silently fail if .cursor directory doesn't exist
    }
  }
}

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

    const pythonUrl = process.env.PYTHON_API_URL;

    // If PYTHON_API_URL is not set, use TypeScript pipeline for Vercel deployment
    if (!pythonUrl) {
      console.log('[API] Using TypeScript analysis pipeline (Python backend not configured)');

      try {
        // Read file content
        const fileContent = await file.text();

        // Determine file type and parse accordingly
        let sleepRecords;
        if (file.name.endsWith('.xml')) {
          sleepRecords = parseAppleHealthXML(fileContent);
        } else if (file.name.endsWith('.csv')) {
          // Try Fitbit format first, then Oura if it fails
          try {
            sleepRecords = parseFitbitCSV(fileContent);
          } catch {
            sleepRecords = parseOuraCSV(fileContent);
          }
        } else {
          return NextResponse.json(
            { detail: 'Unsupported file format. Please upload .xml (Apple Health) or .csv (Fitbit/Oura)' },
            { status: 400 }
          );
        }

        // Validate data
        const validation = validateSleepData(sleepRecords);
        if (!validation.valid) {
          return NextResponse.json(
            { detail: validation.error_message },
            { status: 422 }
          );
        }

        // Run analysis
        const analyzer = new SleepAnalyzer();
        const analysisResult = analyzer.analyze(sleepRecords);

        // Generate unique analysis ID
        const analysisId = nanoid();

        // Store result in cache
        await setAnalysis(analysisId, {
          analysis: analysisResult,
          timestamp: new Date().toISOString()
        });

        console.log('[API] Analysis complete (TypeScript), SHDI:', analysisResult.shdi.score);
        console.log('[API] Cached analysis with ID:', analysisId);

        return NextResponse.json({ analysisId });

      } catch (parseError: any) {
        console.error('[API] TypeScript analysis error:', parseError);
        return NextResponse.json(
          { detail: `Analysis failed: ${parseError.message}` },
          { status: 500 }
        );
      }
    }

    // Otherwise, forward to Python FastAPI backend
    const pythonFormData = new FormData();
    pythonFormData.append('file', file);

    const fullAnalyzeUrl = `${pythonUrl}/api/analyze`;
    console.log('[API] Forwarding to Python backend:', fullAnalyzeUrl);

    // #region agent log
    const prePayload = {location:'app/api/analyze/route.ts:pre-fetch',message:'Resolved backend URL and env',data:{pythonUrl,fullAnalyzeUrl,hasPythonApiUrlEnv:!!process.env.PYTHON_API_URL},timestamp:Date.now(),hypothesisId:'H1-H5'};
    fetch('http://127.0.0.1:7244/ingest/bcf9a0ec-9ec4-4e87-a18b-766fbe011f8b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(prePayload)}).catch(()=>{});
    debugLog(prePayload);
    // #endregion

    const response = await fetch(fullAnalyzeUrl, {
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
    await setAnalysis(analysisId, {
      analysis: analysisResult,
      timestamp: new Date().toISOString()
    });

    console.log('[API] Cached analysis with ID:', analysisId);

    return NextResponse.json({ analysisId });

  } catch (error: any) {
    console.error('[API] Error:', error);
    // #region agent log
    const cause = error?.cause ?? error;
    const catchPayload = {location:'app/api/analyze/route.ts:catch',message:'Fetch failed',data:{errorMessage:error?.message,causeCode:cause?.code,causeMessage:cause?.message},timestamp:Date.now(),hypothesisId:'H1-H5'};
    fetch('http://127.0.0.1:7244/ingest/bcf9a0ec-9ec4-4e87-a18b-766fbe011f8b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(catchPayload)}).catch(()=>{});
    debugLog(catchPayload);
    // #endregion
    const isBackendUnreachable =
      cause?.code === 'ECONNREFUSED' ||
      cause?.code === 'ENOTFOUND' ||
      cause?.code === 'ETIMEDOUT';
    if (isBackendUnreachable) {
      // #region agent log
      debugLog({ location: 'app/api/analyze/route.ts:503', message: 'Returning 503 backend unreachable', data: { causeCode: cause?.code }, timestamp: Date.now(), hypothesisId: 'verify' });
      // #endregion
      return NextResponse.json(
        {
          detail:
            'Analysis backend is not running. Start it with: npm run python:dev (in a separate terminal).'
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { detail: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
