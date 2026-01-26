---
"@fruster/runner": patch
---

Fix fruster-runner --build to properly strip TypeScript type annotations. The build output now generates valid JavaScript that can be executed by Node.js without syntax errors.
