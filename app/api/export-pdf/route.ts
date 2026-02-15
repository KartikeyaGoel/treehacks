import { NextRequest, NextResponse } from 'next/server';
import { generateClinicalReportPDF } from '@/lib/reports/generate-pdf';
import { getAnalysis } from '@/lib/cache';

export async function POST(req: NextRequest) {
  try {
    const { analysisId } = await req.json();

    // Retrieve cached analysis and reports
    const analysisData = await getAnalysis(analysisId);
    if (!analysisData) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Generate PDF buffer
    const pdfBuffer = await generateClinicalReportPDF(
      analysisData.analysis,
      analysisData.reports?.evidence || [],
      analysisId
    );

    // Return as downloadable PDF (Uint8Array for BodyInit type compatibility)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="somni-clinical-report-${analysisId}.pdf"`
      }
    });

  } catch (error: any) {
    console.error('[PDF Export] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

// Required for @react-pdf/renderer to work in Node.js environment
export const runtime = 'nodejs';
