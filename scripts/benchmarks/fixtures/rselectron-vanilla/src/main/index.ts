import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const markerPath = join(__dirname, '..', 'launch-marker.txt');
writeFileSync(markerPath, `pid=${String(process.pid)}\n`);
setInterval(() => {}, 1 << 30);
