// One small, attributed demo-area mosaic. Never run this as a bulk tile downloader.
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const zoom = 15, n = 2 ** zoom;
const tileX = lon => Math.floor((lon + 180) / 360 * n);
const tileY = lat => Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n);
const minX = tileX(126.302), maxX = tileX(126.331);
const minY = tileY(33.469), maxY = tileY(33.448);
function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'GilttaraContestPrototype/1.0 (one-time demo map; github.com/jinaneun-gil/car-location-curator)' } }, response => {
      if (response.statusCode !== 200) { response.resume(); reject(new Error(`Tile HTTP ${response.statusCode}`)); return; }
      const chunks = []; response.on('data', c => chunks.push(c)); response.on('end', () => resolve(Buffer.concat(chunks))); response.on('error', reject);
    }).on('error', reject);
  });
}
(async () => {
  const folder = path.join(__dirname, '../prototype/assets');
  fs.mkdirSync(folder, { recursive: true });
  const tiles = [];
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const input = await download(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`);
    tiles.push({ input, left: (x - minX) * 256, top: (y - minY) * 256 });
  }
  const width = (maxX - minX + 1) * 256, height = (maxY - minY + 1) * 256;
  await sharp({ create: { width, height, channels: 3, background: '#e9e7de' } }).composite(tiles).png().toFile(path.join(folder, 'aewol-map.png'));
  fs.writeFileSync(path.join(folder, 'map-config.json'), JSON.stringify({ zoom, tileX: minX, tileY: minY, width, height, attribution: '© OpenStreetMap contributors', source: 'https://www.openstreetmap.org/copyright' }, null, 2) + '\n');
  console.log(`Saved ${tiles.length} tiles, ${width}×${height}`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
