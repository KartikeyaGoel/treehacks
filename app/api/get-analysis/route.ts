import { NextRequest, NextResponse } from 'next/server';

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
    const cached = (global as any).analysisCache?.[id];
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
