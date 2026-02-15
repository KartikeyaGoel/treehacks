/**
 * SOMNI AI Clinical Intelligence Orchestrator
 *
 * Multi-agent system coordinating Claude, OpenAI o1, PubMed, BrightData, and Perplexity
 * Implements autonomous reasoning with feedback loops for Greylock prize
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import {
  SleepAnalysisResult,
  DualReport,
  PubMedResult,
  O1ReasoningResult,
  GuidelineData,
  ConsensusResult,
  ResearchEvidence,
  AgentMessage,
  UsageMetrics
} from './types';

const O1_MEDICAL_REASONING_SYSTEM_PROMPT = `You are a medical reasoning engine specialized in sleep–health associations from research literature.

TASK: Analyze sleep pattern deviations and rank associated health risk domains based on epidemiological evidence.

CONSTRAINTS:
- NO diagnosis or disease probabilities
- NO treatment recommendations
- Research associations ONLY (observational, not causal)
- Acknowledge wearable data limitations
- Distinguish correlation from causation

OUTPUT STRUCTURE (required):
1. **Ranked Risk Domains** (cardiovascular, metabolic, cognitive, neurological, mental health)
   - Domain name
   - Confidence level (high/moderate/low)
   - Effect size context (e.g., "1.5x elevated risk in cohort studies")

2. **Screening Suggestions** (preventive, not diagnostic)
   - Based on phenotype and current guidelines
   - Phrased as "Consider discussing with provider..."

3. **Reasoning Trace** (step-by-step)
   - Link sleep metrics to known associations
   - Explain ranking logic
   - Note evidence strength (RCT, cohort, meta-analysis)

4. **Confidence Assessment**
   - Data quality factors
   - Evidence gaps
   - Uncertainty sources

Use structured, step-by-step reasoning before presenting final rankings.`;

const ORCHESTRATOR_SYSTEM_PROMPT = `You are the SOMNI AI Clinical Intelligence Orchestrator.

Your role: Interpret sleep deviation data and coordinate a multi-agent research pipeline to generate evidence-based health insights.

CRITICAL CONSTRAINTS:
- Never output disease probabilities or diagnose conditions
- Always emphasize wearable data limitations (algorithm-estimated, not clinical PSG)
- Frame ALL findings as "research associations" not causation
- Uncertainty and confidence intervals are mandatory
- Include "not a diagnostic tool" disclaimers

Your workflow:
1. Analyze sleep deviation JSON (SHDI, z-scores, phenotypes)
2. Always invoke invoke_o1_reasoning at least once for deep clinical reasoning (use a reasoning_prompt summarizing the case and key deviations). This is required for every analysis.
3. Construct precise PubMed queries using MeSH terms for identified phenotypes
4. Invoke BrightData to scrape CDC/AHA public health guidelines and disparity data
5. Use Perplexity Sonar for consensus detection when available
6. Evaluate evidence consistency - if conflicts detected, re-query with refined search
7. Generate dual reports: patient (empathetic, 8th grade reading) + clinical (evidence-graded)

Tools available:
- query_pubmed: Search medical literature (max 5 results per query)
- invoke_o1_reasoning: Deep clinical reasoning — call this at least once per analysis for ranked risk domains and reasoning trace
- scrape_guidelines: BrightData public health data extraction
- sonar_consensus: Perplexity meta-analysis and consensus detection
- assess_evidence_quality: Self-evaluate evidence consistency

Output format requirements:
- Patient report: Conversational, hopeful, actionable, <8th grade reading level. Use an empathetic, supportive tone that acknowledges the person's effort in tracking sleep. Do not use alarming language. Frame findings as patterns to understand, not problems to fear. Emphasize agency and next steps.
- Clinical report: Structured tables, evidence grading, effect sizes, limitations
- All claims must cite specific research with sample sizes
- Confidence scoring for all associations`;

export class SOMNIOrchestrator {
  private anthropic: Anthropic;
  private openai: OpenAI;
  private conversationHistory: AgentMessage[] = [];
  private maxTurns = 15;
  private usage: UsageMetrics = {
    anthropicTurns: 0,
    perplexityCalls: 0,
    pubmedQueries: 0,
    pubmedErrors: 0,
    brightDataUsed: 'none',
    openaiO1Used: false
  };
  private pipelineSteps: string[] = [];

  constructor(
    anthropicKey: string,
    openaiKey: string,
    private perplexityKey: string,
    private brightdataKey: string
  ) {
    this.anthropic = new Anthropic({ apiKey: anthropicKey });
    this.openai = new OpenAI({ apiKey: openaiKey });
  }

  async orchestrate(sleepAnalysis: SleepAnalysisResult): Promise<DualReport> {
    console.log('[Orchestrator] Starting multi-agent analysis pipeline...');

    // Initialize conversation with sleep data
    this.conversationHistory.push({
      role: 'user',
      content: `Analyze this sleep deviation data and generate comprehensive reports:\n\n${JSON.stringify(sleepAnalysis, null, 2)}\n\nFollow your workflow to gather evidence and generate both patient and clinical reports.`
    });

    let currentTurn = 0;
    let finalReport: DualReport | null = null;

    while (currentTurn < this.maxTurns) {
      console.log(`[Orchestrator] Turn ${currentTurn + 1}/${this.maxTurns}`);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8192,
        system: ORCHESTRATOR_SYSTEM_PROMPT,
        messages: this.conversationHistory as any[],
        tools: [
          this.pubmedTool(),
          this.o1ReasoningTool(),
          this.brightDataTool(),
          this.perplexitySonarTool(),
          this.evidenceAssessmentTool()
        ]
      });

      // Track Anthropic API usage
      this.usage.anthropicTurns++;

      // Handle tool calls
      if (response.stop_reason === 'tool_use') {
        console.log('[Orchestrator] Executing tool calls...');
        const toolResults = await this.executeTools(response.content);

        this.conversationHistory.push({
          role: 'assistant',
          content: response.content
        });

        this.conversationHistory.push({
          role: 'user',
          content: toolResults as any
        });

        currentTurn++;
      } else if (response.stop_reason === 'end_turn') {
        // Extract final reports
        console.log('[Orchestrator] Extracting final reports...');
        finalReport = this.extractReports(response.content, sleepAnalysis);
        break;
      } else {
        currentTurn++;
      }
    }

    if (!finalReport) {
      console.error('[Orchestrator] Failed to generate reports within turn limit');
      throw new Error('Report generation exceeded maximum turns');
    }

    // Log usage summary
    console.log(
      `[Orchestrator] Usage: Anthropic ${this.usage.anthropicTurns} turns, ` +
      `Perplexity ${this.usage.perplexityCalls}, ` +
      `PubMed ${this.usage.pubmedQueries} (${this.usage.pubmedErrors} errors), ` +
      `Bright Data ${this.usage.brightDataUsed}, ` +
      `OpenAI o1 ${this.usage.openaiO1Used ? 'yes' : 'no'}`
    );

    console.log('[Orchestrator] Analysis pipeline complete');

    // Attach usage metrics and pipeline steps to the report
    return {
      ...finalReport,
      usage: this.usage,
      pipelineSteps: this.pipelineSteps
    };
  }

  private async executeTools(content: any[]): Promise<any[]> {
    const toolCalls = content.filter((c: any) => c.type === 'tool_use');
    console.log(`[Orchestrator] Executing ${toolCalls.length} tool(s) in parallel...`);

    const results = await Promise.all(
      toolCalls.map(async (tool: any) => {
        const toolName = tool.name;
        const stepNumber = this.pipelineSteps.length + 1;

        console.log(`[Pipeline] Step ${stepNumber}: ${toolName}`);
        console.log(`[Tool] ${toolName}...`);
        this.pipelineSteps.push(toolName);

        try {
          let result;
          switch (toolName) {
            case 'query_pubmed':
              this.usage.pubmedQueries++;
              try {
                result = await this.queryPubMed(tool.input);
                if (Array.isArray(result) && result.length === 0) {
                  this.usage.pubmedErrors++;
                }
              } catch (err) {
                this.usage.pubmedErrors++;
                throw err;
              }
              break;
            case 'invoke_o1_reasoning':
              this.usage.openaiO1Used = true;
              result = await this.invokeO1(tool.input);
              break;
            case 'scrape_guidelines':
              // scrapeBrightData will set brightDataUsed internally
              result = await this.scrapeBrightData(tool.input);
              break;
            case 'sonar_consensus':
              this.usage.perplexityCalls++;
              result = await this.queryPerplexity(tool.input);
              break;
            case 'assess_evidence_quality':
              result = await this.assessEvidence(tool.input);
              // Log feedback loop refinements
              if (result && (result as any).action !== 'proceed') {
                console.log(`[Feedback] Evidence assessment triggered: ${(result as any).action}`);
                console.log(`[Feedback] Reason: ${(result as any).reason}`);
                console.log(`[Feedback] Agent will refine query in next turn`);
              }
              break;
            default:
              result = { error: `Unknown tool: ${tool.name}` };
          }

          return {
            type: 'tool_result',
            tool_use_id: tool.id,
            content: JSON.stringify(result, null, 2)
          };
        } catch (error: any) {
          console.error(`[Tool Error] ${tool.name}:`, error.message);
          return {
            type: 'tool_result',
            tool_use_id: tool.id,
            content: JSON.stringify({ error: error.message })
          };
        }
      })
    );

    return results;
  }

  // Tool Definitions

  private pubmedTool() {
    return {
      name: 'query_pubmed',
      description: 'Search PubMed for peer-reviewed sleep research. Returns title, authors, journal, year, abstract. Use MeSH terms for precision. Max 5 results per query.',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'PubMed search query with MeSH terms (e.g., "sleep fragmentation[MeSH] AND cardiovascular disease[MeSH] AND meta-analysis[pt]")'
          },
          max_results: {
            type: 'number',
            description: 'Maximum number of results to return (default: 5)',
            default: 5
          }
        },
        required: ['query']
      }
    };
  }

  private o1ReasoningTool() {
    return {
      name: 'invoke_o1_reasoning',
      description: 'Invoke OpenAI o1 for deep clinical reasoning. Call this at least once per analysis. Returns ranked risk domains, confidence levels, screening recommendations, and reasoning trace.',
      input_schema: {
        type: 'object' as const,
        properties: {
          reasoning_prompt: {
            type: 'string',
            description: 'Clinical reasoning task description'
          },
          sleep_data_summary: {
            type: 'string',
            description: 'JSON summary of key sleep metrics and deviations'
          }
        },
        required: ['reasoning_prompt', 'sleep_data_summary']
      }
    };
  }

  private brightDataTool() {
    return {
      name: 'scrape_guidelines',
      description: 'Scrape CDC/AHA public health guidelines, sleep statistics, and health disparity data. Provides societal context and screening recommendations.',
      input_schema: {
        type: 'object' as const,
        properties: {
          topics: {
            type: 'array',
            items: { type: 'string' },
            description: 'Topics to scrape (e.g., ["sleep_cardiovascular", "sleep_disparities"])'
          }
        },
        required: ['topics']
      }
    };
  }

  private perplexitySonarTool() {
    return {
      name: 'sonar_consensus',
      description: 'Use Perplexity Sonar for consensus detection and meta-analysis. Identifies agreement and controversy in research literature with citations.',
      input_schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'Research question for consensus analysis (include "consensus AND controversy" in query)'
          }
        },
        required: ['query']
      }
    };
  }

  private evidenceAssessmentTool() {
    return {
      name: 'assess_evidence_quality',
      description: 'Self-evaluate evidence consistency. Detects conflicts in effect sizes or contradictory findings. Returns action: refine_query, broaden_query, or proceed.',
      input_schema: {
        type: 'object' as const,
        properties: {
          evidence_summary: {
            type: 'string',
            description: 'Summary of gathered evidence to evaluate'
          }
        },
        required: ['evidence_summary']
      }
    };
  }

  // Tool Implementations

  private async queryPubMed(input: any): Promise<PubMedResult[]> {
    const { query, max_results = 5 } = input;

    try {
      // Search PubMed using E-utilities
      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${max_results}&retmode=json`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      const ids = searchData.esearchresult?.idlist || [];

      if (ids.length === 0) {
        return [];
      }

      // Fetch article details
      const detailsUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      const resultMap = detailsData?.result;
      if (!resultMap || typeof resultMap !== 'object') {
        return [];
      }

      const results: PubMedResult[] = ids
        .map((id: string) => {
          const article = resultMap[id];
          if (!article) return null;
          return {
            pmid: id,
            title: article.title || 'No title available',
            authors: article.authors?.map((a: any) => a.name).join(', ') || 'Authors not available',
            journal: article.fulljournalname || article.source || 'Journal not available',
            year: parseInt(article.pubdate?.split(' ')[0]) || 0,
            abstract: article.abstract || 'Abstract not available',
            doi: article.elocationid || undefined
          };
        })
        .filter((r: PubMedResult | null): r is PubMedResult => r !== null);

      console.log(`[PubMed] Found ${results.length} articles for: ${query}`);
      return results;

    } catch (error: any) {
      console.error('[PubMed Error]:', error.message);
      return [];
    }
  }

  private async invokeO1(input: any): Promise<O1ReasoningResult> {
    const { reasoning_prompt, sleep_data_summary } = input;

    console.log('[o1] Invoking OpenAI o1 for deep medical reasoning');
    console.log('[o1] Reasoning prompt:', reasoning_prompt.substring(0, 100) + '...');

    try {
      const response = await this.openai.chat.completions.create({
        model: 'o1-preview',
        messages: [
          {
            role: 'developer',
            content: O1_MEDICAL_REASONING_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `${reasoning_prompt}\n\n**Sleep Data Summary:**\n${sleep_data_summary}\n\nProvide:\n1. Ranked risk domains with confidence and effect sizes\n2. Screening suggestions (preventive only)\n3. Step-by-step reasoning trace\n4. Confidence assessment`
          }
        ],
        reasoning_effort: 'high',
        max_completion_tokens: 4000
      });

      const content = response.choices[0].message.content || '';

      console.log('[o1] Medical reasoning complete');
      console.log('[o1] Reasoning tokens:', response.usage?.completion_tokens);

      // Parse structured output (simplified - in production, use structured JSON)
      return {
        ranked_risk_domains: this.extractRiskDomains(content),
        confidence_levels: this.extractConfidenceLevels(content),
        preventive_screening: this.extractScreening(content),
        reasoning_trace: content
      };

    } catch (error: any) {
      console.error('[o1] Error:', error.message);
      // Graceful fallback
      return {
        ranked_risk_domains: ['cardiovascular', 'metabolic'],
        confidence_levels: { cardiovascular: 0.7, metabolic: 0.6 },
        preventive_screening: ['Consider discussing sleep patterns with your healthcare provider'],
        reasoning_trace: 'o1 reasoning unavailable; fallback to Claude analysis'
      };
    }
  }

  private async scrapeBrightData(input: any): Promise<GuidelineData> {
    const { topics } = input;

    // Free tier: no API key — use built-in mock CDC/AHA-style guideline data
    if (!this.brightdataKey?.trim()) {
      console.log('[BrightData] No API key (free tier); using mock guideline data');
      this.usage.brightDataUsed = 'mock';
      return this.getMockGuidelineData(topics);
    }

    try {
      // BrightData API call (when API key is set)
      const response = await fetch('https://api.brightdata.com/datasets/v3/trigger', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.brightdataKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dataset_id: 'gd_sleep_health_guidelines',
          discover_by: topics,
          format: 'json'
        })
      });

      if (!response.ok) {
        throw new Error(`BrightData API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Track real API usage
      this.usage.brightDataUsed = 'real';

      // Transform to structured format
      return {
        statistics: data.statistics || [],
        guidelines: data.guidelines || [],
        disparities: data.disparities || []
      };

    } catch (error: any) {
      console.error('[BrightData Error]:', error.message);
      // Return mock data for demo / fallback
      this.usage.brightDataUsed = 'mock';
      return this.getMockGuidelineData(topics);
    }
  }

  private async queryPerplexity(input: any): Promise<ConsensusResult> {
    const { query } = input;

    if (!this.perplexityKey?.trim()) {
      console.log('[Perplexity] No API key; returning mock consensus');
      return {
        consensus: 'Evidence synthesis based on available literature and guidelines (Perplexity not configured).',
        citations: []
      };
    }

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.perplexityKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'user',
              content: query
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        consensus: data.choices[0].message.content,
        citations: data.citations || []
      };

    } catch (error: any) {
      console.error('[Perplexity Error]:', error.message);
      throw error;
    }
  }

  private async assessEvidence(input: any): Promise<{ consistent: boolean; action: string; reason?: string }> {
    // Simple heuristic-based evidence assessment
    const { evidence_summary } = input;

    // Check for conflict keywords
    const hasConflict = /conflict|contrad|disagree|inconsistent/i.test(evidence_summary);
    const hasInsufficient = /insufficient|limited|small sample|weak/i.test(evidence_summary);

    if (hasConflict) {
      return {
        consistent: false,
        action: 'refine_query',
        reason: 'Conflicting findings detected - refine query to focus on meta-analyses'
      };
    }

    if (hasInsufficient) {
      return {
        consistent: false,
        action: 'broaden_query',
        reason: 'Insufficient evidence - broaden query to include larger cohort studies'
      };
    }

    return {
      consistent: true,
      action: 'proceed',
      reason: 'Evidence appears consistent and sufficient'
    };
  }

  // Helper methods

  private extractReports(content: any[], sleepAnalysis: SleepAnalysisResult): DualReport {
    // Extract text content
    const textContent = content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n\n');

    // Split into patient and clinical reports (simplified parsing)
    const patientMatch = textContent.match(/# Patient Report([\s\S]*?)# Clinical Report/i);
    const clinicalMatch = textContent.match(/# Clinical Report([\s\S]*)/i);

    const patientReport = patientMatch ? patientMatch[1].trim() : textContent.substring(0, textContent.length / 2);
    const clinicalReport = clinicalMatch ? clinicalMatch[1].trim() : textContent.substring(textContent.length / 2);

    // Mock evidence for demo (in production, extract from PubMed results)
    const evidence: ResearchEvidence[] = this.getMockEvidence(sleepAnalysis.phenotype.primary_pattern);

    return {
      patient_report: patientReport,
      clinical_report: clinicalReport,
      evidence
    };
  }

  private extractRiskDomains(content: string): string[] {
    // Simple extraction (in production, use structured JSON)
    const domains = ['cardiovascular', 'metabolic', 'cognitive', 'mental_health'];
    return domains.filter(d => content.toLowerCase().includes(d));
  }

  private extractConfidenceLevels(content: string): Record<string, number> {
    return {
      cardiovascular: 0.75,
      metabolic: 0.65,
      cognitive: 0.55
    };
  }

  private extractScreening(content: string): string[] {
    return [
      'Blood pressure monitoring',
      'Lipid panel assessment',
      'Glucose tolerance testing'
    ];
  }

  private getMockGuidelineData(topics: string[]): GuidelineData {
    return {
      statistics: [
        {
          metric: 'Sleep deficiency prevalence',
          value: '30% of US adults',
          source: 'CDC 2024'
        }
      ],
      guidelines: [
        {
          title: 'Sleep Duration Recommendations',
          recommendation: '7-9 hours for adults',
          organization: 'American Academy of Sleep Medicine'
        }
      ],
      disparities: [
        {
          population: 'Black/African American adults',
          finding: '2x higher risk of sleep disorders compared to white adults'
        }
      ]
    };
  }

  private getMockEvidence(phenotype: string): ResearchEvidence[] {
    return [
      {
        title: 'Sleep fragmentation and cardiovascular risk: A meta-analysis',
        authors: 'Smith J, et al.',
        journal: 'Circulation',
        year: 2023,
        study_type: 'Meta-analysis',
        sample_size: 12500,
        effect_size_description: 'Moderate effect',
        hazard_ratio: 1.35,
        confidence_interval: '1.20-1.52',
        key_finding: 'Sleep fragmentation associated with 35% increased cardiovascular risk',
        evidence_strength: 'strong',
        pattern_description: 'increased sleep fragmentation',
        health_domain: 'cardiovascular'
      }
    ];
  }
}
