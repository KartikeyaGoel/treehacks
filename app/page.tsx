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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto p-8">
        <header className="text-center mb-12 pt-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💤</span>
            </div>
            <h1 className="text-5xl font-bold text-blue-900">
              SOMNI AI
            </h1>
          </div>
          <p className="text-xl text-gray-600 mb-2">
            Sleep Health Intelligence System
          </p>
          <p className="text-sm text-gray-500">
            Multi-agent clinical evidence synthesis
          </p>
        </header>

        <Alert className="mb-8">
          <AlertCircle className="h-5 w-5" />
          <div className="ml-3">
            <p className="font-semibold">Not a Diagnostic Tool</p>
            <p className="text-sm mt-1">
              Findings represent research associations, not medical diagnoses.
            </p>
          </div>
        </Alert>

        <Card className="p-8">
          <h2 className="text-2xl font-semibold mb-6">
            Upload Your Sleep Data
          </h2>

          <div
            className="border-2 border-dashed rounded-xl p-12 text-center hover:border-blue-500 cursor-pointer"
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <Upload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-lg mb-2">Drop your sleep export file</p>
            <p className="text-sm text-gray-500 mb-4">
              Apple Health, Fitbit, or Oura
            </p>
            <input
              type="file"
              accept=".xml,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
          </div>

          {file && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-blue-600" />
                  <span className="font-medium">{file.name}</span>
                </div>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? "Analyzing..." : "Analyze"}
                </Button>
              </div>
            </div>
          )}

          {error && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <p className="ml-3 text-sm">{error}</p>
            </Alert>
          )}
        </Card>
      </div>
    </div>
  );
}
