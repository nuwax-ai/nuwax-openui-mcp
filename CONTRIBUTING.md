# Contributing

Thank you for contributing to Nuwax OpenUI MCP.

1. Fork the repository and create a focused branch.
2. Install dependencies with `pnpm install`.
3. Add tests for behavior changes.
4. Run `pnpm verify`.
5. Open a pull request describing the contract or runtime impact.

Contract changes must remain backward-compatible or introduce a new explicit
`schemaVersion`. Security checks must not be relaxed without a threat-model
update in the pull request.
