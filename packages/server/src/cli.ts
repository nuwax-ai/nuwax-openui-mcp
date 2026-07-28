/**
 * 判断 CLI 参数是否为「仅查询版本」请求。
 * 支持：`--version`、`-V`、`version`（与常见 Node CLI 习惯一致）。
 *
 * @param args - 通常传入 `process.argv.slice(2)`
 * @returns 命中版本查询标志时为 true
 */
export function isVersionRequest(args: readonly string[]): boolean {
  return args.some(
    (arg) => arg === '--version' || arg === '-V' || arg === 'version',
  );
}
