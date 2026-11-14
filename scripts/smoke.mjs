// Plain JavaScript smoke test of the built packages, for Node versions that cannot run the TypeScript tests.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { concrete, roofPitch } from '../packages/core/dist/index.js';

assert.equal(roofPitch({ riseIn: 6, runIn: 12 }).risePer12, 6);
assert.equal(concrete({ shape: 'slab', lengthFt: 10, widthFt: 6, depthIn: 4, bagYieldCuFt: 0.6 }).bags, 34);

const child = spawn(process.execPath, ['packages/mcp/dist/cli.js'], { stdio: ['pipe', 'pipe', 'inherit'] });
const reply = new Promise((resolve, reject) => {
  let buf = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (c) => {
    buf += c;
    for (const line of buf.split('\n').slice(0, -1)) { const m = JSON.parse(line); if (m.id === 2) resolve(m); }
  });
  setTimeout(() => reject(new Error('MCP server did not answer within 10 s')), 10000);
});
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } } }) + '\n');
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n');
try {
  const list = await reply;
  assert.equal(list.result.tools.length, 11);
  console.log(`smoke ok on Node ${process.version}`);
} finally { child.kill(); }
