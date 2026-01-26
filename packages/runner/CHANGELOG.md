# @fruster/runner

## 1.3.0-alpha.5

### Patch Changes

- @fruster/log@1.3.0-alpha.5
- @fruster/bus@1.3.0-alpha.5
- @fruster/ts-transformer@1.3.0-alpha.5

## 1.3.0-alpha.4

### Patch Changes

- @fruster/log@1.3.0-alpha.4
- @fruster/bus@1.3.0-alpha.4
- @fruster/ts-transformer@1.3.0-alpha.4

## 1.3.0-alpha.3

### Patch Changes

- @fruster/log@1.3.0-alpha.3
- @fruster/bus@1.3.0-alpha.3
- @fruster/ts-transformer@1.3.0-alpha.3

## 1.3.0-alpha.2

### Patch Changes

- @fruster/log@1.3.0-alpha.2
- @fruster/bus@1.3.0-alpha.2
- @fruster/ts-transformer@1.3.0-alpha.2

## 1.3.0-alpha.1

### Patch Changes

- fix: correct workspace dependency resolution in published packages

  Fixed an issue where workspace:\* dependencies were being resolved to incorrect versions during publish. All @fruster packages now correctly depend on matching alpha versions.

- Updated dependencies
  - @fruster/bus@1.3.0-alpha.1
  - @fruster/log@1.3.0-alpha.1
  - @fruster/ts-transformer@1.3.0-alpha.1

## 1.2.1-alpha.0

### Patch Changes

- d2b2111: fix: TypeScript 5.9 compatibility for decorator transformation

  Fixed TypeScript transformer to work correctly with TypeScript 5.9's decorator API changes. The transformer now properly detects and transforms @subscribe decorators using ts.getDecorators() API and manual AST iteration.

  Updated fruster-runner to transform source files individually before emit to ensure decorators are properly preserved in the AST during transformation.

  All packages now use consistent TypeScript ^5.9.0 version to avoid compatibility issues.

- Updated dependencies [d2b2111]
  - @fruster/ts-transformer@1.2.1-alpha.0

## 1.2.0

### Minor Changes

- e87a82f: Add support for filtering Jasmine specs via command-line arguments

  The fruster-runner now preserves command-line arguments after the entry file, allowing jasmine-runner to receive and forward spec filters to Jasmine's execute() method.

  Usage examples:

  - Run specific spec file: `fruster-runner ./spec/support/jasmine-runner.ts spec/CarHandler.spec.ts`
  - Filter by spec name: `fruster-runner ./spec/support/jasmine-runner.ts --filter="should get car"`
  - Use regex patterns: `fruster-runner ./spec/support/jasmine-runner.ts --filter="should get car$"`
  - Combine both: `fruster-runner ./spec/support/jasmine-runner.ts spec/MyHandler.spec.ts --filter="specific test"`

### Patch Changes

- cf465a5: Fix workspace protocol in published packages
- 824a007: Migrate monorepo from Lerna to pnpm workspaces with Changesets

  This migration brings:

  - Faster dependency installation with pnpm's content-addressable storage
  - Better disk efficiency through hard-linked packages
  - Automatic dependency bumping when internal packages change
  - Modern tooling with active development and maintenance
  - Improved developer experience with workspace protocol support

- Updated dependencies [cf465a5]
- Updated dependencies [824a007]
- Updated dependencies
  - @fruster/bus@1.2.0
  - @fruster/log@1.2.0
  - @fruster/ts-transformer@1.2.0

## 1.2.0-alpha.4

### Patch Changes

- Updated dependencies
  - @fruster/ts-transformer@1.2.0-alpha.3
  - @fruster/log@1.2.0-alpha.3

## 1.2.0-alpha.3

### Patch Changes

- Fix workspace protocol in published packages
- Updated dependencies
  - @fruster/bus@1.2.0-alpha.2
  - @fruster/log@1.2.0-alpha.3
  - @fruster/ts-transformer@1.2.0-alpha.2

## 1.2.0-alpha.2

### Minor Changes

- e87a82f: Add support for filtering Jasmine specs via command-line arguments

  The fruster-runner now preserves command-line arguments after the entry file, allowing jasmine-runner to receive and forward spec filters to Jasmine's execute() method.

  Usage examples:

  - Run specific spec file: `fruster-runner ./spec/support/jasmine-runner.ts spec/CarHandler.spec.ts`
  - Filter by spec name: `fruster-runner ./spec/support/jasmine-runner.ts --filter="should get car"`
  - Use regex patterns: `fruster-runner ./spec/support/jasmine-runner.ts --filter="should get car$"`
  - Combine both: `fruster-runner ./spec/support/jasmine-runner.ts spec/MyHandler.spec.ts --filter="specific test"`

### Patch Changes

- 824a007: Migrate monorepo from Lerna to pnpm workspaces with Changesets

  This migration brings:

  - Faster dependency installation with pnpm's content-addressable storage
  - Better disk efficiency through hard-linked packages
  - Automatic dependency bumping when internal packages change
  - Modern tooling with active development and maintenance
  - Improved developer experience with workspace protocol support

- Updated dependencies [824a007]
  - @fruster/bus@1.2.0-alpha.1
  - @fruster/log@1.2.0-alpha.2
  - @fruster/ts-transformer@1.2.0-alpha.1
