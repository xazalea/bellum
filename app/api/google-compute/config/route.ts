/**
 * Google Compute Configuration Endpoint
 * Manage configuration for Google compute offloading
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConfigManager } from '@/lib/google-compute/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const configManager = getConfigManager();
    const config = configManager.getConfig();
    const validation = configManager.validate();

    return NextResponse.json({
      config,
      validation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[google-compute/config] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const configManager = getConfigManager();

    // Update configuration
    configManager.updateConfig(body);

    // Validate
    const validation = configManager.validate();
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid configuration',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const config = configManager.getConfig();

    return NextResponse.json({
      success: true,
      config,
      message: 'Configuration updated',
    });
  } catch (error) {
    console.error('[google-compute/config] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update configuration',
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
    const configManager = getConfigManager();

    switch (action) {
      case 'enable':
        configManager.enable();
        return NextResponse.json({
          success: true,
          message: 'Google compute enabled',
        });

      case 'disable':
        configManager.disable();
        return NextResponse.json({
          success: true,
          message: 'Google compute disabled',
        });

      case 'reset':
        configManager.resetToDefaults();
        return NextResponse.json({
          success: true,
          message: 'Configuration reset to defaults',
          config: configManager.getConfig(),
        });

      case 'export':
        const exported = configManager.exportConfig();
        return NextResponse.json({
          success: true,
          config: exported,
        });

      case 'import':
        const result = configManager.importConfig(body.config);
        if (result.success) {
          return NextResponse.json({
            success: true,
            message: 'Configuration imported',
            config: configManager.getConfig(),
          });
        } else {
          return NextResponse.json(
            {
              error: 'Import failed',
              message: result.error,
            },
            { status: 400 }
          );
        }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[google-compute/config] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to perform action',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
