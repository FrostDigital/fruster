# Fruster mono repo

Fruster is framework to build node.js micro services.

## Get started

This repo uses `lerna` as tool to link, publish, etc modules.

Link all modules:

```
npx lerna@4 bootstrap
```

Run tests:

```
npx lerna@4 run test
```

## Release & Publishing

This repository uses automated changelog generation with [Conventional Commits](https://www.conventionalcommits.org/).

### Commit Message Format

Follow these conventions for your commit messages:

- `feat: description` - New features
- `fix: description` - Bug fixes
- `docs: description` - Documentation changes
- `chore: description` - Maintenance tasks
- `refactor: description` - Code refactoring
- `test: description` - Test changes
- `perf: description` - Performance improvements

**Breaking changes:** Add `BREAKING CHANGE:` in commit body for major version bumps.

### Publishing Stable Releases

```bash
# 1. Version bump (generates changelog automatically)
npx lerna@4 version [patch|minor|major]

# 2. Publish to npm
npx lerna@4 publish from-git
```

The `version` command automatically:
- Generates/updates `CHANGELOG.md`
- Commits the changes
- Creates a version tag

The `publish` command automatically:
- Publishes all packages to npm
- Pushes tags to GitHub

### Publishing Pre-releases

For alpha, beta, or RC versions:

```bash
# Create pre-release
npx lerna@4 version prerelease
# or
npx lerna@4 version preminor --preid=alpha

# Publish with dist-tag
npx lerna@4 publish from-git --dist-tag next
```

**Pre-release commands:**
- `prerelease` - Bump pre-release (1.2.0-alpha.0 → 1.2.0-alpha.1)
- `prepatch --preid=alpha` - 1.2.0 → 1.2.1-alpha.0
- `preminor --preid=alpha` - 1.2.0 → 1.3.0-alpha.0
- `premajor --preid=alpha` - 1.2.0 → 2.0.0-alpha.0

**Graduate to stable:**

```bash
npx lerna@4 version patch  # Removes pre-release suffix
npx lerna@4 publish from-git
```

### Manual Changelog Operations

```bash
# Generate changelog for new commits
npm run changelog

# Regenerate complete changelog
npm run changelog:first
```
