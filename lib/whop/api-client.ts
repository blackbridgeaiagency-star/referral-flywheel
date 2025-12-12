import logger from '../logger';

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
  logger.warn('⚠️ WHOP_API_KEY not configured - Whop API calls will fail');
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
    logger.error(`❌ Whop API error (${response.status}):`, errorText);
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
  route?: string;  // Company slug for public URL (e.g., "blackbridgeagency" → whop.com/blackbridgeagency)
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
  logger.info(` Fetching company details: ${companyId}`);
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
  logger.info(` Fetching memberships for company: ${companyId}`);
  const response = await whopApiRequest<{ data: WhopMembership[] }>(
    `/memberships?company_id=${companyId}`
  );
  return response.data || [];
}

/**
 * Get a specific membership by ID
 */
export async function getMembership(membershipId: string): Promise<WhopMembership> {
  logger.info(` Fetching membership: ${membershipId}`);
  const response = await whopApiRequest<{ data: WhopMembership }>(
    `/memberships/${membershipId}`
  );
  return response.data;
}

/**
 * Get memberships by experience ID and optionally user ID
 * Uses API v5 which supports experience_id filtering
 *
 * NOTE: This uses the APP API key - for user-specific lookups,
 * use getCurrentUserMemberships() with the user token instead.
 */
export async function getMembershipsByExperience(
  experienceId: string,
  userId?: string
): Promise<WhopMembership[]> {
  logger.info(`[API] Fetching memberships for experience: ${experienceId}${userId ? `, user: ${userId}` : ''}`);

  // Build query string
  const params = new URLSearchParams();
  params.append('experience_id', experienceId);
  if (userId) {
    params.append('user_id', userId);
  }
  params.append('valid', 'true');  // Only get valid memberships

  try {
    // Use v5 API with app API key
    const response = await fetch(`https://api.whop.com/api/v5/app/memberships?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[API] Whop API v5 /app/memberships error (${response.status}):`, errorText);
      return [];
    }

    const result = await response.json();
    logger.info(`[API] Found ${result.data?.length || 0} memberships via /app/memberships`);
    return result.data || [];
  } catch (error) {
    logger.error('[API] Error fetching memberships by experience:', error);
    return [];
  }
}

/**
 * Get current user's memberships using their token
 *
 * This is the CORRECT way to get a user's membership from the Whop iframe.
 * Uses /v5/me/memberships with the user's JWT token from the whop_user_token cookie.
 *
 * @param userToken - The JWT token from whop_user_token cookie (extracted via getToken)
 * @returns Array of user's memberships
 */
export async function getCurrentUserMemberships(userToken: string): Promise<WhopMembership[]> {
  logger.info(`[API] Fetching current user memberships via /v5/me/memberships`);

  try {
    const response = await fetch('https://api.whop.com/api/v5/me/memberships?valid=true', {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[API] Whop API v5 /me/memberships error (${response.status}):`, errorText);
      return [];
    }

    const result = await response.json();
    logger.info(`[API] Found ${result.data?.length || 0} memberships via /me/memberships`);
    return result.data || [];
  } catch (error) {
    logger.error('[API] Error fetching current user memberships:', error);
    return [];
  }
}

/**
 * Get experience details by experience ID
 *
 * @param experienceId - The experience ID (exp_*)
 * @returns Experience details including product_id and company_id
 */
export async function getExperience(experienceId: string): Promise<{
  id: string;
  product_id?: string;
  company_id?: string;
  name?: string;
} | null> {
  logger.info(`[API] Fetching experience: ${experienceId}`);

  try {
    const response = await fetch(`https://api.whop.com/api/v5/app/experiences/${experienceId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[API] Whop API v5 /experiences error (${response.status}):`, errorText);
      return null;
    }

    const result = await response.json();
    logger.info(`[API] Experience found:`, { id: result.id, product_id: result.product_id });
    return result;
  } catch (error) {
    logger.error('[API] Error fetching experience:', error);
    return null;
  }
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
  logger.info(` Fetching user: ${userId}`);
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
    logger.info(` Sending DM to user: ${userId}`);

    // Try the chat endpoint for sending messages (requires chat:message:create permission)
    // Alternative endpoints to try: /chat/messages, /support_chat/messages, /companies/{id}/chat
    const response = await whopApiRequest<{ success: boolean; id?: string }>(
      `/chat/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          content: message,
          company_id: options?.companyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
          // Try different field names as Whop API might expect different structure
          message: message,
          text: message,
          subject: options?.subject,
        }),
      }
    );

    logger.info('Message sent successfully');
    return {
      success: true,
      messageId: response.id,
    };
  } catch (error) {
    logger.error(`❌ Failed to send DM:`, error);

    // Try alternative endpoint for support chat
    try {
      logger.info(' Trying support chat endpoint...');
      const supportResponse = await whopApiRequest<{ success: boolean; id?: string }>(
        `/support_chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            user_id: userId,
            content: message,
            company_id: options?.companyId || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID,
          }),
        }
      );

      logger.info('Message sent via support chat');
      return {
        success: true,
        messageId: supportResponse.id,
      };
    } catch (supportError) {
      logger.error(`❌ Support chat also failed:`, supportError);
    }

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
  logger.info(` Fetching product: ${productId}`);
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
  getMembershipsByExperience,
  getCurrentUserMemberships,
  getExperience,
  getUser,
  sendDirectMessage,
  getProduct,
};

export default WhopAPI;
