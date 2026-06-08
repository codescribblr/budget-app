import { NextResponse } from 'next/server';
import { getMerchantGroupForDescription } from '@/lib/db/merchant-groups';

/**
 * POST /api/import/get-merchant-info
 * Get merchant group and global merchant info for transaction descriptions
 * Used to display linked merchant names in the review table
 */
export async function POST(request: Request) {
  try {
    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { descriptions } = await request.json() as {
      descriptions: string[];
    };

    if (!Array.isArray(descriptions)) {
      return NextResponse.json(
        { error: 'descriptions must be an array' },
        { status: 400 }
      );
    }

    // Look up merchant group for each description
    const merchantInfo = await Promise.all(
      descriptions.map(async (description) => {
        try {
          const group = await getMerchantGroupForDescription(description);
          if (group) {
            // Get global merchant info if linked
            // getMerchantGroup returns group with global_merchants relation
            const globalMerchants = (group as any).global_merchants;
            const globalMerchant = globalMerchants
              ? (Array.isArray(globalMerchants) 
                  ? globalMerchants[0] 
                  : globalMerchants)
              : null;
            
            // Prefer global merchant name over group name (only if active)
            const displayName = globalMerchant?.status === 'active' 
              ? globalMerchant.display_name 
              : group.display_name;
            
            return {
              description,
              merchantName: displayName,
              merchantGroupId: group.id,
              globalMerchantId: group.global_merchant_id || null,
              logoUrl: globalMerchant?.status === 'active' ? globalMerchant.logo_url : null,
              iconName: globalMerchant?.status === 'active' ? globalMerchant.icon_name : null,
            };
          }
          
          // No merchant group found - return original description
          return {
            description,
            merchantName: description, // Fallback to description
            merchantGroupId: null,
            globalMerchantId: null,
            logoUrl: null,
            iconName: null,
          };
        } catch (error) {
          console.error(`Error getting merchant info for "${description}":`, error);
          return {
            description,
            merchantName: description, // Fallback to description
            merchantGroupId: null,
            globalMerchantId: null,
            logoUrl: null,
            iconName: null,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      merchantInfo,
    });
  } catch (error: any) {
    console.error('Error getting merchant info:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to get merchant info' },
      { status: 500 }
    );
  }
}
