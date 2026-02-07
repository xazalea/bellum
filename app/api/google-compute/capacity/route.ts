/**
 * Google Compute Capacity Endpoint
 * Get Google compute capacity/availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleComputeService } from '@/lib/google-compute';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const googleService = getGoogleComputeService();

    // Get capacity
    const capacity = googleService.getCapacity();

    // Get active tasks
    const activeTasks = googleService.getActiveTasks();

    // Get configuration
    const config = googleService.getConfig();

    return NextResponse.json({
      capacity,
      activeTasks: {
        count: activeTasks.length,
        taskIds: activeTasks,
      },
      config: {
        enabled: config.enabled,
        maxConcurrentTasks: config.maxConcurrentTasks,
        offloadThreshold: config.offloadThreshold,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[google-compute/capacity] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get capacity',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
