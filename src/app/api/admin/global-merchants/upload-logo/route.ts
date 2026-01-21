import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/global-merchants/upload-logo
 * Upload a logo for a global merchant (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const merchantId = formData.get('merchant_id') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    if (!merchantId) {
      return NextResponse.json(
        { error: 'Merchant ID is required' },
        { status: 400 }
      );
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPG, PNG, or SVG' },
        { status: 400 }
      );
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }
    
    // Get merchant to verify it exists
    const { data: merchant, error: merchantError } = await supabase
      .from('global_merchants')
      .select('id, display_name')
      .eq('id', parseInt(merchantId))
      .single();
    
    if (merchantError || !merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `merchants/${merchantId}/${Date.now()}.${fileExt}`;
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('merchant-logos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });
    
    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload logo' },
        { status: 500 }
      );
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('merchant-logos')
      .getPublicUrl(fileName);
    
    const logoUrl = urlData.publicUrl;
    
    // Update merchant with logo URL
    const { error: updateError } = await supabase
      .from('global_merchants')
      .update({ logo_url: logoUrl })
      .eq('id', parseInt(merchantId));
    
    if (updateError) {
      // Try to clean up uploaded file
      await supabase.storage.from('merchant-logos').remove([fileName]);
      return NextResponse.json(
        { error: 'Failed to update merchant with logo URL' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ logo_url: logoUrl });
  } catch (error: any) {
    console.error('Error uploading logo:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    );
  }
}
