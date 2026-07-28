import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { isVersionRequest } from './cli.js';
import { OPENUI_MCP_VERSION, resolveOpenUiMcpVersion } from './version.js';

describe('isVersionRequest', () => {
  it('识别 --version / -V / version', () => {
    expect(isVersionRequest(['--version'])).toBe(true);
    expect(isVersionRequest(['-V'])).toBe(true);
    expect(isVersionRequest(['version'])).toBe(true);
    expect(isVersionRequest(['--help', '--version'])).toBe(true);
  });

  it('忽略无关参数与大小写变体', () => {
    expect(isVersionRequest([])).toBe(false);
    expect(isVersionRequest(['--help'])).toBe(false);
    expect(isVersionRequest(['--Version'])).toBe(false);
    expect(isVersionRequest(['-v'])).toBe(false);
  });
});

describe('OPENUI_MCP_VERSION', () => {
  it('与根目录 package.json.version 一致', () => {
    const rootPkg = JSON.parse(
      readFileSync(
        join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'),
        'utf8',
      ),
    ) as { version: string };

    expect(OPENUI_MCP_VERSION).toBe(rootPkg.version);
    expect(resolveOpenUiMcpVersion()).toBe(rootPkg.version);
  });
});
