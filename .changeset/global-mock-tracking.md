---
"@fruster/test-utils": patch
---

Fix mock cleanup helper to use global tracking. Move allMockServices array outside function scope to enable reliable cleanup across all test suites. Add unsubscribeMocks() public function and automatic tracking for all mockService() calls.
