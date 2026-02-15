"use client";

import { useState } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Analysis failed");
      }

      const { analysisId } = await response.json();
      router.push(`/analysis/${analysisId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-blue-50/30 to-emerald-50/20">
      {/* Glass navigation bar */}
      <nav className="sticky top-0 z-50 glass-nav bg-white/70 border-b border-gray-200/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-playfair font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            SOMNI AI
          </h1>
        </div>
      </nav>

      {/* Hero section */}
      <div className="max-w-5xl mx-auto px-6 py-20 animate-fadeIn">
        <div className="text-center mb-12">
          <h1 className="heading-hero text-gray-900 mb-6">
            Sleep Health Intelligence
            <span className="block text-5xl bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent mt-2">
              Powered by Multi-Agent AI
            </span>
          </h1>

          <p className="text-xl font-inter text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Transform your wearable sleep data into evidence-based health intelligence
            through autonomous scientific analysis
          </p>
        </div>

        {/* Disclaimer alert with glass effect */}
        <div className="mb-8 p-4 rounded-xl glass-card bg-amber-50/80 border border-amber-200/40 max-w-3xl mx-auto">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 font-inter">Not a Diagnostic Tool</p>
              <p className="text-sm mt-1 text-amber-800 font-inter">
                Findings represent research associations from peer-reviewed literature, not medical diagnoses.
                Always consult healthcare providers for medical decisions.
              </p>
            </div>
          </div>
        </div>

        {/* Upload card with glass effect and glow border */}
        <Card className="relative overflow-hidden border-0 shadow-2xl glass-card bg-gradient-to-br from-white/80 to-white/40 p-8 max-w-3xl mx-auto">
          {/* Glowing border gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-emerald-500/10 rounded-lg" />

          <div className="relative">
            <h2 className="heading-card text-gray-900 mb-6">
              Upload Your Sleep Data
            </h2>

            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-purple-400 hover:bg-purple-50/30 cursor-pointer transition-all duration-300 card-hover"
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                <Upload className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-lg mb-2 font-inter text-gray-700">Drop your sleep export file</p>
              <p className="text-sm text-gray-500 mb-4 font-inter">
                Apple Health (.xml), Fitbit (.csv), or Oura (.csv)
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Badge variant="secondary" className="bg-purple-100 text-purple-700 font-inter text-xs">
                  Apple Health
                </Badge>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 font-inter text-xs">
                  Fitbit
                </Badge>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 font-inter text-xs">
                  Oura Ring
                </Badge>
              </div>
              <input
                type="file"
                accept=".xml,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
            </div>

            {file && (
              <div className="mt-6 p-5 rounded-lg glass-card bg-gradient-to-r from-purple-50/80 to-blue-50/80 border border-purple-200/30 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-medium font-inter text-gray-900">{file.name}</span>
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-inter"
                  >
                    {uploading ? (
                      <>
                        <span className="animate-pulse">Analyzing...</span>
                      </>
                    ) : (
                      "Analyze"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <Alert className="mt-4 bg-red-50 border-red-200 animate-fadeIn">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="ml-3 text-sm text-red-800 font-inter">{error}</p>
              </Alert>
            )}
          </div>
        </Card>

        {/* Features showcase with glass cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
          <div className="p-6 rounded-xl glass-card bg-white/60 border border-white/40 shadow-lg card-hover">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="font-playfair font-bold text-lg text-gray-900 mb-2">
              Multi-Agent Analysis
            </h3>
            <p className="text-sm font-inter text-gray-600">
              Claude, OpenAI o1, PubMed, BrightData, and Perplexity work together to analyze your sleep patterns
            </p>
          </div>

          <div className="p-6 rounded-xl glass-card bg-white/60 border border-white/40 shadow-lg card-hover">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-playfair font-bold text-lg text-gray-900 mb-2">
              Evidence-Based Insights
            </h3>
            <p className="text-sm font-inter text-gray-600">
              Research associations from peer-reviewed literature, not generic advice
            </p>
          </div>

          <div className="p-6 rounded-xl glass-card bg-white/60 border border-white/40 shadow-lg card-hover">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-4">
              <span className="text-2xl">📝</span>
            </div>
            <h3 className="font-playfair font-bold text-lg text-gray-900 mb-2">
              Dual Reports
            </h3>
            <p className="text-sm font-inter text-gray-600">
              Patient-friendly summary + clinical report with GRADE evidence ratings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
