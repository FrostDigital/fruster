---
"@fruster/bus": patch
"@fruster/decorators": patch
"@fruster/health": patch
"@fruster/log": patch
"@fruster/runner": patch
"@fruster/test-utils": patch
"@fruster/ts-transformer": patch
---

Migrate monorepo from Lerna to pnpm workspaces with Changesets

This migration brings:
- Faster dependency installation with pnpm's content-addressable storage
- Better disk efficiency through hard-linked packages
- Automatic dependency bumping when internal packages change
- Modern tooling with active development and maintenance
- Improved developer experience with workspace protocol support
