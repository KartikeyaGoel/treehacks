import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { SleepAnalysisResult, ResearchEvidence } from '../agents/types';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 3,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    borderBottom: 1,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 5,
  },
  table: {
    marginTop: 10,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#f1f5f9',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 5,
  },
  tableCellNarrow: {
    flex: 0.7,
    paddingHorizontal: 5,
  },
  tableCellWide: {
    flex: 1.5,
    paddingHorizontal: 5,
  },
  evidenceCard: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderLeft: 3,
    borderLeftColor: '#3b82f6',
  },
  evidenceTitle: {
    fontWeight: 'bold',
    marginBottom: 3,
    fontSize: 11,
  },
  evidenceDetail: {
    fontSize: 9,
    marginBottom: 2,
    color: '#475569',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTop: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  disclaimer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderLeft: 4,
    borderLeftColor: '#f59e0b',
  },
  disclaimerText: {
    fontSize: 9,
    color: '#92400e',
  },
  text: {
    marginBottom: 5,
  },
  domainList: {
    marginLeft: 10,
    marginTop: 5,
  },
});

interface ClinicalReportPDFProps {
  analysis: SleepAnalysisResult;
  evidence: ResearchEvidence[];
  generatedDate: string;
  analysisId?: string;
}

function interpretZScore(z: number): string {
  const abs = Math.abs(z);
  if (abs < 1) return 'Within normal variation';
  if (abs < 2) return 'Moderate deviation';
  return 'Significant deviation';
}

