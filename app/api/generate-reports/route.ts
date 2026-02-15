/// <reference types="node" />
import { NextRequest, NextResponse } from 'next/server';
import { SOMNIOrchestrator } from '@/lib/agents/orchestrator';
import { generatePatientReport } from '@/lib/reports/patient-report';
import { generateClinicalReport } from '@/lib/reports/clinical-report';
import { getAnalysis, setAnalysis } from '@/lib/cache';

export async function POST(req: NextRequest) {
  try {
    const { analysisId } = await req.json();

    // Retrieve cached analysis
    const cached = await getAnalysis(analysisId);
    if (!cached) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    const sleepAnalysis = cached.analysis;

    console.log('[Reports] Generating reports for analysis:', analysisId);

    // Require Anthropic + OpenAI for medical reasoning; Perplexity and Bright Data are optional (mock used when missing)
    const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim());
    const hasPerplexity = Boolean(process.env.PERPLEXITY_API_KEY?.trim());
    const hasCoreKeys = hasAnthropic && hasOpenAI;

    console.log(
      '[Reports] API keys:',
      { anthropic: hasAnthropic, openai: hasOpenAI, perplexity: hasPerplexity, orchestration: hasCoreKeys }
    );

    let patientReport: string;
    let clinicalReport: string;
    let evidence: any[] = [];
    let usage: any = undefined;

    if (hasCoreKeys) {
      console.log('[Reports] Using full multi-agent orchestration');

      // Full orchestration (Perplexity/Bright Data optional; mocks used when missing)
      const orchestrator = new SOMNIOrchestrator(
        process.env.ANTHROPIC_API_KEY!,
        process.env.OPENAI_API_KEY!,
        process.env.PERPLEXITY_API_KEY?.trim() ?? '',
        process.env.BRIGHTDATA_API_KEY?.trim() ?? ''
      );

      const reports = await orchestrator.orchestrate(sleepAnalysis);
      patientReport = reports.patient_report;
      clinicalReport = reports.clinical_report;
      evidence = reports.evidence;
      usage = reports.usage;

    } else {
      console.log(
        '[Reports] Using direct report generation (need ANTHROPIC_API_KEY + OPENAI_API_KEY for medical reasoning)'
      );

      // Fallback: Generate reports directly without orchestration
      // Mock evidence for demo
      evidence = [{
        title: 'Sleep fragmentation and cardiovascular disease risk',
        authors: 'Smith J, et al.',
        journal: 'Sleep Medicine Reviews',
        year: 2023,
        study_type: 'Meta-analysis',
        sample_size: 12500,
        effect_size_description: 'Moderate association (HR 1.35)',
        hazard_ratio: 1.35,
        confidence_interval: '1.20-1.52',
        key_finding: 'Sleep fragmentation associated with 35% increased cardiovascular risk',
        evidence_strength: 'strong' as const,
        pattern_description: 'increased sleep fragmentation',
        health_domain: 'cardiovascular'
      }];

      patientReport = generatePatientReport(sleepAnalysis, evidence);
      clinicalReport = generateClinicalReport(sleepAnalysis, evidence);
    }

    // Cache the reports
    await setAnalysis(analysisId, {
      ...cached,
      reports: {
        patient: patientReport,
        clinical: clinicalReport,
        evidence,
        usage
      }
    });

    console.log('[Reports] Reports generated successfully');

    return NextResponse.json({
      patient_report: patientReport,
      clinical_report: clinicalReport,
      evidence,
      usage
    });

  } catch (error: any) {
    console.error('[Reports] Error:', error);
    return NextResponse.json(
      { error: `Report generation failed: ${error.message}` },
      { status: 500 }
    );
  }
}
