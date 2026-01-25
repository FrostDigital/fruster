---
"@fruster/ts-transformer": patch
"@fruster/runner": patch
---

fix: TypeScript 5.9 compatibility for decorator transformation

Fixed TypeScript transformer to work correctly with TypeScript 5.9's decorator API changes. The transformer now properly detects and transforms @subscribe decorators using ts.getDecorators() API and manual AST iteration.

Updated fruster-runner to transform source files individually before emit to ensure decorators are properly preserved in the AST during transformation.

All packages now use consistent TypeScript ^5.9.0 version to avoid compatibility issues.
