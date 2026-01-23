---
"@fruster/runner": minor
"@fruster/test-utils": patch
---

Add support for filtering Jasmine specs via command-line arguments

The fruster-runner now preserves command-line arguments after the entry file, allowing jasmine-runner to receive and forward spec filters to Jasmine's execute() method.

Usage examples:
- Run specific spec file: `fruster-runner ./spec/support/jasmine-runner.ts spec/CarHandler.spec.ts`
- Filter by spec name: `fruster-runner ./spec/support/jasmine-runner.ts --filter="should get car"`
- Use regex patterns: `fruster-runner ./spec/support/jasmine-runner.ts --filter="should get car$"`
- Combine both: `fruster-runner ./spec/support/jasmine-runner.ts spec/MyHandler.spec.ts --filter="specific test"`
