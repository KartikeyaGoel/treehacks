import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { ClinicalReportPDF } from './clinical-pdf';
import type { SleepAnalysisResult, ResearchEvidence } from '../agents/types';

/**
 * Generate a PDF buffer for the clinical report
 * @param analysis - Sleep analysis results
 * @param evidence - Research evidence citations
 * @param analysisId - Optional analysis ID
 * @returns Promise<Buffer> - PDF buffer ready to be sent as response
 */
export async function generateClinicalReportPDF(
  analysis: SleepAnalysisResult,
  evidence: ResearchEvidence[] = [],
  analysisId?: string
): Promise<Buffer> {
  const pdfElement = ClinicalReportPDF({
    analysis,
    evidence,
    generatedDate: new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }),
    analysisId,
  });

  // Render the React-PDF document to a buffer (cast: component returns JSX element)
  const pdfBuffer = await renderToBuffer(pdfElement as React.ReactElement);

  return Buffer.from(pdfBuffer);
}
