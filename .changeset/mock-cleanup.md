---
"@fruster/test-utils": patch
---

Add mock subscription cleanup helper

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
    response: { data: { id: 1 } }
  });
});

it("test 2", () => {
  // Previous mock is cleaned up, can reuse subject
  const mock = helpers.mockService({
    subject: "user-service.get-user",
    response: { data: { id: 2 } }
  });
});
```
