# @fruster/test-utils

## 1.2.0-alpha.2

### Patch Changes

- e87a82f: Add support for filtering Jasmine specs via command-line arguments

  The fruster-runner now preserves command-line arguments after the entry file, allowing jasmine-runner to receive and forward spec filters to Jasmine's execute() method.

  Usage examples:

  - Run specific spec file: `fruster-runner ./spec/support/jasmine-runner.ts spec/CarHandler.spec.ts`
  - Filter by spec name: `fruster-runner ./spec/support/jasmine-runner.ts --filter="should get car"`
  - Use regex patterns: `fruster-runner ./spec/support/jasmine-runner.ts --filter="should get car$"`
  - Combine both: `fruster-runner ./spec/support/jasmine-runner.ts spec/MyHandler.spec.ts --filter="specific test"`

- 824a007: Migrate monorepo from Lerna to pnpm workspaces with Changesets

  This migration brings:

  - Faster dependency installation with pnpm's content-addressable storage
  - Better disk efficiency through hard-linked packages
  - Automatic dependency bumping when internal packages change
  - Modern tooling with active development and maintenance
  - Improved developer experience with workspace protocol support

- Updated dependencies [824a007]
  - @fruster/bus@1.2.0-alpha.1
