/**
 * Google Compute Metrics Endpoint
 * Get metrics and performance data for Google compute
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMetricsCollector } from '@/lib/google-compute/metrics';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const metricsCollector = getMetricsCollector();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';
    const includeSnapshots = searchParams.get('snapshots') === 'true';

    // Get metrics
    const metrics = metricsCollector.getMetrics();
    const successRate = metricsCollector.getSuccessRate();
    const executionTimes = metricsCollector.getAverageExecutionTimeByProvider();
    const distribution = metricsCollector.getTaskDistribution();

    const response: any = {
      metrics,
      summary: {
        successRate: (successRate * 100).toFixed(2) + '%',
        totalTasks: metrics.tasksRouted,
        googleTasks: distribution.google,
        clusterTasks: distribution.cluster,
        googlePercentage:
          metrics.tasksRouted > 0
            ? ((distribution.google / metrics.tasksRouted) * 100).toFixed(2) + '%'
            : '0%',
        averageExecutionTime: {
          google: executionTimes.google.toFixed(2) + 'ms',
          cluster: executionTimes.cluster.toFixed(2) + 'ms',
        },
        estimatedCostSavings: '$' + metrics.costSavings.toFixed(2),
      },
      timestamp: new Date().toISOString(),
    };

    // Include history if requested
    if (includeHistory) {
      response.performanceHistory = metricsCollector.getPerformanceHistory();
    }

    // Include snapshots if requested
    if (includeSnapshots) {
      response.snapshots = metricsCollector.getSnapshots();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[google-compute/metrics] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    const metricsCollector = getMetricsCollector();

    switch (action) {
      case 'snapshot':
        metricsCollector.takeSnapshot();
        return NextResponse.json({
          success: true,
          message: 'Snapshot taken',
        });

      case 'reset':
        metricsCollector.reset();
        return NextResponse.json({
          success: true,
          message: 'Metrics reset',
        });

      case 'export':
        const data = metricsCollector.exportData();
        return NextResponse.json({
          success: true,
          data,
        });

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[google-compute/metrics] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform action',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
