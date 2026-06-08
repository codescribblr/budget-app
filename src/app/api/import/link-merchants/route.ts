import { NextResponse } from 'next/server';
import { getOrCreateMerchantGroup } from '@/lib/db/merchant-groups';

/**
 * POST /api/import/link-merchants
 * Link transaction descriptions to global merchants by creating/getting merchant groups
 * This should be called before categorization so that merchant groups exist for category rules
 */
export async function POST(request: Request) {
  try {
    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { descriptions, batchId } = await request.json() as {
      descriptions: string[];
      batchId?: string;
    };

    if (!Array.isArray(descriptions)) {
      return NextResponse.json(
        { error: 'descriptions must be an array' },
        { status: 400 }
      );
    }

    // Link each description to a merchant group (which may link to global merchants)
    // This ensures merchant groups exist before categorization
    const results = await Promise.all(
      descriptions.map(async (description) => {
        try {
          const result = await getOrCreateMerchantGroup(description, true);
          return {
            description,
            merchantGroupId: result.group?.id || null,
            isNew: result.isNew,
            globalMerchantId: result.group?.global_merchant_id || null,
          };
        } catch (error) {
          console.error(`Error linking merchant for "${description}":`, error);
          return {
            description,
            merchantGroupId: null,
            isNew: false,
            globalMerchantId: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // Note: Merchant linking is an internal optimization step that doesn't need to be tracked
    // as a separate processing task. It happens automatically before categorization.

    return NextResponse.json({
      success: true,
      results,
      linked: results.filter(r => r.merchantGroupId !== null).length,
    });
  } catch (error: any) {
    console.error('Error linking merchants:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to link merchants' },
      { status: 500 }
    );
  }
}
