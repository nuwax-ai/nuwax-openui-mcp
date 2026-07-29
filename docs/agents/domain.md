# Domain Docs

How engineering skills should consume this repository's domain documentation.

## Related project

The associated Nuwax Host (consumer of the published MCP Server and frozen OpenUI
Runtime packages) lives at:

https://github.com/nuwax-ai/nuwax

Inspect that repository when reviewing package integration, artifact loading,
Runtime synchronization, or Host protocol compatibility. Prefer GitHub (clone /
`gh` / remote fetch) over any local workspace path—do not hard-code machine-local
directories such as `/Users/.../nuwax`.

## Before exploring

- Read `CONTEXT.md` at this repository's root when it exists.
- Read relevant decisions under `docs/adr/` when they exist.
- For Host integration work, also read applicable documentation and code in
  https://github.com/nuwax-ai/nuwax.

If these files do not exist, proceed without requiring them to be created.

## File structure

This is a single-context repository:

```text
/
├── CONTEXT.md
├── docs/adr/
└── packages/
    ├── server/
    └── runtime/
```

## Use the glossary's vocabulary

When output names a domain concept, use the term defined in `CONTEXT.md`.
Avoid introducing synonyms for concepts the glossary already defines.

## Flag ADR conflicts

If a recommendation contradicts an existing ADR, identify the conflict
explicitly rather than silently overriding the decision.
