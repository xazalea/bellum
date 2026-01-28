#!/usr/bin/env node
/**
 * Build a pre-processed JSON version of games.xml for faster loading
 * This converts the 6.4MB XML to a smaller, faster-to-parse JSON format
 */

const fs = require('fs');
const path = require('path');

function parseGamesXml(xmlText) {
  const games = [];
  
  // Simple regex parsing (much faster than DOMParser for this use case)
  const urlRegex = /<url>([\s\S]*?)<\/url>/g;
  let match;
  let id = 0;
  
  while ((match = urlRegex.exec(xmlText)) !== null) {
    const urlBlock = match[1];
    
    // Extract loc (game URL)
    const locMatch = /<loc>(https:\/\/html5\.gamedistribution\.com\/([a-f0-9]{32})\/)<\/loc>/.exec(urlBlock);
    if (!locMatch) continue;
    
    const gameUrl = locMatch[1];
    const gameId = locMatch[2];
    
    // Extract image loc
    const imageMatch = /<image:loc>(.*?)<\/image:loc>/.exec(urlBlock);
    const imageUrl = imageMatch ? imageMatch[1] : '';
    
    games.push({
      id: gameId,
      title: `HTML5 Game ${gameId.substring(0, 8)}`,
      description: 'Play this HTML5 game instantly in your browser. No downloads required!',
      thumb: imageUrl,
      file: gameUrl,
      width: '800',
      height: '600',
      platform: 'html5'
    });
    
    id++;
    
    // Progress indicator
    if (id % 1000 === 0) {
      console.log(`Processed ${id} games...`);
    }
  }
  
  return games;
}

async function main() {
  console.log('Building games JSON from XML...');
  
  const xmlPath = path.join(__dirname, '../public/games.xml');
  const jsonPath = path.join(__dirname, '../public/games.json');
  
  if (!fs.existsSync(xmlPath)) {
    console.error('Error: games.xml not found at', xmlPath);
    process.exit(1);
  }
  
  console.log('Reading XML file...');
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  
  console.log('Parsing games...');
  const games = parseGamesXml(xmlContent);
  
  console.log(`Found ${games.length} games`);
  
  // Create catalog
  const catalog = {
    games,
    total: games.length,
    generatedAt: Date.now(),
    version: 1
  };
  
  console.log('Writing JSON file...');
  fs.writeFileSync(jsonPath, JSON.stringify(catalog), 'utf8');
  
  const xmlSize = fs.statSync(xmlPath).size;
  const jsonSize = fs.statSync(jsonPath).size;
  
  console.log('\n✅ Done!');
  console.log(`XML size: ${(xmlSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`JSON size: ${(jsonSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Reduction: ${(((xmlSize - jsonSize) / xmlSize) * 100).toFixed(1)}%`);
  console.log(`Total games: ${games.length}`);
}

main().catch(console.error);
