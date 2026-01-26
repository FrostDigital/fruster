---
"@fruster/test-utils": patch
"@fruster/bus": patch
"@fruster/decorators": patch
"@fruster/health": patch
"@fruster/log": patch
"@fruster/runner": patch
"@fruster/ts-transformer": patch
---

fix: correct workspace dependency resolution in published packages

Fixed an issue where workspace:* dependencies were being resolved to incorrect versions during publish. All @fruster packages now correctly depend on matching alpha versions.
