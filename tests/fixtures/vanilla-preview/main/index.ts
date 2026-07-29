import { app } from 'electron';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
const marker = join(__dirname, "../preview-marker.json");
writeFileSync(marker, JSON.stringify({ pid: process.pid, args: process.argv.slice(1) }, null, 2));
app.whenReady().then(() => app.quit());
