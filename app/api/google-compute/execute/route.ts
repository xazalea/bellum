/**
 * Google Compute Execute Endpoint
 * Execute compute tasks via Google Translate iframe
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleComputeService } from '@/lib/google-compute';
import type { ComputeTask } from '@/lib/google-compute';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    if (!body.task) {
      return NextResponse.json(
        { error: 'Task is required' },
        { status: 400 }
      );
    }

    const task: ComputeTask = body.task;

    // Validate task structure
    if (!task.id || !task.type || !task.payload) {
      return NextResponse.json(
        { error: 'Invalid task structure' },
        { status: 400 }
      );
    }

    // Get Google compute service
    const googleService = getGoogleComputeService();

    // Check if task can be handled
    if (!googleService.canHandleTask(task)) {
      return NextResponse.json(
        { error: 'Task not suitable for Google compute' },
        { status: 400 }
      );
    }

    // Execute task
    const result = await googleService.executeTask(task);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[google-compute/execute] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute task',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Return info about the execute endpoint
  return NextResponse.json({
    endpoint: '/api/google-compute/execute',
    method: 'POST',
    description: 'Execute compute tasks via Google Translate iframe',
    requestBody: {
      task: {
        id: 'string',
        type: 'web-app | javascript | rendering | generic',
        payload: 'ComputeTaskPayload',
        priority: 'number (optional)',
        timeout: 'number (optional)',
        metadata: 'object (optional)',
      },
    },
    response: {
      taskId: 'string',
      success: 'boolean',
      result: 'any (if successful)',
      error: 'string (if failed)',
      executionTime: 'number',
      provider: 'google | cluster',
    },
  });
}
