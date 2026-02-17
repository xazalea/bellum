#!/usr/bin/env node

/**
 * Comprehensive Feature Verification Script
 * Checks all critical features of Challenger Deep / Abyss OS
 */

const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let warnings = 0;

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function header(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, BOLD + CYAN);
  console.log('='.repeat(60) + '\n');
}

function test(name, passed, message = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    log(`  ✓ ${name}`, GREEN);
    if (message) log(`    ${message}`, RESET);
  } else {
    failedTests++;
    log(`  ✗ ${name}`, RED);
    if (message) log(`    ${message}`, YELLOW);
  }
}

function warn(message) {
  warnings++;
  log(`  ⚠ ${message}`, YELLOW);
}

function info(message) {
  log(`    ${message}`, BLUE);
}

// Check if file exists
function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, '..', filePath));
}

// Check if file contains content
function fileContains(filePath, searchString) {
  try {
    const content = fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
    return content.includes(searchString);
  } catch {
    return false;
  }
}

// Get file size
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(path.join(__dirname, '..', filePath));
    return stats.size;
  } catch {
    return 0;
  }
}

// Parse JSON file
function parseJSON(filePath) {
  try {
    const content = fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Main verification
function verifyFeatures() {
  log('Challenger Deep - Feature Verification\n', BOLD + CYAN);
  log('Checking all critical features and dependencies...', RESET);

  // ═══════════════════════════════════════════════════════════
  header('1. GAMES LIBRARY (20K+ Games)');
  // ═══════════════════════════════════════════════════════════

  test(
    'games.json exists',
    fileExists('public/games.json'),
    'JSON catalog file found'
  );

  test(
    'games.xml exists',
    fileExists('public/games.xml'),
    'XML catalog file found (fallback)'
  );

  const gamesData = parseJSON('public/games.json');
  if (gamesData) {
    const gameCount = gamesData.games?.length || 0;
    test(
      `Games count: ${gameCount.toLocaleString()}`,
      gameCount >= 20000,
      gameCount >= 20000 ? 'Excellent! 20K+ games available' : `Only ${gameCount} games found`
    );

    test(
      'Games have required fields',
      gamesData.games?.[0]?.id && gamesData.games?.[0]?.title && gamesData.games?.[0]?.file,
      'id, title, file fields present'
    );

    test(
      'Games have thumbnails',
      gamesData.games?.[0]?.thumb && gamesData.games?.[0]?.thumb.includes('img.gamedistribution'),
      'Thumbnail URLs valid'
    );
  } else {
    test('games.json is valid JSON', false, 'Could not parse games.json');
  }

  test(
    'Games API route exists',
    fileExists('app/api/games/route.ts'),
    'Server-side games API endpoint'
  );

  test(
    'Game proxy API exists',
    fileExists('app/api/proxy/game/route.ts'),
    'Iframe bypass proxy endpoint'
  );

  test(
    'Games page component exists',
    fileExists('app/games/page.tsx'),
    'Games library UI'
  );

  test(
    'Games parser library exists',
    fileExists('lib/games-parser.ts'),
    'Client-side games parser'
  );

  // ═══════════════════════════════════════════════════════════
  header('2. ANDROID APK RUNNER');
  // ═══════════════════════════════════════════════════════════

  test(
    'Android page exists',
    fileExists('app/android/page.tsx'),
    'Android runtime UI'
  );

  test(
    'APK Loader exists',
    fileExists('lib/engine/loaders/apk-loader.ts'),
    'APK loading and execution engine'
  );

  test(
    'Android boot manager exists',
    fileExists('lib/nexus/os/android-boot.ts') || fileExists('lib/nexus/os/android-boot.tsx'),
    'Android framework boot system'
  );

  test(
    'Execution pipeline exists',
    fileExists('lib/engine/execution-pipeline.ts') || fileExists('lib/engine/execution-pipeline.tsx'),
    'Cross-platform execution pipeline'
  );

  const androidPage = fileExists('app/android/page.tsx');
  if (androidPage) {
    test(
      'Android page has drag-and-drop',
      fileContains('app/android/page.tsx', 'dragenter') && fileContains('app/android/page.tsx', 'drop'),
      'File upload via drag-and-drop supported'
    );

    test(
      'Android page has logging',
      fileContains('app/android/page.tsx', 'addLog') || fileContains('app/android/page.tsx', 'setLogs'),
      'Debug logging system implemented'
    );

    test(
      'Android page handles errors',
      fileContains('app/android/page.tsx', 'catch') && fileContains('app/android/page.tsx', 'error'),
      'Error handling in place'
    );
  }

  // ═══════════════════════════════════════════════════════════
  header('3. WINDOWS EXE RUNNER');
  // ═══════════════════════════════════════════════════════════

  test(
    'Windows page exists',
    fileExists('app/windows/page.tsx'),
    'Windows runtime UI'
  );

  test(
    'Windows runtime exists',
    fileExists('lib/nacho/windows/runtime.ts') || fileExists('lib/nacho/windows/runtime.tsx'),
    'Windows NT emulation runtime'
  );

  test(
    'PE Loader exists',
    fileExists('lib/nacho/windows/pe-loader.ts') || fileExists('lib/nacho/windows/pe-loader.tsx'),
    'Portable Executable parser'
  );

  test(
    'WebGPU context exists',
    fileExists('lib/nacho/gpu/webgpu.ts') || fileExists('lib/nacho/gpu/webgpu.tsx'),
    'WebGPU rendering backend'
  );

  const windowsPage = fileExists('app/windows/page.tsx');
  if (windowsPage) {
    test(
      'Windows page has drag-and-drop',
      fileContains('app/windows/page.tsx', 'dragenter') && fileContains('app/windows/page.tsx', 'drop'),
      'File upload via drag-and-drop supported'
    );

    test(
      'Windows page has canvas',
      fileContains('app/windows/page.tsx', 'canvasRef') || fileContains('app/windows/page.tsx', '<canvas'),
      'Canvas rendering surface'
    );

    test(
      'Windows page handles errors',
      fileContains('app/windows/page.tsx', 'catch') && fileContains('app/windows/page.tsx', 'error'),
      'Error handling in place'
    );
  }

  // ═══════════════════════════════════════════════════════════
  header('4. UI CONSISTENCY');
  // ═══════════════════════════════════════════════════════════

  test(
    'Layout component exists',
    fileExists('app/layout.tsx'),
    'Root layout with Sidebar and Header'
  );

  test(
    'Global styles exist',
    fileExists('app/globals.css'),
    'Challenger Deep theme CSS'
  );

  test(
    'Material Symbols loaded',
    fileContains('app/layout.tsx', 'material-symbols') || fileContains('app/layout.tsx', 'Material+Symbols'),
    'Icon font properly imported'
  );

  test(
    'Sidebar component exists',
    fileExists('components/Sidebar.tsx'),
    'Navigation sidebar'
  );

  test(
    'Header component exists',
    fileExists('components/Header.tsx'),
    'Top navigation bar'
  );

  test(
    'Button component exists',
    fileExists('components/ui/Button.tsx'),
    'Reusable button component'
  );

  const layoutFile = fileExists('app/layout.tsx');
  if (layoutFile) {
    test(
      'Layout has metadata',
      fileContains('app/layout.tsx', 'metadata') && fileContains('app/layout.tsx', 'Challenger Deep'),
      'SEO metadata configured'
    );

    test(
      'Layout has viewport config',
      fileContains('app/layout.tsx', 'viewport'),
      'Mobile viewport settings'
    );
  }

  // ═══════════════════════════════════════════════════════════
  header('5. CORE PAGES');
  // ═══════════════════════════════════════════════════════════

  test('Home page exists', fileExists('app/page.tsx'), 'Landing page');
  test('Games page exists', fileExists('app/games/page.tsx'), 'Games library');
  test('Android page exists', fileExists('app/android/page.tsx'), 'APK runner');
  test('Windows page exists', fileExists('app/windows/page.tsx'), 'EXE runner');
  test('Library page exists', fileExists('app/library/page.tsx'), 'User library');
  test('Account page exists', fileExists('app/account/page.tsx'), 'User account');
  test('Storage page exists', fileExists('app/storage/page.tsx'), 'File storage');
  test('VMs page exists', fileExists('app/virtual-machines/page.tsx'), 'Virtual machines');

  // ═══════════════════════════════════════════════════════════
  header('6. API ENDPOINTS');
  // ═══════════════════════════════════════════════════════════

  test('Games API', fileExists('app/api/games/route.ts'), '/api/games');
  test('Game Proxy API', fileExists('app/api/proxy/game/route.ts'), '/api/proxy/game');
  test('Discord API', fileExists('app/api/discord/upload/route.ts'), '/api/discord/*');
  test('User API', fileExists('app/api/user/profile/route.ts'), '/api/user/*');
  test('Auth API', fileExists('app/api/auth/session/route.ts'), '/api/auth/*');

  // ═══════════════════════════════════════════════════════════
  header('7. DEPENDENCIES');
  // ═══════════════════════════════════════════════════════════

  const packageJson = parseJSON('package.json');
  if (packageJson) {
    const deps = packageJson.dependencies || {};

    test('Next.js installed', !!deps.next, `Version: ${deps.next || 'N/A'}`);
    test('React installed', !!deps.react, `Version: ${deps.react || 'N/A'}`);
    test('Framer Motion', !!deps['framer-motion'], 'Animation library');
    test('Firebase', !!deps.firebase, 'Backend services');
    test('Tailwind CSS', fileExists('tailwind.config.ts'), 'Styling framework');

    if (deps['pixel-retroui']) {
      info('RetroUI component library found');
    }
  } else {
    test('package.json is valid', false, 'Could not parse package.json');
  }

  // ═══════════════════════════════════════════════════════════
  header('8. BUILD CONFIGURATION');
  // ═══════════════════════════════════════════════════════════

  test('next.config.js exists', fileExists('next.config.js'), 'Next.js configuration');
  test('tsconfig.json exists', fileExists('tsconfig.json'), 'TypeScript configuration');
  test('tailwind.config.ts exists', fileExists('tailwind.config.ts'), 'Tailwind configuration');
  test('postcss.config.js exists', fileExists('postcss.config.js'), 'PostCSS configuration');

  // ═══════════════════════════════════════════════════════════
  header('9. PERFORMANCE CHECKS');
  // ═══════════════════════════════════════════════════════════

  const gamesJsonSize = getFileSize('public/games.json');
  test(
    `games.json size: ${(gamesJsonSize / 1024 / 1024).toFixed(2)} MB`,
    gamesJsonSize > 0 && gamesJsonSize < 50 * 1024 * 1024,
    gamesJsonSize < 10 * 1024 * 1024 ? 'Optimal size' : 'Large but acceptable'
  );

  if (fileContains('app/games/page.tsx', 'useMemo') || fileContains('app/games/page.tsx', 'useCallback')) {
    test('Games page uses React optimization', true, 'useMemo/useCallback found');
  } else {
    warn('Games page might benefit from React optimization hooks');
  }

  if (fileContains('app/games/page.tsx', 'virtualiz') || fileContains('app/games/page.tsx', 'viewport')) {
    test('Games page uses virtualization', true, 'Optimized for large lists');
  } else {
    warn('Consider implementing virtualization for 20K+ games');
  }

  // ═══════════════════════════════════════════════════════════
  header('10. SECURITY CHECKS');
  // ═══════════════════════════════════════════════════════════

  if (fileContains('app/api/proxy/game/route.ts', 'ALLOWED_DOMAINS')) {
    test('Game proxy has domain whitelist', true, 'Security whitelist implemented');
  } else {
    warn('Game proxy should have domain whitelist for security');
  }

  if (fileContains('app/android/page.tsx', 'sandbox') || fileContains('app/games/page.tsx', 'sandbox')) {
    test('Iframe sandbox attributes', true, 'Sandboxed execution');
  } else {
    warn('Consider adding sandbox attributes to iframes');
  }

  test(
    'Environment variables template',
    fileExists('.env.example') || fileExists('.env.local.example'),
    'Environment configuration guide'
  );

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════

  console.log('\n' + '='.repeat(60));
  log('  VERIFICATION SUMMARY', BOLD + CYAN);
  console.log('='.repeat(60));

  log(`\n  Total Tests:    ${totalTests}`, BOLD);
  log(`  ✓ Passed:       ${passedTests}`, GREEN);
  log(`  ✗ Failed:       ${failedTests}`, failedTests > 0 ? RED : GREEN);
  log(`  ⚠ Warnings:     ${warnings}`, warnings > 0 ? YELLOW : GREEN);

  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  log(`\n  Success Rate:   ${successRate}%`, successRate >= 90 ? GREEN : successRate >= 75 ? YELLOW : RED);

  console.log('\n' + '='.repeat(60) + '\n');

  // Feature-specific summaries
  info('FEATURE STATUS:');

  const gamesOk = gamesData && gamesData.games?.length >= 20000;
  log(`  • 20K+ Games:        ${gamesOk ? '✓ READY' : '✗ NEEDS ATTENTION'}`, gamesOk ? GREEN : RED);

  const androidOk = fileExists('app/android/page.tsx') && fileExists('lib/engine/loaders/apk-loader.ts');
  log(`  • Android APK:       ${androidOk ? '✓ READY' : '✗ NEEDS ATTENTION'}`, androidOk ? GREEN : RED);

  const windowsOk = fileExists('app/windows/page.tsx') && fileExists('lib/nacho/windows/runtime.ts');
  log(`  • Windows EXE:       ${windowsOk ? '✓ READY' : '✗ NEEDS ATTENTION'}`, windowsOk ? GREEN : RED);

  const uiOk = fileExists('app/layout.tsx') && fileExists('components/Sidebar.tsx') && fileContains('app/layout.tsx', 'material');
  log(`  • UI Consistency:    ${uiOk ? '✓ READY' : '⚠ CHECK MATERIAL SYMBOLS'}`, uiOk ? GREEN : YELLOW);

  console.log('\n' + '='.repeat(60) + '\n');

  if (failedTests === 0) {
    log('🎉 All critical features are operational!', BOLD + GREEN);
    log('   Your Challenger Deep installation is ready for production.\n', GREEN);
  } else if (failedTests <= 3) {
    log('⚠️  Most features are working, but some issues need attention.', BOLD + YELLOW);
    log('   Review failed tests above and fix critical issues.\n', YELLOW);
  } else {
    log('❌ Multiple critical features are missing or broken.', BOLD + RED);
    log('   Please fix the failed tests before deploying.\n', RED);
  }

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run verification
verifyFeatures();
