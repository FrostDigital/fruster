---
"@fruster/test-utils": patch
---

Add thread-safe database cleanup helpers for test isolation

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
