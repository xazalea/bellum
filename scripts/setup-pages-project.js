#!/usr/bin/env node
/**
 * Helper script to verify/create Cloudflare Pages project
 * Ensures you're deploying to .pages.dev, not .workers.dev
 */

const { execSync } = require('child_process');

function log(message, data = {}) {
  console.log(`[PAGES SETUP] ${message}`, Object.keys(data).length > 0 ? data : '');
}

try {
  const projectName = process.env.CF_PAGES_PROJECT_NAME || 'challenger';
  
  log('Checking Cloudflare Pages projects...');
  
  // List Pages projects
  try {
    const output = execSync('wrangler pages project list', { encoding: 'utf8' });
    log('Your Pages projects:');
    console.log(output);
    
    // Check if our project exists
    if (output.includes(projectName)) {
      log(`✅ Pages project "${projectName}" found`);
      log('You can deploy using: pnpm run deploy:wrangler');
    } else {
      log(`⚠️  Pages project "${projectName}" not found`);
      log('Creating Pages project...');
      
      try {
        execSync(`wrangler pages project create ${projectName}`, { stdio: 'inherit' });
        log(`✅ Pages project "${projectName}" created successfully`);
        log('You can now deploy using: pnpm run deploy:wrangler');
      } catch (createError) {
        log('❌ Failed to create project', { error: createError.message });
        log('You can create it manually: wrangler pages project create bellum');
        process.exit(1);
      }
    }
  } catch (listError) {
    log('⚠️  Could not list Pages projects', { error: listError.message });
    log('Attempting to create project anyway...');
    
    try {
      execSync(`wrangler pages project create ${projectName}`, { stdio: 'inherit' });
      log(`✅ Pages project "${projectName}" created successfully`);
    } catch (createError) {
      log('❌ Failed to create project', { error: createError.message });
      log('Make sure you are authenticated: wrangler login');
      process.exit(1);
    }
  }
  
  log('');
  log('📝 Important Notes:');
  log('- Pages projects use .pages.dev domains');
  log('- Workers projects use .workers.dev domains');
  log('- Make sure you use "wrangler pages deploy" (not "wrangler deploy")');
  
  process.exit(0);
  
} catch (error) {
  log('❌ Setup failed', { 
    error: error.message,
    code: error.code
  });
  process.exit(1);
}
