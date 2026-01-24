# @fruster/health

## 1.2.0-alpha.3

### Patch Changes

- Fix workspace protocol in published packages

## 1.2.0-alpha.2

### Patch Changes

- 824a007: Migrate monorepo from Lerna to pnpm workspaces with Changesets

  This migration brings:

  - Faster dependency installation with pnpm's content-addressable storage
  - Better disk efficiency through hard-linked packages
  - Automatic dependency bumping when internal packages change
  - Modern tooling with active development and maintenance
  - Improved developer experience with workspace protocol support
