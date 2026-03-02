import { AdminMerchantSuggestionsPage } from '@/components/admin/AdminMerchantSuggestionsPage';
import { isAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function AdminMerchantSuggestionsPageRoute() {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }

  return <AdminMerchantSuggestionsPage />;
}
