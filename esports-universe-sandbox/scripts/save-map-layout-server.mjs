import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'src/app/shared/sim-v2/version/map-layout.json');
const backup = path.join(root, 'src/app/shared/sim-v2/version/map-layout.backup.json');
const port = Number(process.env.MAP_SAVE_PORT || 8765);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && (req.url === '/save-map-layout' || req.url === '/')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const pretty = `${JSON.stringify(parsed, null, 2)}\n`;
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, pretty);
        fs.writeFileSync(backup, pretty);
        const walk = parsed.paintMask
          ? parsed.paintMask.flat().filter((cell) => cell === 1).length
          : 0;
        const shapes = Array.isArray(parsed.paintShapes) ? parsed.paintShapes.length : 0;
        const lanes = parsed.laneRoads
          ? Object.fromEntries(
              Object.entries(parsed.laneRoads).map(([id, road]) => [
                id,
                Array.isArray(road?.points) ? road.points.length : 0,
              ]),
            )
          : null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, out, walk, shapes, lanes, bytes: pretty.length }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(error) }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('POST /save-map-layout');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`map-layout saver ready on http://127.0.0.1:${port}/save-map-layout`);
  console.log(`writes -> ${out}`);
});
