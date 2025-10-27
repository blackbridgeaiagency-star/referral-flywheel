import { NextResponse } from 'next/server';
import { getMemberEarningsByRange } from '../../../../lib/queries/earnings';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  const range = searchParams.get('range') as '7' | '30' | '90' | 'year' | 'custom' || '30';
  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end');

  if (!memberId) {
    return NextResponse.json({ error: 'Missing memberId parameter' }, { status: 400 });
  }

  // Validate custom range parameters
  if (range === 'custom' && (!startDate || !endDate)) {
    return NextResponse.json({ error: 'Custom range requires start and end dates' }, { status: 400 });
  }

  try {
    let earnings;

    if (range === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      earnings = await getMemberEarningsByRange(memberId, 'custom', start, end);
    } else {
      earnings = await getMemberEarningsByRange(memberId, range);
    }

    return NextResponse.json(earnings);
  } catch (error) {
    console.error('❌ Earnings history error:', error);
    return NextResponse.json({ error: 'Failed to fetch earnings history' }, { status: 500 });
  }
}
