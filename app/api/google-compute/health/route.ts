/**
 * Google Compute Health Endpoint
 * Health check for Google compute service
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleComputeService, getLoadAnalyzer } from '@/lib/google-compute';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const googleService = getGoogleComputeService();
    const loadAnalyzer = getLoadAnalyzer();

    // Get capacity
    const capacity = googleService.getCapacity();

    // Get load statistics
    const loadStats = loadAnalyzer.getStatistics();

    // Get load trend
    const trend = loadAnalyzer.analyzeTrend();

    // Determine overall health
    const isHealthy = capacity.available && !capacity.rateLimited;

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks: {
        serviceEnabled: googleService.getConfig().enabled,
        capacityAvailable: capacity.available,
        rateLimited: capacity.rateLimited,
        hasActiveTasks: capacity.currentTasks > 0,
      },
      capacity: {
        current: capacity.currentTasks,
        max: capacity.maxConcurrentTasks,
        utilization: capacity.utilizationPercent,
        available: capacity.available,
      },
      cluster: {
        loadStatistics: loadStats,
        trend: {
          direction: trend.direction,
          confidence: trend.confidence,
        },
        samples: loadAnalyzer.getSampleCount(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[google-compute/health] Error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
