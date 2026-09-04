---
"@fruster/bus": patch
"@fruster/decorators": patch
"@fruster/health": patch
"@fruster/log": patch
"@fruster/runner": patch
"@fruster/test-utils": patch
"@fruster/ts-transformer": patch
---

Clear dependency security advisories without code changes: bump `uuid` to `^11.1.1` in all packages (GHSA-w5hq-g745-h8pq backport, last major with CommonJS support), remove the unused `axios` dependency from `@fruster/bus`, raise patched floors for `ajv`, `lodash` and `minimatch`, and refresh the lockfile. Demo app specs now load via `require` so they run on Node 22.18+/24.
