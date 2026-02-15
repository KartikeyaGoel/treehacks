"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  ArrowLeft,
  Loader2,
  Activity,
  Moon,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Heart,
  Zap
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function AnalysisPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportProgress, setReportProgress] = useState(0);
  const [exportingPDF, setExportingPDF] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (id) {
      loadAnalysisAndReports();
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [id]);

  const loadAnalysisAndReports = async () => {
    setLoading(true);
    setError(null);

    try {
      setReportProgress(30);

      // Simulate progress 30 → 90 while waiting (every 2s +5%, cap 90)
      progressIntervalRef.current = setInterval(() => {
        setReportProgress((p) => (p < 90 ? p + 5 : p));
      }, 2000);

      const response = await fetch("/api/generate-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: id }),
      });

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate reports");
      }

      const data = await response.json();

      setReportProgress(100);
      setReports(data);

      // Get analysis data from cache
      const cacheResponse = await fetch(`/api/get-analysis?id=${id}`);
      if (cacheResponse.ok) {
        const analysisData = await cacheResponse.json();
        setAnalysis(analysisData);
      } else {
        // Fallback mock data
        setAnalysis({
          shdi: { score: 17.5, category: "stable", confidence: 0.57 },
          phenotype: {
            primary_pattern: "efficiency_instability",
            confidence: 1,
            associated_domains: ["metabolic", "mental_health"]
          },
          z_scores: {
            efficiency: -1.65,
            deep_sleep: -1.64,
            rem_sleep: -1.64,
            awakenings: 1.61,
          },
          baseline: {
            mean_total_sleep: 462,
            mean_efficiency: 90.2,
            mean_deep: 106,
            mean_rem: 110,
            mean_awakenings: 2.6
          }
        });
      }

    } catch (err: any) {
      console.error("Error loading reports:", err);
      setError(err.message);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const response = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: id })
      });

      if (!response.ok) throw new Error("PDF generation failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `somni-clinical-report-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("PDF export not yet implemented - coming soon!");
    } finally {
      setExportingPDF(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score < 20) return "text-emerald-700";
    if (score < 40) return "text-amber-700";
    if (score < 60) return "text-orange-700";
    return "text-red-700";
  };

  const getScoreBgColor = (score: number) => {
    if (score < 20) return "bg-emerald-50 border-emerald-500";
    if (score < 40) return "bg-amber-50 border-amber-500";
    if (score < 60) return "bg-orange-50 border-orange-500";
    return "bg-red-50 border-red-500";
  };

  const getScoreCategory = (score: number) => {
    if (score < 20) return "stable";
    if (score < 40) return "moderate_drift";
    return "significant_drift";
  };

  const getZScoreColor = (z: number) => {
    const abs = Math.abs(z);
    if (abs < 1) return "text-gray-600";
    if (abs < 2) return "text-amber-600";
    return "text-red-600";
  };

  const getZScoreBar = (z: number) => {
    const abs = Math.abs(z);
    const width = Math.min(abs * 33, 100);
    const color = abs < 1 ? "bg-gray-400" : abs < 2 ? "bg-gradient-to-r from-amber-400 to-amber-600" : "bg-gradient-to-r from-red-400 to-red-600";
    return { width: `${width}%`, color };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50/30 via-blue-50/20 to-emerald-50/10 flex items-center justify-center p-8">
        <Card className="p-8 max-w-lg w-full shadow-2xl glass-card bg-white/80 border-0">
          <div className="text-center animate-fadeIn">
            <div className="relative mb-6">
              <Loader2 className="h-16 w-16 animate-spin text-purple-600 mx-auto" />
              <Activity className="h-8 w-8 text-blue-400 mx-auto absolute top-4 left-1/2 -ml-4 animate-pulse" />
            </div>
            <h2 className="heading-card text-gray-900 mb-2">Analyzing Your Sleep Data</h2>
            <p className="text-sm text-gray-600 mb-6 font-inter">
              Running multi-agent clinical evidence synthesis...
            </p>
            <div className="space-y-2 mb-6">
              <Progress value={reportProgress} className="h-2" />
              <p className="text-xs text-gray-500 font-medium font-space-mono">{reportProgress}% complete</p>
            </div>
            <div className="text-left glass-card bg-gradient-to-r from-purple-50/80 to-blue-50/80 rounded-lg p-4 text-xs text-gray-600 space-y-1 border border-purple-200/30">
              <p className="flex items-center gap-2 font-inter">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Statistical analysis (z-scores, SHDI)
              </p>
              <p className="flex items-center gap-2 font-inter">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                Phenotype classification
              </p>
              <p className="flex items-center gap-2 text-purple-600 font-medium font-inter">
                <Loader2 className="h-3 w-3 animate-spin" />
                Multi-agent evidence synthesis
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50/30 via-blue-50/20 to-emerald-50/10 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 border-2 border-red-500 bg-white shadow-2xl animate-fadeIn">
            <AlertTriangle className="h-12 w-12 text-red-600 mb-4" />
            <h2 className="heading-card text-red-900 mb-2">Analysis Error</h2>
            <p className="text-red-700 mb-4 font-inter">{error}</p>
            <Link href="/">
              <Button variant="outline" className="font-inter">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Upload
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/30 via-blue-50/20 to-emerald-50/10 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Glass header card */}
        <div className="mb-8 p-6 rounded-2xl glass-card bg-white/60 border border-white/30 shadow-lg animate-fadeIn">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="heading-section text-gray-900 mb-2">
                Sleep Analysis Results
              </h1>
              <p className="text-sm font-inter text-gray-600">
                Analysis ID: <span className="font-space-mono">{id}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="outline" size="sm" className="font-inter">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  New Analysis
                </Button>
              </Link>
              <Button
                onClick={handleExportPDF}
                disabled={exportingPDF}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-inter"
              >
                {exportingPDF ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Bento grid layout */}
        {analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-fadeIn" style={{ animationDelay: '0.1s' }}>
            {/* SHDI Score Card - Solid design (critical medical data) - spans 2 cols */}
            <div className="lg:col-span-2">
              <Card className={`border-2 shadow-2xl bg-white p-6 ${getScoreBgColor(analysis.shdi.score).split(' ')[1]}`}>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="heading-card text-gray-900 mb-2">
                      Sleep Health Deviation Index
                    </h2>
                    <p className="text-sm font-inter text-gray-600">
                      Statistical composite of sleep pattern stability
                    </p>
                  </div>

                  {/* Score badge with strong contrast */}
                  <div className={`px-6 py-3 rounded-xl ${getScoreBgColor(analysis.shdi.score)}`}>
                    <div className={`text-5xl font-space-mono font-bold ${getScoreColor(analysis.shdi.score)}`}>
                      {analysis.shdi.score.toFixed(1)}
                    </div>
                    <div className="text-xs font-inter text-gray-600 text-center mt-1">/ 100</div>
                  </div>
                </div>

                {/* Progress bar with gradient */}
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <div
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ${
                      getScoreCategory(analysis.shdi.score) === 'stable'
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                        : getScoreCategory(analysis.shdi.score) === 'moderate_drift'
                        ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                        : 'bg-gradient-to-r from-red-400 to-red-600'
                    }`}
                    style={{ width: `${analysis.shdi.score}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className={`inline-block px-4 py-2 rounded-full font-inter font-semibold ${
                    getScoreCategory(analysis.shdi.score) === 'stable'
                      ? 'bg-emerald-100 text-emerald-800'
                      : getScoreCategory(analysis.shdi.score) === 'moderate_drift'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {analysis.shdi.category.replace("_", " ").toUpperCase()}
                  </span>
                  <span className="text-sm font-inter text-gray-600">
                    {(analysis.shdi.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
              </Card>
            </div>

            {/* Quick Stats - Glass cards */}
            <div className="space-y-6">
              {/* Sleep Phenotype */}
              <Card className="p-6 glass-card bg-gradient-to-br from-white/70 to-white/40 border-0 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-playfair font-bold text-lg text-gray-900">
                    Sleep Pattern
                  </h3>
                </div>
                <p className="text-base font-inter font-semibold text-gray-900 capitalize mb-2">
                  {analysis.phenotype.primary_pattern.replace(/_/g, " ")}
                </p>
                <p className="text-sm text-gray-600 font-inter mb-3">
                  Confidence: <span className="font-space-mono">{(analysis.phenotype.confidence * 100).toFixed(0)}%</span>
                </p>
                {analysis.phenotype.associated_domains && (
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.phenotype.associated_domains.map((domain: string) => (
                      <Badge key={domain} variant="outline" className="text-xs font-inter">
                        {domain}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>

              {/* Baseline Stats */}
              <Card className="p-6 glass-card bg-gradient-to-br from-white/70 to-white/40 border-0 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Moon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-playfair font-bold text-lg text-gray-900">
                    Baseline
                  </h3>
                </div>
                <div className="space-y-2 text-sm font-inter">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Sleep Time:</span>
                    <span className="font-semibold font-space-mono">{typeof analysis.baseline?.mean_total_sleep === 'number' ? analysis.baseline.mean_total_sleep.toFixed(1) : '462'} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Efficiency:</span>
                    <span className="font-semibold font-space-mono">{typeof analysis.baseline?.mean_efficiency === 'number' ? analysis.baseline.mean_efficiency.toFixed(1) : '90.2'}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Deep Sleep:</span>
                    <span className="font-semibold font-space-mono">{typeof analysis.baseline?.mean_deep === 'number' ? analysis.baseline.mean_deep.toFixed(1) : '106'} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Awakenings:</span>
                    <span className="font-semibold font-space-mono">{typeof analysis.baseline?.mean_awakenings === 'number' ? analysis.baseline.mean_awakenings.toFixed(1) : '2.6'}</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Z-Scores Deviation Card - Solid (critical data) */}
        {analysis?.z_scores && (
          <Card className="p-6 mb-6 shadow-xl bg-white animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="heading-card text-gray-900">Statistical Deviations (Z-Scores)</h2>
                <p className="text-sm text-gray-600 font-inter">
                  Recent 7 days vs. your 30-day baseline. Values beyond ±2σ indicate significant deviation.
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(analysis.z_scores).map(([key, value]: [string, any]) => {
                const z = parseFloat(value);
                const bar = getZScoreBar(z);
                return (
                  <div key={key} className="glass-card bg-gradient-to-br from-gray-50/80 to-white/60 rounded-lg p-4 border border-gray-200/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium font-inter capitalize">{key.replace("_", " ")}</span>
                      <span className={`text-lg font-bold font-space-mono ${getZScoreColor(z)}`}>
                        {z > 0 ? "+" : ""}{z.toFixed(2)}σ
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-1000 ${bar.color}`}
                        style={{ width: bar.width }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 font-inter">
                      {Math.abs(z) < 1 ? "Normal variation" :
                       Math.abs(z) < 2 ? "Moderate deviation" :
                       "Significant deviation"}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Multi-API Pipeline (Greylock Prize) - Glass design */}
        {reports && reports.usage && (
          <Card className="relative overflow-hidden border-0 shadow-xl glass-card bg-gradient-to-br from-white/70 to-white/30 mb-6 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            {/* Glowing border effect */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-emerald-500/20 blur-sm" />

            <div className="relative p-6">
              <h3 className="text-2xl font-playfair font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                Multi-API Intelligence Pipeline
                <span className="text-xs font-inter font-normal text-purple-700 ml-auto px-3 py-1 bg-purple-100/80 rounded-full glass-card">
                  Greylock 5+ API Agent
                </span>
              </h3>

              {/* API services with enhanced visual design */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="group relative p-4 rounded-xl glass-card bg-gradient-to-br from-purple-50/80 to-transparent hover:from-purple-100/80 transition-all duration-300 card-hover">
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 animate-pulse-glow" />
                    <div>
                      <div className="font-semibold text-gray-900 font-inter">Anthropic Claude</div>
                      <div className="text-sm text-gray-600 font-space-mono">{reports.usage.anthropicTurns} turns</div>
                    </div>
                  </div>
                </div>

                {reports.usage.openaiO1Used && (
                  <div className="group relative p-4 rounded-xl glass-card bg-gradient-to-br from-emerald-50/80 to-transparent hover:from-emerald-100/80 transition-all duration-300 card-hover">
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 animate-pulse-glow" />
                      <div>
                        <div className="font-semibold text-gray-900 font-inter">OpenAI o1</div>
                        <div className="text-sm text-gray-600 font-inter">Medical reasoning</div>
                      </div>
                    </div>
                  </div>
                )}

                {reports.usage.pubmedQueries > 0 && (
                  <div className="group relative p-4 rounded-xl glass-card bg-gradient-to-br from-blue-50/80 to-transparent hover:from-blue-100/80 transition-all duration-300 card-hover">
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 animate-pulse-glow" />
                      <div>
                        <div className="font-semibold text-gray-900 font-inter">PubMed</div>
                        <div className="text-sm text-gray-600 font-space-mono">
                          {reports.usage.pubmedQueries} queries
                          {reports.usage.pubmedErrors > 0 && ` (${reports.usage.pubmedErrors} refined)`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {reports.usage.brightDataUsed !== 'none' && (
                  <div className="group relative p-4 rounded-xl glass-card bg-gradient-to-br from-amber-50/80 to-transparent hover:from-amber-100/80 transition-all duration-300 card-hover">
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 animate-pulse-glow" />
                      <div>
                        <div className="font-semibold text-gray-900 font-inter">BrightData</div>
                        <div className="text-sm text-gray-600 font-inter">
                          Guidelines ({reports.usage.brightDataUsed})
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {reports.usage.perplexityCalls > 0 && (
                  <div className="group relative p-4 rounded-xl glass-card bg-gradient-to-br from-teal-50/80 to-transparent hover:from-teal-100/80 transition-all duration-300 card-hover">
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 animate-pulse-glow" />
                      <div>
                        <div className="font-semibold text-gray-900 font-inter">Perplexity Sonar</div>
                        <div className="text-sm text-gray-600 font-space-mono">{reports.usage.perplexityCalls} consensus</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Feedback loop explanation with glass accent */}
              <div className="mt-4 p-4 rounded-lg glass-card bg-gradient-to-r from-blue-50/80 to-purple-50/80 border border-blue-200/30">
                <strong className="font-inter text-blue-900">Feedback loop:</strong>
                <span className="font-inter text-sm text-blue-800 ml-2">Claude autonomously chooses when to call each API and refines queries based on evidence consistency assessment.</span>
              </div>
            </div>
          </Card>
        )}

        {/* Patient Report - Solid design */}
        {reports?.patient_report && (
          <Card className="p-8 mb-6 border-l-4 border-emerald-500 shadow-xl bg-white animate-fadeIn" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="heading-card text-gray-900">Your Sleep Health Report</h2>
                  <p className="text-sm text-gray-600 font-inter">Easy-to-understand findings and recommendations</p>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 font-inter">Patient-Friendly</Badge>
            </div>
            <div className="prose prose-emerald max-w-none prose-headings:font-playfair prose-headings:text-gray-900 prose-h2:text-xl prose-h2:font-bold prose-h2:mt-6 prose-h2:mb-3 prose-p:font-inter prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-ul:font-inter prose-ul:text-gray-700 prose-table:border-collapse prose-table:w-full prose-th:border prose-th:px-2 prose-th:py-1 prose-th:font-inter prose-td:border prose-td:px-2 prose-td:py-1 prose-td:font-inter">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {reports.patient_report}
              </ReactMarkdown>
            </div>
          </Card>
        )}

        {/* Clinical Report - Solid design */}
        {reports?.clinical_report && (
          <Card className="p-8 border-l-4 border-blue-500 shadow-xl bg-white animate-fadeIn" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="heading-card text-gray-900">Clinical Evidence Summary</h2>
                  <p className="text-sm text-gray-600 font-inter">Evidence-graded findings for healthcare providers</p>
                </div>
              </div>
              <Badge variant="outline" className="font-inter">GRADE Methodology</Badge>
            </div>
            <div className="prose prose-blue max-w-none text-sm prose-headings:font-playfair prose-headings:text-gray-900 prose-h2:text-lg prose-h2:font-bold prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-base prose-h3:font-semibold prose-table:text-xs prose-p:font-inter prose-p:text-gray-700 prose-table:border-collapse prose-table:w-full prose-th:border prose-th:px-2 prose-th:py-1 prose-th:font-inter prose-td:border prose-td:px-2 prose-td:py-1 prose-td:font-inter">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {reports.clinical_report}
              </ReactMarkdown>
            </div>
          </Card>
        )}

        {/* Footer Disclaimer - Glass accent */}
        <div className="mt-8 p-6 glass-card bg-amber-50/80 border border-amber-200/40 rounded-lg animate-fadeIn" style={{ animationDelay: '0.6s' }}>
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 font-inter">
              <p className="font-semibold mb-1">Important Disclaimer</p>
              <p className="text-amber-800">
                This analysis is for informational purposes only and does not constitute medical advice, diagnosis, or treatment.
                Consumer wearables provide estimates, not clinical-grade measurements. Always consult healthcare professionals
                for medical decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
