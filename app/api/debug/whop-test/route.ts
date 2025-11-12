// app/api/debug/whop-test/route.ts
import { NextResponse } from 'next/server';
import { getCompany } from '../../../../lib/whop/api-client';
import logger from '../../../../lib/logger';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId') || 'biz_kkGoY7OvzWXRdK';

  try {
    logger.info(`Testing Whop API connection for company: ${companyId}`);

    // Test 1: Check API key is set
    if (!process.env.WHOP_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'WHOP_API_KEY is not set in environment variables',
        fix: 'Add WHOP_API_KEY to Vercel environment variables'
      }, { status: 500 });
    }

    logger.info('✅ WHOP_API_KEY is set');

    // Test 2: Try to fetch company data
    const company = await getCompany(companyId);

    return NextResponse.json({
      success: true,
      message: 'Whop API connection successful',
      data: {
        companyId: company.id,
        companyName: company.name,
        imageUrl: company.image_url,
        description: company.description
      }
    });

  } catch (error: any) {
    logger.error('❌ Whop API test failed:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      details: {
        companyId,
        apiKeySet: !!process.env.WHOP_API_KEY,
        apiKeyPrefix: process.env.WHOP_API_KEY?.substring(0, 10) + '...',
      },
      possibleCauses: [
        'Invalid WHOP_API_KEY',
        'API key lacks required permissions',
        'Company ID does not exist',
        'Whop API is down'
      ],
      fix: 'Check your WHOP_API_KEY in Whop Developer Dashboard'
    }, { status: 500 });
  }
}
