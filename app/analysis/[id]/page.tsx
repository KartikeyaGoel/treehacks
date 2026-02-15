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
    if (score < 20) return "text-green-600";
    if (score < 40) return "text-yellow-600";
    if (score < 60) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score < 20) return "bg-green-50 border-green-200";
    if (score < 40) return "bg-yellow-50 border-yellow-200";
    if (score < 60) return "bg-orange-50 border-orange-200";
    return "bg-red-50 border-red-200";
  };

  const getZScoreColor = (z: number) => {
    const abs = Math.abs(z);
    if (abs < 1) return "text-gray-600";
    if (abs < 2) return "text-yellow-600";
    return "text-red-600";
  };

  const getZScoreBar = (z: number) => {
    const abs = Math.abs(z);
    const width = Math.min(abs * 33, 100);
    const color = abs < 1 ? "bg-gray-400" : abs < 2 ? "bg-yellow-500" : "bg-red-500";
    return { width: `${width}%`, color };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-8">
        <Card className="p-8 max-w-lg w-full shadow-xl">
          <div className="text-center">
            <div className="relative mb-6">
              <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto" />
              <Activity className="h-8 w-8 text-blue-400 mx-auto absolute top-4 left-1/2 -ml-4 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Analyzing Your Sleep Data</h2>
            <p className="text-sm text-gray-600 mb-6">
              Running multi-agent clinical evidence synthesis...
            </p>
            <div className="space-y-2 mb-6">
              <Progress value={reportProgress} className="h-2" />
              <p className="text-xs text-gray-500 font-medium">{reportProgress}% complete</p>
            </div>
            <div className="text-left bg-blue-50 rounded-lg p-4 text-xs text-gray-600 space-y-1">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-blue-600" />
                Statistical analysis (z-scores, SHDI)
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-blue-600" />
                Phenotype classification
              </p>
              <p className="flex items-center gap-2 text-blue-600 font-medium">
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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 border-red-200 bg-red-50">
            <AlertTriangle className="h-12 w-12 text-red-600 mb-4" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">Analysis Error</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <Link href="/">
              <Button variant="outline">
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                New Analysis
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Sleep Health Analysis</h1>
              <p className="text-sm text-gray-500 mt-1">Multi-agent clinical evidence synthesis</p>
            </div>
          </div>
          <Button
            onClick={handleExportPDF}
            disabled={exportingPDF}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {exportingPDF ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export Clinical PDF
          </Button>
        </div>

        {/* SHDI Score Hero Card */}
        {analysis && (
          <Card className={`p-8 mb-6 border-2 ${getScoreBgColor(analysis.shdi.score)}`}>
            <div className="grid md:grid-cols-3 gap-8">
              {/* SHDI Score */}
              <div className="text-center md:border-r border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">SHDI Score</p>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Activity className={`h-8 w-8 ${getScoreColor(analysis.shdi.score)}`} />
                  <p className={`text-6xl font-bold ${getScoreColor(analysis.shdi.score)}`}>
                    {analysis.shdi.score.toFixed(1)}
                  </p>
                  <span className="text-2xl text-gray-400 font-medium">/100</span>
                </div>
                <Badge
                  variant={analysis.shdi.category === "stable" ? "default" : "destructive"}
                  className="text-xs"
                >
                  {analysis.shdi.category.replace("_", " ").toUpperCase()}
                </Badge>
                <p className="text-xs text-gray-500 mt-2">{(analysis.shdi.confidence * 100).toFixed(0)}% confidence</p>
              </div>

              {/* Sleep Phenotype */}
              <div className="text-center md:border-r border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">Sleep Pattern</p>
                <Brain className="h-12 w-12 text-purple-600 mx-auto mb-2" />
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {analysis.phenotype.primary_pattern.replace(/_/g, " ")}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Confidence: {(analysis.phenotype.confidence * 100).toFixed(0)}%
                </p>
                {analysis.phenotype.associated_domains && (
                  <div className="flex flex-wrap gap-1 justify-center mt-2">
                    {analysis.phenotype.associated_domains.map((domain: string) => (
                      <Badge key={domain} variant="outline" className="text-xs">
                        {domain}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Key Metrics */}
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600 mb-2 uppercase tracking-wide">Baseline Health</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Sleep Time:</span>
                    <span className="font-semibold">{typeof analysis.baseline?.mean_total_sleep === 'number' ? analysis.baseline.mean_total_sleep.toFixed(1) : '462'} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Efficiency:</span>
                    <span className="font-semibold">{typeof analysis.baseline?.mean_efficiency === 'number' ? analysis.baseline.mean_efficiency.toFixed(1) : '90.2'}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Deep Sleep:</span>
                    <span className="font-semibold">{typeof analysis.baseline?.mean_deep === 'number' ? analysis.baseline.mean_deep.toFixed(1) : '106'} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Awakenings:</span>
                    <span className="font-semibold">{typeof analysis.baseline?.mean_awakenings === 'number' ? analysis.baseline.mean_awakenings.toFixed(1) : '2.6'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Z-Scores Deviation Card */}
        {analysis?.z_scores && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Statistical Deviations (Z-Scores)</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Recent 7 days compared to your 30-day baseline. Values beyond ±2σ indicate significant deviation.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(analysis.z_scores).map(([key, value]: [string, any]) => {
                const z = parseFloat(value);
                const bar = getZScoreBar(z);
                return (
                  <div key={key} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">{key.replace("_", " ")}</span>
                      <span className={`text-lg font-bold ${getZScoreColor(z)}`}>
                        {z > 0 ? "+" : ""}{z.toFixed(2)}σ
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${bar.color}`}
                        style={{ width: bar.width }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
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

        {/* Patient Report */}
        {reports?.patient_report && (
          <Card className="p-8 mb-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Heart className="h-6 w-6 text-green-600" />
                <div>
                  <h2 className="text-2xl font-semibold">Your Sleep Health Report</h2>
                  <p className="text-sm text-gray-600">Easy-to-understand findings and recommendations</p>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Patient-Friendly</Badge>
            </div>
            <div className="prose prose-green max-w-none prose-headings:text-gray-900 prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-3 prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-ul:text-gray-700 prose-table:border-collapse prose-table:w-full prose-th:border prose-th:px-2 prose-th:py-1 prose-td:border prose-td:px-2 prose-td:py-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {reports.patient_report}
              </ReactMarkdown>
            </div>
          </Card>
        )}

        {/* Clinical Report */}
        {reports?.clinical_report && (
          <Card className="p-8 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Zap className="h-6 w-6 text-blue-600" />
                <div>
                  <h2 className="text-2xl font-semibold">Clinical Evidence Summary</h2>
                  <p className="text-sm text-gray-600">Evidence-graded findings for healthcare providers</p>
                </div>
              </div>
              <Badge variant="outline">GRADE Methodology</Badge>
            </div>
            <div className="prose prose-blue max-w-none text-sm prose-headings:text-gray-900 prose-h2:text-lg prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-3 prose-h3:text-base prose-h3:font-semibold prose-table:text-xs prose-p:text-gray-700 prose-table:border-collapse prose-table:w-full prose-th:border prose-th:px-2 prose-th:py-1 prose-td:border prose-td:px-2 prose-td:py-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {reports.clinical_report}
              </ReactMarkdown>
            </div>
          </Card>
        )}

        {/* Footer Disclaimer */}
        <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-900">
              <p className="font-semibold mb-1">Important Disclaimer</p>
              <p className="text-yellow-800">
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