export const ClinicalReportPDF: React.FC<ClinicalReportPDFProps> = ({
  analysis,
  evidence,
  generatedDate,
  analysisId,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>SOMNI AI Clinical Report</Text>
        <Text style={styles.subtitle}>Sleep Health Analysis - Evidence-Based Assessment</Text>
        <Text style={styles.subtitle}>Generated: {generatedDate}</Text>
        {analysisId && <Text style={styles.subtitle}>Analysis ID: {analysisId}</Text>}
      </View>

      {/* Patient Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analysis Overview</Text>
        <Text style={styles.text}>Analysis Period: {analysis.start_date} to {analysis.end_date}</Text>
        <Text style={styles.text}>Total Days Analyzed: {analysis.days_analyzed}</Text>
        <Text style={styles.text}>Data Source: Consumer wearable device (algorithm-estimated sleep stages)</Text>
      </View>

      {/* Baseline Statistics Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Baseline Statistics (30-day)</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCell}>Metric</Text>
            <Text style={styles.tableCell}>Mean ± SD</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Total Sleep Time</Text>
            <Text style={styles.tableCell}>
              {analysis.baseline.mean_total_sleep.toFixed(0)} ± {analysis.baseline.std_total_sleep.toFixed(0)} min
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Sleep Efficiency</Text>
            <Text style={styles.tableCell}>
              {analysis.baseline.mean_efficiency.toFixed(1)}% ± {analysis.baseline.std_efficiency.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Deep Sleep</Text>
            <Text style={styles.tableCell}>
              {analysis.baseline.mean_deep.toFixed(0)} ± {analysis.baseline.std_deep.toFixed(0)} min
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>REM Sleep</Text>
            <Text style={styles.tableCell}>
              {analysis.baseline.mean_rem.toFixed(0)} ± {analysis.baseline.std_rem.toFixed(0)} min
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCell}>Awakenings</Text>
            <Text style={styles.tableCell}>
              {analysis.baseline.mean_awakenings.toFixed(1)} ± {analysis.baseline.std_awakenings.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* Deviation Analysis */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deviation Analysis (Z-Scores)</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.tableCellNarrow}>Metric</Text>
            <Text style={styles.tableCellNarrow}>Z-Score</Text>
            <Text style={styles.tableCellWide}>Interpretation</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellNarrow}>Sleep Efficiency</Text>
            <Text style={styles.tableCellNarrow}>{analysis.z_scores.efficiency.toFixed(2)}</Text>
            <Text style={styles.tableCellWide}>{interpretZScore(analysis.z_scores.efficiency)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellNarrow}>Deep Sleep</Text>
            <Text style={styles.tableCellNarrow}>{analysis.z_scores.deep_sleep.toFixed(2)}</Text>
            <Text style={styles.tableCellWide}>{interpretZScore(analysis.z_scores.deep_sleep)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellNarrow}>REM Sleep</Text>
            <Text style={styles.tableCellNarrow}>{analysis.z_scores.rem_sleep.toFixed(2)}</Text>
            <Text style={styles.tableCellWide}>{interpretZScore(analysis.z_scores.rem_sleep)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellNarrow}>Awakenings</Text>
            <Text style={styles.tableCellNarrow}>{analysis.z_scores.awakenings.toFixed(2)}</Text>
            <Text style={styles.tableCellWide}>{interpretZScore(analysis.z_scores.awakenings)}</Text>
          </View>
        </View>
      </View>

      {/* SHDI Score */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sleep Health Deviation Index (SHDI)</Text>
        <Text style={styles.text}>Score: {analysis.shdi.score.toFixed(1)}/100</Text>
        <Text style={styles.text}>Category: {analysis.shdi.category.replace(/_/g, ' ')}</Text>
        <Text style={styles.text}>Confidence: {(analysis.shdi.confidence * 100).toFixed(0)}%</Text>
      </View>

      {/* Phenotype Classification */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Risk Phenotype Classification</Text>
        <Text style={styles.text}>
          Primary Pattern: {analysis.phenotype.primary_pattern.replace(/_/g, ' ')}
        </Text>
        <Text style={styles.text}>Confidence: {(analysis.phenotype.confidence * 100).toFixed(0)}%</Text>
        <Text style={{ marginTop: 5 }}>Associated Risk Domains:</Text>
        <View style={styles.domainList}>
          {analysis.phenotype.associated_domains.map((domain, i) => (
            <Text key={i} style={styles.text}>
              • {domain}
            </Text>
          ))}
        </View>
      </View>

      {/* Trend Analysis */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trend Analysis</Text>
        <Text style={styles.text}>
          Sleep Efficiency Slope: {analysis.trends.efficiency_slope.toFixed(3)}/day
        </Text>
        <Text style={styles.text}>Deep Sleep Slope: {analysis.trends.deep_slope.toFixed(3)} min/day</Text>
        <Text style={styles.text}>REM Sleep Slope: {analysis.trends.rem_slope.toFixed(3)} min/day</Text>
        <Text style={styles.text}>
          Awakenings Slope: {analysis.trends.awakenings_slope.toFixed(3)}/day
        </Text>
        <Text style={styles.text}>Variability Index (SVI): {analysis.svi.toFixed(1)}/100</Text>
        <Text style={styles.text}>
          Significant Trend Detected: {analysis.trends.has_significant_trend ? 'Yes' : 'No'}
        </Text>
      </View>

      {/* Evidence Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Evidence Summary</Text>
        {evidence.length > 0 ? (
          evidence.slice(0, 3).map((e, i) => (
            <View key={i} style={styles.evidenceCard}>
              <Text style={styles.evidenceTitle}>
                Study {i + 1}: {e.title}
              </Text>
              <Text style={styles.evidenceDetail}>Authors: {e.authors}</Text>
              <Text style={styles.evidenceDetail}>
                Journal: {e.journal} ({e.year})
              </Text>
              <Text style={styles.evidenceDetail}>Study Design: {e.study_type}</Text>
              <Text style={styles.evidenceDetail}>Sample Size: n={e.sample_size.toLocaleString()}</Text>
              <Text style={styles.evidenceDetail}>Effect Size: {e.effect_size_description}</Text>
              <Text style={styles.evidenceDetail}>Evidence Strength: {e.evidence_strength}</Text>
              <Text style={styles.evidenceDetail}>Key Finding: {e.key_finding}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.text}>No evidence citations available.</Text>
        )}
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          IMPORTANT DISCLAIMER: This analysis is for research and educational purposes only. Consumer wearable
          devices provide algorithm-estimated sleep stages, not clinical-grade polysomnography. This report does
          not diagnose medical conditions and should not replace clinical judgment or diagnostic evaluation.
          Findings represent statistical associations from research literature, not causal relationships or medical
          advice.
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>SOMNI AI - Sleep Health Intelligence System</Text>
        <Text>Generated by Claude-powered multi-agent clinical intelligence</Text>
      </View>
    </Page>
  </Document>
);
