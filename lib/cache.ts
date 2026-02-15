import { SleepAnalysisResult, ResearchEvidence, UsageMetrics } from './agents/types';

export interface CachedReports {
  patient: string;
  clinical: string;
  evidence: ResearchEvidence[];
  usage?: UsageMetrics;
}

export interface CachedAnalysis {
  analysis: SleepAnalysisResult;
  timestamp: string;
  reports?: CachedReports;
}

// Cache key prefix for analysis entries
const CACHE_KEY_PREFIX = 'analysis:';
// TTL for cache entries in seconds (24 hours)
const CACHE_TTL = 86400;

// In-memory fallback cache for local development
declare global {
  var analysisCache: Record<string, CachedAnalysis> | undefined;
}

global.analysisCache = global.analysisCache || {};

// Check if Vercel KV is configured
const isKVConfigured = !!(
  process.env.KV_REST_API_URL &&
  process.env.KV_REST_API_TOKEN
);

// Lazy import of @vercel/kv to avoid errors when not configured
let kv: any = null;
if (isKVConfigured) {
  try {
    // Dynamic import to avoid build issues when KV is not configured
    const kvModule = require('@vercel/kv');
    kv = kvModule.kv;
  } catch (error) {
    console.warn('Failed to load @vercel/kv, falling back to in-memory cache:', error);
  }
}

/**
 * Retrieve an analysis from the cache
 * @param id - The analysis ID (nanoid)
 * @returns The cached analysis or null if not found
 */
export async function getAnalysis(id: string): Promise<CachedAnalysis | null> {
  try {
    if (kv && isKVConfigured) {
      // Use Vercel KV in production
      const key = `${CACHE_KEY_PREFIX}${id}`;
      const data = await kv.get(key);
      return data as CachedAnalysis | null;
    } else {
      // Fall back to in-memory cache for local development
      return global.analysisCache?.[id] || null;
    }
  } catch (error) {
    console.error('Cache read error:', error);
    // Fall back to in-memory on KV error
    return global.analysisCache?.[id] || null;
  }
}

/**
 * Store an analysis in the cache
 * @param id - The analysis ID (nanoid)
 * @param value - The analysis data to cache
 */
export async function setAnalysis(id: string, value: CachedAnalysis): Promise<void> {
  try {
    if (kv && isKVConfigured) {
      // Use Vercel KV in production with TTL
      const key = `${CACHE_KEY_PREFIX}${id}`;
      await kv.set(key, value, { ex: CACHE_TTL });
    } else {
      // Fall back to in-memory cache for local development
      if (!global.analysisCache) {
        global.analysisCache = {};
      }
      global.analysisCache[id] = value;
    }
  } catch (error) {
    console.error('Cache write error:', error);
    // Fall back to in-memory on KV error
    if (!global.analysisCache) {
      global.analysisCache = {};
    }
    global.analysisCache[id] = value;
  }
}
