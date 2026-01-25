# @fruster/decorators

## 1.3.0-alpha.2

## 1.3.0-alpha.1

### Patch Changes

- fix: correct workspace dependency resolution in published packages

  Fixed an issue where workspace:\* dependencies were being resolved to incorrect versions during publish. All @fruster packages now correctly depend on matching alpha versions.

## 1.2.0

### Patch Changes

- cf465a5: Fix workspace protocol in published packages
- 824a007: Migrate monorepo from Lerna to pnpm workspaces with Changesets

  This migration brings:

  - Faster dependency installation with pnpm's content-addressable storage
  - Better disk efficiency through hard-linked packages
  - Automatic dependency bumping when internal packages change
  - Modern tooling with active development and maintenance
  - Improved developer experience with workspace protocol support

## 1.2.0-alpha.2

### Patch Changes

- Fix workspace protocol in published packages

## 1.2.0-alpha.1

### Patch Changes

- 824a007: Migrate monorepo from Lerna to pnpm workspaces with Changesets

  This migration brings:

  - Faster dependency installation with pnpm's content-addressable storage
  - Better disk efficiency through hard-linked packages
  - Automatic dependency bumping when internal packages change
  - Modern tooling with active development and maintenance
  - Improved developer experience with workspace protocol support
