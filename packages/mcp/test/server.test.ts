import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

/** Starts the built CLI over stdio and exchanges newline-delimited JSON-RPC messages. */
function startServer() {
  const child = spawn(process.execPath, [cli], { stdio: ['pipe', 'pipe', 'inherit'] });
  let buffer = '';
  const waiting = new Map<number, (msg: any) => void>();
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    buffer += chunk;
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, i).trim(); buffer = buffer.slice(i + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      if (msg.id !== undefined && waiting.has(msg.id)) { waiting.get(msg.id)!(msg); waiting.delete(msg.id); }
    }
  });
  let id = 0;
  const send = (method: string, params: Record<string, unknown> = {}) => new Promise<any>((resolve) => {
    const n = ++id; waiting.set(n, resolve);
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: n, method, params }) + '\n');
  });
  const notify = (method: string) => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method }) + '\n');
  return { send, notify, close: () => child.kill() };
}

test('stdio server lists eleven read-only tools and returns real results', async () => {
  const s = startServer();
  try {
    const init = await s.send('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
    assert.equal(init.result.serverInfo.name, 'jobsite-math');
    s.notify('notifications/initialized');
    const list = await s.send('tools/list');
    const names = list.result.tools.map((t: any) => t.name).sort();
    assert.deepEqual(names, ['bricks', 'concrete', 'deck_boards', 'drywall', 'gravel', 'hip_roof', 'hourly_rate', 'markup', 'mortar', 'paint', 'roof_pitch']);
    for (const t of list.result.tools) { assert.equal(t.annotations.readOnlyHint, true); assert.equal(t.annotations.openWorldHint, false); }

    const call = (name: string, args: Record<string, unknown>) => s.send('tools/call', { name, arguments: args });
    const pitch = await call('roof_pitch', { riseIn: 6, runIn: 12 });
    assert.equal(pitch.result.structuredContent.risePer12, 6);
    const slab = await call('concrete', { shape: 'slab', lengthFt: 10, widthFt: 6, depthIn: 4, bagYieldCuFt: 0.6 });
    assert.equal(slab.result.structuredContent.cubicFeet, 20); assert.equal(slab.result.structuredContent.bags, 34);
    const room = await call('paint', { surface: { lengthFt: 12, widthFt: 10, heightFt: 8 }, openingsSqFt: 40, coats: 2, coverageSqFtPerGallon: 350 });
    assert.equal(room.result.structuredContent.netAreaSqFt, 312);

    const bad = await call('concrete', { shape: 'slab', lengthFt: 10, depthIn: 4 });
    assert.ok(bad.result?.isError || bad.error); if (bad.result) assert.match(bad.result.content[0].text, /widthFt/);
    const extra = await call('roof_pitch', { riseIn: 6, runIn: 12, email: 'someone@example.invalid' });
    assert.ok(extra.result?.isError || extra.error);
  } finally { s.close(); }
});
