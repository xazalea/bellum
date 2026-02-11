#!/usr/bin/env node
/**
 * Create or verify the challenger Pages project
 * Tries "challenger" first, falls back to "challengerdeep" if unavailable
 */

const { execSync } = require('child_process');

function log(message) {
  console.log(`[CHALLENGER SETUP] ${message}`);
}

try {
  // Try challenger first
  let projectName = 'challenger';
  let created = false;
  
  log('Checking if "challenger" project exists...');
  
  try {
    const output = execSync('wrangler pages project list', { encoding: 'utf8' });
    
    if (output.includes('challenger')) {
      log('✅ "challenger" project already exists');
      projectName = 'challenger';
    } else {
      log('Creating "challenger" project...');
      try {
        execSync('wrangler pages project create challenger', { 
          stdio: 'inherit',
          input: 'main\n' // Production branch
        });
        log('✅ "challenger" project created successfully');
        projectName = 'challenger';
        created = true;
      } catch (createError) {
        if (createError.message.includes('already exists') || createError.message.includes('409')) {
          log('⚠️  "challenger" project name may be taken, trying "challengerdeep"...');
          projectName = 'challengerdeep';
        } else {
          throw createError;
        }
      }
    }
  } catch (listError) {
    log('⚠️  Could not list projects, attempting to create "challenger"...');
    try {
      execSync('wrangler pages project create challenger', { 
        stdio: 'inherit',
        input: 'main\n'
      });
      projectName = 'challenger';
      created = true;
    } catch (createError) {
      if (createError.message.includes('already exists') || createError.message.includes('409')) {
        log('⚠️  "challenger" unavailable, trying "challengerdeep"...');
        projectName = 'challengerdeep';
      } else {
        throw createError;
      }
    }
  }
  
  // If challenger failed, try challengerdeep
  if (projectName === 'challengerdeep' && !created) {
    log('Checking if "challengerdeep" project exists...');
    try {
      const output = execSync('wrangler pages project list', { encoding: 'utf8' });
      if (output.includes('challengerdeep')) {
        log('✅ "challengerdeep" project already exists');
      } else {
        log('Creating "challengerdeep" project...');
        execSync('wrangler pages project create challengerdeep', { 
          stdio: 'inherit',
          input: 'main\n'
        });
        log('✅ "challengerdeep" project created successfully');
      }
    } catch (error) {
      log('❌ Failed to create project', { error: error.message });
      process.exit(1);
    }
  }
  
  log('');
  log(`✅ Project name: ${projectName}`);
  log(`📝 Set CF_PAGES_PROJECT_NAME=${projectName} or use default in scripts`);
  log('');
  log('You can now deploy using:');
  log(`  CF_PAGES_PROJECT_NAME=${projectName} pnpm run deploy:wrangler`);
  log('  or');
  log(`  pnpm run deploy:wrangler  # (uses ${projectName} as default)`);
  
  process.exit(0);
  
} catch (error) {
  log('❌ Setup failed', { error: error.message });
  process.exit(1);
}
