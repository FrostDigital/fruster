---
"@fruster/test-utils": minor
"@fruster/bus": patch
---

Add MongoDB support with dynamic imports and zero dependencies.

Add graceful NATS server detection and error handling:
- New `isNatsServerAvailable()` function to detect NATS server binary
- New `skipIfNatsNotAvailable()` helper for graceful test skipping
- Enhanced error messages with installation instructions
- Tests skip gracefully with warnings when NATS not installed
- Fix ts-node spawn path in monorepo structure
- Comprehensive NATS installation documentation
