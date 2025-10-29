// lib/whop/api-client.ts
/**
 * Whop REST API v2 Client
 *
 * Direct REST API implementation since @whop/sdk has import issues.
 * Uses the same approach as our successful webhook integrations.
 */

const WHOP_API_BASE = 'https://api.whop.com/api/v2';
const WHOP_API_KEY = process.env.WHOP_API_KEY;

if (!WHOP_API_KEY) {
  console.warn('⚠️ WHOP_API_KEY not configured - Whop API calls will fail');
}

/**
 * Generic Whop API request handler
 */
async function whopApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!WHOP_API_KEY) {
    throw new Error('WHOP_API_KEY is not configured');
  }

  const url = `${WHOP_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${WHOP_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Whop API error (${response.status}):`, errorText);
    throw new Error(`Whop API error: ${response.status} ${errorText}`);
  }

  return response.json();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPANY / COMMUNITY OPERATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface WhopCompany {
  id: string;
  name: string;
  image_url?: string;
  description?: string;
  website?: string;
  discord?: string;
  twitter?: string;
  instagram?: string;
}

/**
 * Fetch company details by company ID
 */
export async function getCompany(companyId: string): Promise<WhopCompany> {
  console.log(`📡 Fetching company details: ${companyId}`);
  const response = await whopApiRequest<{ data: WhopCompany }>(
    `/companies/${companyId}`
  );
  return response.data;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MEMBERSHIP OPERATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface WhopMembership {
  id: string;
  user: {
    id: string;
    username?: string;
    email?: string;
  };
  plan: {
    id: string;
    amount: number;
  };
  status: string;
}

/**
 * Get all memberships for a company
 */
export async function getCompanyMemberships(
  companyId: string
): Promise<WhopMembership[]> {
  console.log(`📡 Fetching memberships for company: ${companyId}`);
  const response = await whopApiRequest<{ data: WhopMembership[] }>(
    `/memberships?company_id=${companyId}`
  );
  return response.data || [];
}

/**
 * Get a specific membership by ID
 */
export async function getMembership(membershipId: string): Promise<WhopMembership> {
  console.log(`📡 Fetching membership: ${membershipId}`);
  const response = await whopApiRequest<{ data: WhopMembership }>(
    `/memberships/${membershipId}`
  );
  return response.data;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USER & MESSAGING OPERATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface WhopUser {
  id: string;
  username?: string;
  email?: string;
  profile_pic_url?: string;
}

/**
 * Get user details
 */
export async function getUser(userId: string): Promise<WhopUser> {
  console.log(`📡 Fetching user: ${userId}`);
  const response = await whopApiRequest<{ data: WhopUser }>(
    `/users/${userId}`
  );
  return response.data;
}

/**
 * Send a direct message to a user
 *
 * NOTE: This requires proper Whop app permissions and may have rate limits.
 * Check Whop documentation for current messaging API status.
 */
export async function sendDirectMessage(
  userId: string,
  message: string,
  options?: {
    companyId?: string;
    subject?: string;
  }
): Promise<{ success: boolean; messageId?: string }> {
  try {
    console.log(`📧 Sending DM to user: ${userId}`);

    // Whop messaging endpoint (may need adjustment based on API version)
    // This is a best-effort implementation - check Whop docs for exact endpoint
    const response = await whopApiRequest<{ success: boolean; id?: string }>(
      `/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          content: message,
          company_id: options?.companyId,
          subject: options?.subject,
        }),
      }
    );

    console.log(`✅ Message sent successfully`);
    return {
      success: true,
      messageId: response.id,
    };
  } catch (error) {
    console.error(`❌ Failed to send DM:`, error);

    // Don't throw - return failure status so caller can handle gracefully
    return {
      success: false,
    };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PRODUCT OPERATIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface WhopProduct {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  visibility: string;
  created_at: number;
}

/**
 * Get product details
 */
export async function getProduct(productId: string): Promise<WhopProduct> {
  console.log(`📡 Fetching product: ${productId}`);
  const response = await whopApiRequest<{ data: WhopProduct }>(
    `/products/${productId}`
  );
  return response.data;
}

/**
 * Export for backwards compatibility
 */
export const WhopAPI = {
  getCompany,
  getCompanyMemberships,
  getMembership,
  getUser,
  sendDirectMessage,
  getProduct,
};

export default WhopAPI;
