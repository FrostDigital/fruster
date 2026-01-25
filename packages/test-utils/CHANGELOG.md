# @fruster/test-utils

## 1.3.0-alpha.3

### Patch Changes

- 81d7835: Add mock subscription cleanup helper

  Added `unsubscribeMocksBeforeEach()` to automatically clean up mock services between tests when using `startBeforeAll()`.

  **New Features:**

  - `testHelpers.unsubscribeMocksBeforeEach()` - Auto-unsubscribe all tracked mocks before each test
  - `testHelpers.mockService()` - Create and track mocks for automatic cleanup
  - Prevents test pollution from lingering mock subscriptions
  - Allows reusing the same subject across different tests

  **Usage:**

  ```typescript
  const helpers = testUtils.startBeforeAll({ bus, mockNats: true });
  helpers.unsubscribeMocksBeforeEach();

  it("test 1", () => {
    const mock = helpers.mockService({
      subject: "user-service.get-user",
      response: { data: { id: 1 } },
    });
  });

  it("test 2", () => {
    // Previous mock is cleaned up, can reuse subject
    const mock = helpers.mockService({
      subject: "user-service.get-user",
      response: { data: { id: 2 } },
    });
  });
  ```

  - @fruster/bus@1.3.0-alpha.3

## 1.3.0-alpha.2

### Patch Changes

- 9ea30ab: Add thread-safe database cleanup helpers for test isolation

  Added new cleanup helper methods that work with `startBeforeAll()` to enable database cleanup between tests without restarting the service:

  - `dropCollectionsBeforeEach()` - Drops all collections (recommended, faster)
  - `dropDatabaseBeforeEach()` - Drops entire database
  - `cleanupBeforeEach()` - Custom cleanup logic

  **Breaking Change:** Removed `dropDatabase` option from `FrusterTestUtilsOptions`. Use cleanup helpers instead.

  **Migration:**

  ```typescript
  // Before
  testUtils.startBeforeAll({ useInMemoryMongo: true, dropDatabase: true });

  // After
  const helpers = testUtils.startBeforeAll({ useInMemoryMongo: true });
  helpers.dropCollectionsBeforeEach();
  ```

  - @fruster/bus@1.3.0-alpha.2

## 1.3.0-alpha.1

### Patch Changes

- fix: correct workspace dependency resolution in published packages

  Fixed an issue where workspace:\* dependencies were being resolved to incorrect versions during publish. All @fruster packages now correctly depend on matching alpha versions.

- Updated dependencies
  - @fruster/bus@1.3.0-alpha.1

## 1.3.0-alpha.0

### Minor Changes

- Add MongoDB support with dynamic imports and zero dependencies

## 1.2.0

### Minor Changes

- feat: add optional mongodb-memory-server support for in-memory MongoDB testing

  - Add `useInMemoryMongo` option to start an in-memory MongoDB server for testing
  - Add `inMemoryMongoOptions` for configuring the in-memory server (MongoDB version, port, database name, storage engine)
  - Add mongodb-memory-server as optional peer dependency
  - Automatically stop in-memory server when calling `stop()` or `close()`
  - Update README with comprehensive documentation including comparison table, migration guide, and performance tips
  - Add test cases for in-memory MongoDB functionality

- Add MongoDB support with dynamic imports and zero dependencies

  Restore MongoDB support to @fruster/test-utils using dynamic imports with zero hard dependencies on the mongodb package. Key features include duck-typed interfaces, lazy loading, optional mongoUrl parameter, and support for MongoDB driver versions 3.x through 6.x with comprehensive documentation and tests.

### Patch Changes

- cf465a5: Fix workspace protocol in published packages
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

- Updated dependencies [cf465a5]
- Updated dependencies [824a007]
  - @fruster/bus@1.2.0

## 1.2.0-alpha.4

### Minor Changes

- feat: add optional mongodb-memory-server support for in-memory MongoDB testing

  - Add `useInMemoryMongo` option to start an in-memory MongoDB server for testing
  - Add `inMemoryMongoOptions` for configuring the in-memory server (MongoDB version, port, database name, storage engine)
  - Add mongodb-memory-server as optional peer dependency
  - Automatically stop in-memory server when calling `stop()` or `close()`
  - Update README with comprehensive documentation including comparison table, migration guide, and performance tips
  - Add test cases for in-memory MongoDB functionality

- Add MongoDB support with dynamic imports and zero dependencies

  Restore MongoDB support to @fruster/test-utils using dynamic imports with zero hard dependencies on the mongodb package. Key features include duck-typed interfaces, lazy loading, optional mongoUrl parameter, and support for MongoDB driver versions 3.x through 6.x with comprehensive documentation and tests.

## 1.2.0-alpha.3

### Patch Changes

- Fix workspace protocol in published packages
- Updated dependencies
  - @fruster/bus@1.2.0-alpha.2

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
