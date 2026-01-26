---
"@fruster/test-utils": patch
---

Add reuseInMemoryMongo option for faster test execution. Share a single in-memory MongoDB instance across test suites to eliminate start/stop overhead. Requires cleanup helpers (dropCollectionsBeforeEach, dropDatabaseBeforeEach, or cleanupBeforeEach) for test isolation. Includes dynamic port allocation to prevent conflicts and stopSharedMemoryServer() for manual cleanup.
