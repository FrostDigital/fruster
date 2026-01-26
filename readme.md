# Fruster Monorepo

Fruster is a framework to build Node.js microservices with NATS message bus integration.

## Get Started

This repo uses **pnpm workspaces** with **Changesets** for version management.

### Setup

```bash
# Enable pnpm (built into Node.js via corepack)
corepack enable
corepack prepare pnpm@10.27.0 --activate

# Install dependencies and build all packages
pnpm install
# or
pnpm run setup
```

**Note:** `pnpm install` automatically runs `pnpm run build` via postinstall hook.

### Common Commands

```bash
# Run tests for all packages
pnpm test

# Run tests only for changed packages
pnpm test:changed

# Build all packages
pnpm run build

# Build only changed packages
pnpm run build:changed

# Watch and rebuild automatically
pnpm run watch

# Clean build artifacts
pnpm run clean
```

See [CLAUDE.md](./CLAUDE.md) for detailed documentation.

## Versioning Strategy

This monorepo uses **fixed versioning** - all `@fruster/*` packages are always versioned together. When any package gets a version bump, all packages receive the same version.

**Why fixed versioning?**
- Clear compatibility story: all 1.x packages work together
- Simple mental model: "Fruster 1.3.0" instead of tracking individual package versions
- Follows patterns used by React, Babel, Angular, and other frameworks
- Easy to communicate releases

## Release & Publishing

This repository uses [Changesets](https://github.com/changesets/changesets) with [Conventional Commits](https://www.conventionalcommits.org/).

### Commit Message Format

Follow these conventions for your commit messages:

- `feat: description` - New features (appears in changelog)
- `fix: description` - Bug fixes (appears in changelog)
- `docs: description` - Documentation changes
- `chore: description` - Maintenance tasks
- `refactor: description` - Code refactoring
- `test: description` - Test changes
- `perf: description` - Performance improvements

**Breaking changes:** Add `BREAKING CHANGE:` in commit body for major version bumps.

### Current Release Workflow (Alpha Phase)

We're currently in **pre-release mode** with the `alpha` dist-tag. All development happens on `main` and publishes as alpha releases.

#### 1. Create a Changeset

When making changes that should be released:

```bash
pnpm changeset
```

This interactive CLI will:
- Ask which packages have changed (select any changed package)
- Ask whether changes are major, minor, or patch
- Request a description of the changes

**Note:** Due to fixed versioning, ALL packages will get the same version bump regardless of which packages you select.

#### 2. Version Packages

When ready to release:

```bash
pnpm run version-packages
```

This runs `changeset version` which:
- Updates all package.json versions (e.g., 1.3.0-alpha.0 → 1.3.0-alpha.1)
- Generates/updates CHANGELOG.md files
- Updates workspace dependencies automatically
- Removes processed changeset files

#### 3. Commit Version Changes

```bash
git add .
git commit -m "chore: version packages (alpha)"
git push
```

#### 4. Publish to npm

```bash
# Build all packages first
pnpm run build

# Publish with alpha dist-tag
pnpm publish -r --tag alpha --no-git-checks
```

This publishes all packages to npm with the `alpha` dist-tag. Users can install with:

```bash
pnpm add @fruster/test-utils@alpha
```

### Future: Transitioning to Stable Releases

When ready to publish stable releases (1.x, not alpha), the recommended strategy is:

#### Exit Pre-release Mode

```bash
# Exit alpha mode
pnpm changeset pre exit

# Version packages (creates stable versions like 1.3.0)
pnpm run version-packages

# Commit
git add .
git commit -m "chore: version packages"
git push

# Create release branch for maintaining stable versions
git checkout -b release/1.x
git push -u origin release/1.x

# Build and publish to @latest
pnpm run build
pnpm publish -r --no-git-checks
```

#### Resume Alpha Development

```bash
# Switch back to main
git checkout main

# Re-enter pre-release mode for next alpha
pnpm changeset pre enter alpha

# Continue development
```

#### Release Branch Workflow (Future)

Once stable releases exist:

```
main                    → alpha releases (@alpha tag)
  ├─ active development
  └─ auto-publish alpha on merge

release/1.x            → stable releases (@latest tag)
  ├─ cherry-pick critical fixes from main
  └─ publish stable versions
```

This allows:
- Maintaining stable releases while developing alpha features
- Backporting critical fixes to stable versions
- Clear separation between experimental and production code

### Pre-release Identifiers

Common identifiers used in pre-release mode:
- `alpha` - Early testing, APIs may change
- `beta` - Feature complete, testing for bugs
- `rc` - Release candidate, stable API

### Automatic Dependency Bumping

When a package is updated, Changesets automatically bumps all dependent packages:
- If `@fruster/bus` gets a patch bump, all packages depending on it also get a patch bump
- Dependencies in package.json are automatically updated to the new versions
- This ensures the monorepo stays in sync

### Workspace Protocol

During development, packages use `workspace:*` for internal dependencies:

```json
{
  "dependencies": {
    "@fruster/bus": "workspace:*"
  }
}
```

During publish, Changesets/pnpm automatically converts these to actual version numbers (e.g., `^1.3.0`).

## References

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [React Versioning Policy](https://react.dev/community/versioning-policy)
- [Monorepo Release Strategies](https://github.com/azu/monorepo-release-changesets)
