"""
FastAPI main application
Handles file upload, validation, and sleep analysis
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sleep_analysis.core import SleepAnalyzer
from sleep_analysis.validators import detect_format_and_parse, validate_sleep_data
from sleep_analysis.models import SleepAnalysisResult

app = FastAPI(
    title="SOMNI AI API",
    description="Sleep Health Intelligence System - Backend API",
    version="1.0.0"
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Health check (JSON) for scripts and load balancers"""
    return {"status": "healthy", "service": "SOMNI AI Backend", "version": "1.0.0"}


@app.get("/", response_class=HTMLResponse)
async def root():
    """Root: show message for browsers; API is at /api/analyze and /docs"""
    return """
    <!DOCTYPE html>
    <html>
    <head><title>SOMNI AI API</title></head>
    <body style="font-family:sans-serif;max-width:480px;margin:2rem auto;padding:1rem;">
      <h1>SOMNI AI Backend</h1>
      <p>This is the <strong>API server</strong> (port 8000). It does not serve the app UI.</p>
      <p><strong>Open the frontend</strong> in your browser:</p>
      <p><a href="http://localhost:3000">http://localhost:3000</a></p>
      <p>API docs: <a href="/docs">/docs</a></p>
    </body>
    </html>
    """


@app.post("/api/analyze")
async def analyze_sleep_data(file: UploadFile = File(...)):
    """
    Analyze sleep data from uploaded file

    Supports:
    - Apple Health export.xml
    - Fitbit sleep.csv
    - Oura sleep.csv

    Returns:
        Sleep analysis result with z-scores, SHDI, phenotype classification
    """
    try:
        # Read file content
        content = await file.read()
        file_content = content.decode('utf-8')

        # Detect format and parse
        try:
            sleep_records = detect_format_and_parse(file_content, file.filename)
        except ValueError as e:
            raise HTTPException(
                status_code=422,
                detail=f"Failed to parse file: {str(e)}"
            )

        # Validate data
        records_dict = [r.model_dump() for r in sleep_records]
        validation = validate_sleep_data(records_dict)

        if not validation.valid:
            raise HTTPException(
                status_code=422,
                detail=validation.error_message
            )

        # Run analysis
        analyzer = SleepAnalyzer()
        try:
            result = analyzer.analyze(sleep_records)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Analysis failed: {str(e)}"
            )

        # Return result as JSON
        return JSONResponse(
            content=result.model_dump(mode='json'),
            status_code=200
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "components": {
            "api": "up",
            "analyzer": "ready"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
