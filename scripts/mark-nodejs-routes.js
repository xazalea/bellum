#!/usr/bin/env node

/**
 * Mark routes that use Firebase/crypto/session as Node.js runtime
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Routes that MUST use Node.js runtime (Firebase, crypto, session, etc.)
const nodejsRoutes = [
  'app/api/archives/route.ts',
  'app/api/archives/[id]/route.ts',
  'app/api/auth/session/route.ts',
  'app/api/cluster/heartbeat/route.ts',
  'app/api/cluster/peers/route.ts',
  'app/api/cluster/proxy/peers/route.ts',
  'app/api/discord/file/route.ts',
  'app/api/discord/manifest/route.ts',
  'app/api/discord/status/route.ts',
  'app/api/discord/upload/route.ts',
  'app/api/fabric/signal/route.ts',
  'app/api/fabrik/sites/route.ts',
  'app/api/fabrik/sites/[siteId]/route.ts',
  'app/api/game-repositories/route.ts',
  'app/api/game-repositories/mine/route.ts',
  'app/api/game-repositories/[repoId]/games/route.ts',
  'app/api/gpu-rental/leases/route.ts',
  'app/api/gpu-rental/leases/[id]/extend/route.ts',
  'app/api/gpu-rental/leases/[id]/release/route.ts',
  'app/api/ip/route.ts',
  'app/api/lan/signal/route.ts',
  'app/api/telegram/file/route.ts',
  'app/api/telegram/manifest/route.ts',
  'app/api/telegram/status/route.ts',
  'app/api/telegram/test/route.ts',
  'app/api/telegram/upload/route.ts',
  'app/api/user/account/route.ts',
  'app/api/user/account/challenge/route.ts',
  'app/api/user/apps/route.ts',
  'app/api/user/apps/[appId]/route.ts',
  'app/api/user/friends/route.ts',
  'app/api/user/profile/route.ts',
  'app/api/user/settings/route.ts',
  'app/api/vps/rendezvous/register/route.ts',
  'app/api/vps/rendezvous/poll/route.ts',
  'app/api/vps/rendezvous/respond/route.ts',
  'app/api/xfabric/sites/route.ts',
  'app/api/xfabric/sites/[siteId]/route.ts',
  'app/api/nacho/auth/trusted/route.ts',
  'app/api/nacho/auth/signin/route.ts',
  'app/api/nacho/auth/signup/route.ts',
  'app/api/nacho/auth/approve/route.ts',
];

async function markNodejsRoutes() {
  console.log('🔧 Marking Node.js-only routes...\n');
  
  let updated = 0;
  
  for (const relPath of nodejsRoutes) {
    const file = path.join(process.cwd(), relPath);
    
    if (!fs.existsSync(file)) {
      console.log(`⚠️  ${relPath} - not found`);
      continue;
    }
    
    let content = fs.readFileSync(file, 'utf-8');
    
    // Replace edge with nodejs
    if (content.includes("export const runtime = 'edge';")) {
      content = content.replace(
        "export const runtime = 'edge';",
        "export const runtime = 'nodejs';"
      );
      
      fs.writeFileSync(file, content, 'utf-8');
      console.log(`✅ ${relPath}`);
      updated++;
    }
  }
  
  console.log(`\n📊 Updated ${updated} routes to Node.js runtime`);
  console.log(`\n💡 These routes use Firebase Admin SDK, Node.js crypto, or session management`);
  console.log(`   They will run on Vercel's Node.js serverless functions`);
  console.log(`\n🚀 Edge-compatible routes (for Cloudflare unlimited requests):`);
  console.log(`   - /api/games (your highest traffic API!)`);
  console.log(`   - /api/proxy/*`);
  console.log(`   - /api/isos/*`);
  console.log(`   - /api/uploads/*`);
  console.log(`   - /api/fabrik/ingress/*`);
}

markNodejsRoutes().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
