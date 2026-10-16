import { NextResponse } from 'next/server';
import { resolveMerchantGroupIdsForImport } from '@/lib/db/merchant-groups';

/**
 * POST /api/import/link-merchants
 * Link transaction descriptions to global merchants by creating/getting merchant groups.
 * Runs independently of categorization so groups exist even when categorization is skipped.
 */
export async function POST(request: Request) {
  try {
    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { descriptions } = await request.json() as {
      descriptions: string[];
      batchId?: string;
    };

    if (!Array.isArray(descriptions)) {
      return NextResponse.json(
        { error: 'descriptions must be an array' },
        { status: 400 }
      );
    }

    const uniqueDescriptions = [...new Set(descriptions.filter(Boolean))];
    const groupIds = await resolveMerchantGroupIdsForImport(uniqueDescriptions);

    const results = uniqueDescriptions.map((description, index) => ({
      description,
      merchantGroupId: groupIds[index],
      isNew: false,
      globalMerchantId: null as number | null,
    }));

    return NextResponse.json({
      success: true,
      results,
      linked: results.filter((r) => r.merchantGroupId != null).length,
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
