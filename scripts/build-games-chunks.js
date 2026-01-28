#!/usr/bin/env node
/**
 * Build chunked JSON files for progressive game loading
 * Creates multiple smaller files instead of one huge file
 */

const fs = require('fs');
const path = require('path');

const GAMES_PER_CHUNK = 100; // 100 games per chunk

function parseGamesXml(xmlText) {
  const games = [];
  const urlRegex = /<url>([\s\S]*?)<\/url>/g;
  let match;
  
  while ((match = urlRegex.exec(xmlText)) !== null) {
    const urlBlock = match[1];
    const locMatch = /<loc>(https:\/\/html5\.gamedistribution\.com\/([a-f0-9]{32})\/)<\/loc>/.exec(urlBlock);
    if (!locMatch) continue;
    
    const gameUrl = locMatch[1];
    const gameId = locMatch[2];
    const imageMatch = /<image:loc>(.*?)<\/image:loc>/.exec(urlBlock);
    const imageUrl = imageMatch ? imageMatch[1] : '';
    
    games.push({
      id: gameId,
      title: `HTML5 Game ${gameId.substring(0, 8)}`,
      description: 'Play this HTML5 game instantly in your browser',
      thumb: imageUrl,
      file: gameUrl,
      platform: 'html5'
    });
    
    if (games.length % 1000 === 0) {
      console.log(`Processed ${games.length} games...`);
    }
  }
  
  return games;
}

async function main() {
  console.log('Building chunked games JSON...');
  
  const xmlPath = path.join(__dirname, '../public/games.xml');
  const chunksDir = path.join(__dirname, '../public/games-chunks');
  
  // Create chunks directory
  if (!fs.existsSync(chunksDir)) {
    fs.mkdirSync(chunksDir, { recursive: true });
  }
  
  console.log('Reading and parsing XML...');
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  const allGames = parseGamesXml(xmlContent);
  
  console.log(`\nTotal games found: ${allGames.length}`);
  
  // Split into chunks
  const totalChunks = Math.ceil(allGames.length / GAMES_PER_CHUNK);
  console.log(`Creating ${totalChunks} chunks (${GAMES_PER_CHUNK} games each)...`);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * GAMES_PER_CHUNK;
    const end = Math.min(start + GAMES_PER_CHUNK, allGames.length);
    const chunkGames = allGames.slice(start, end);
    
    const chunk = {
      chunk: i,
      games: chunkGames,
      count: chunkGames.length
    };
    
    const chunkPath = path.join(chunksDir, `chunk-${i}.json`);
    fs.writeFileSync(chunkPath, JSON.stringify(chunk), 'utf8');
    
    if ((i + 1) % 10 === 0) {
      console.log(`  Created ${i + 1}/${totalChunks} chunks...`);
    }
  }
  
  // Create index file
  const index = {
    total: allGames.length,
    totalChunks,
    gamesPerChunk: GAMES_PER_CHUNK,
    generatedAt: Date.now(),
    version: 1
  };
  
  fs.writeFileSync(path.join(chunksDir, 'index.json'), JSON.stringify(index), 'utf8');
  
  // Calculate total size
  const files = fs.readdirSync(chunksDir);
  const totalSize = files.reduce((sum, file) => {
    return sum + fs.statSync(path.join(chunksDir, file)).size;
  }, 0);
  
  console.log('\n✅ Done!');
  console.log(`Total chunks: ${totalChunks}`);
  console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Average chunk: ${(totalSize / totalChunks / 1024).toFixed(2)} KB`);
  console.log(`Games: ${allGames.length}`);
}

main().catch(console.error);
