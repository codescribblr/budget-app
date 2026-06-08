import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/lib/notifications/notification-service';

const service = new NotificationService();

/**
 * GET /api/cron/send-notifications
 * Send scheduled notifications (called by cron job)
 * 
 * This endpoint should be called by:
 * - Vercel Cron (configured in vercel.json)
 * - Supabase Edge Function with pg_cron
 * - External cron service
 * 
 * Security: In production, verify the request is from a trusted source
 * using Authorization header or Vercel Cron secret
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Send scheduled notifications
    await service.sendScheduledNotifications();

    return NextResponse.json({
      success: true,
      message: 'Scheduled notifications processed',
    });
  } catch (error: any) {
    console.error('Error in send notifications cron:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}




