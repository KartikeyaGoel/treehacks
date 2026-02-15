import { NextRequest, NextResponse } from 'next/server';
import { getAnalysis } from '@/lib/cache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Analysis ID required' },
        { status: 400 }
      );
    }

    // Retrieve cached analysis
    const cached = await getAnalysis(id);
    if (!cached) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(cached.analysis);

  } catch (error: any) {
    console.error('[Get Analysis] Error:', error);
    return NextResponse.json(
      { error: `Failed to retrieve analysis: ${error.message}` },
      { status: 500 }
    );
  }
}
