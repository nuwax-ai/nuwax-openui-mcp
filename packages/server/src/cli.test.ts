import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { isVersionRequest } from './cli.js';
import {
  OPENUI_MCP_VERSION,
  OPENUI_MCP_VERSION_SUFFIX,
  OPENUI_TOOL_VERSION_SUFFIX_ENV,
  isOpenUiToolVersionSuffixEnabled,
  resolveOpenUiMcpVersion,
  resolveOpenUiMcpVersionSuffix,
} from './version.js';
import {
  OPENUI_REFERENCE_TOOL_BASE_NAME,
  OPENUI_RENDER_TOOL_BASE_NAME,
  OPENUI_UPDATE_GUIDE_TOOL_BASE_NAME,
} from './contracts.js';
import {
  OPENUI_REFERENCE_TOOL_NAME,
  OPENUI_TOOL_NAME,
  OPENUI_UPDATE_GUIDE_TOOL_NAME,
} from './tool-names.js';

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

describe('NUWAX_OPENUI_TOOL_VERSION_SUFFIX', () => {
  it('默认关闭：后缀为空，工具名等于基名', () => {
    expect(isOpenUiToolVersionSuffixEnabled({})).toBe(false);
    expect(
      isOpenUiToolVersionSuffixEnabled({
        [OPENUI_TOOL_VERSION_SUFFIX_ENV]: '',
      }),
    ).toBe(false);
    expect(
      isOpenUiToolVersionSuffixEnabled({
        [OPENUI_TOOL_VERSION_SUFFIX_ENV]: '0',
      }),
    ).toBe(false);
    expect(resolveOpenUiMcpVersionSuffix('0.3.12', {})).toBe('');
    // 进程级常量：未开开关时为空（本仓测试默认不设该 env）
    expect(OPENUI_MCP_VERSION_SUFFIX).toBe('');
    expect(OPENUI_TOOL_NAME).toBe(OPENUI_RENDER_TOOL_BASE_NAME);
    expect(OPENUI_REFERENCE_TOOL_NAME).toBe(OPENUI_REFERENCE_TOOL_BASE_NAME);
    expect(OPENUI_UPDATE_GUIDE_TOOL_NAME).toBe(
      OPENUI_UPDATE_GUIDE_TOOL_BASE_NAME,
    );
  });

  it('开启时（1/true/yes/on）追加 _v 后缀', () => {
    for (const value of ['1', 'true', 'YES', ' On ']) {
      expect(
        isOpenUiToolVersionSuffixEnabled({
          [OPENUI_TOOL_VERSION_SUFFIX_ENV]: value,
        }),
      ).toBe(true);
    }
    expect(
      resolveOpenUiMcpVersionSuffix('0.3.12', {
        [OPENUI_TOOL_VERSION_SUFFIX_ENV]: '1',
      }),
    ).toBe('_v0_3_12');
  });
});
