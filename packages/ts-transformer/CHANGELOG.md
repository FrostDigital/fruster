# @fruster/ts-transformer

## 1.3.0-alpha.1

### Patch Changes

- fix: correct workspace dependency resolution in published packages

  Fixed an issue where workspace:\* dependencies were being resolved to incorrect versions during publish. All @fruster packages now correctly depend on matching alpha versions.

## 1.2.1-alpha.0

### Patch Changes

- d2b2111: fix: TypeScript 5.9 compatibility for decorator transformation

  Fixed TypeScript transformer to work correctly with TypeScript 5.9's decorator API changes. The transformer now properly detects and transforms @subscribe decorators using ts.getDecorators() API and manual AST iteration.

  Updated fruster-runner to transform source files individually before emit to ensure decorators are properly preserved in the AST during transformation.

  All packages now use consistent TypeScript ^5.9.0 version to avoid compatibility issues.

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

- chore: upgrade TypeScript peer dependency to >=5.9.0 and fix compatibility issues with TypeScript 5.9+ Compiler API

## 1.2.0-alpha.3

### Patch Changes

- chore: upgrade TypeScript peer dependency to >=5.9.0 and fix compatibility issues with TypeScript 5.9+ Compiler API

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
