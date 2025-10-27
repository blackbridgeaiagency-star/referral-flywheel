// API endpoint to get CSRF token
import { NextRequest } from 'next/server';
import { getCsrfToken } from '@/lib/security/csrf';

/**
 * GET /api/csrf
 * Returns CSRF token for client-side forms
 */
export async function GET(request: NextRequest) {
  return getCsrfToken(request);
}
