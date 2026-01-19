# Contributing to Fruster

Thank you for your interest in contributing to Fruster! This guide will help you get started.

## Prerequisites

- Node.js 18+
- pnpm 10+ (will be installed automatically via corepack)
- Git
- NATS server (for running tests)

## Getting Started

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/FrostDigital/fruster.git
cd fruster-mono-repo

# Enable pnpm via corepack (built into Node.js)
corepack enable
corepack prepare pnpm@10.27.0 --activate

# Install dependencies
pnpm install
```

The `pnpm install` command will:
- Install all dependencies for all packages
- Link workspace packages together automatically
- Build packages in the correct dependency order

### Development Workflow

#### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**
   - Edit code in the relevant package(s)
   - Follow existing code style and patterns
   - Add tests for new functionality

3. **Run tests**
   ```bash
   # Test all packages
   pnpm test

   # Test only changed packages
   pnpm test:changed

   # Test a specific package
   cd packages/bus && pnpm test
   ```

4. **Build packages**
   ```bash
   # Build all packages
   pnpm run build

   # Build only changed packages
   pnpm run build:changed

   # Build a specific package
   cd packages/bus && pnpm run build
   ```

#### Development Mode

For active development with auto-rebuild:

```bash
# Watch all packages in parallel
pnpm run watch

# Watch a specific package
cd packages/bus && pnpm run watch
```

#### Cleaning Build Artifacts

```bash
# Clean all packages
pnpm run clean

# Clean all node_modules and build artifacts
pnpm run clean:all
```

### Creating a Changeset

When you make changes that affect published packages, you must create a changeset:

```bash
pnpm changeset
```

This interactive CLI will:
1. Ask which packages have changed
2. Ask whether changes are major, minor, or patch
3. Request a description of the changes

**When to create a changeset:**
- ✅ Adding new features (minor)
- ✅ Fixing bugs (patch)
- ✅ Breaking changes (major)
- ✅ Performance improvements (patch)
- ✅ API changes (minor or major)

**Skip changesets for:**
- ❌ Documentation updates only
- ❌ Fixing typos in comments
- ❌ CI/CD configuration changes
- ❌ Internal refactoring with no behavior change

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Maintenance tasks
- `perf:` - Performance improvements

**Examples:**
```bash
git commit -m "feat: add timeout configuration to bus client"
git commit -m "fix: resolve memory leak in subscription handler"
git commit -m "docs: update API documentation for decorators"
```

**Breaking changes:**
```
feat: redesign bus connection API

BREAKING CHANGE: The connect() method now requires explicit options parameter
```

### Submitting a Pull Request

1. **Push your branch**
   ```bash
   git push origin feat/your-feature-name
   ```

2. **Create a Pull Request** on GitHub
   - Provide a clear title and description
   - Reference any related issues
   - Ensure CI checks pass

3. **PR Requirements:**
   - ✅ All tests pass (`pnpm test`)
   - ✅ Code builds successfully (`pnpm run build`)
   - ✅ Changeset created (if affecting published packages)
   - ✅ Follows Conventional Commits format
   - ✅ Up to date with main branch

## Versioning & Publishing (Maintainers Only)

### Creating a Release

```bash
# 1. Ensure you're on main and up to date
git checkout main
git pull

# 2. Preview changes (optional)
pnpm changeset status

# 3. Bump versions and generate CHANGELOGs
pnpm run version-packages

# This will:
# - Update package.json versions
# - Generate/update CHANGELOG.md files
# - Update workspace dependencies
# - Remove processed changeset files

# 4. Commit the version changes
git add .
git commit -m "chore: version packages"
git push

# 5. Build and publish to npm
pnpm run release

# This will:
# - Build all packages
# - Publish to npm registry
# - Create git tags
```

### Pre-release Workflow

For alpha, beta, or rc versions:

```bash
# Create a pre-release changeset
pnpm changeset --snapshot alpha

# Or manually edit the changeset file to specify pre-release

# Version and publish
pnpm run version-packages
git add . && git commit -m "chore: version pre-release packages"
git push
pnpm run release --tag next
```

## Project Structure

```
fruster-mono-repo/
├── packages/
│   ├── bus/              # Core NATS message bus client
│   ├── decorators/       # TypeScript decorators for DI
│   ├── ts-transformer/   # Schema generation transformer
│   ├── runner/           # CLI tool for running services
│   ├── log/              # Winston-based logging
│   ├── health/           # Health check functionality
│   ├── test-utils/       # Testing utilities
│   └── demo-app/         # Example application (private)
├── pnpm-workspace.yaml   # pnpm workspace configuration
├── .changeset/           # Changeset files
└── package.json          # Root workspace configuration
```

## Build Order & Dependencies

### How pnpm Handles Build Order

pnpm automatically builds packages in **topological order** based on their dependencies:

1. **Core packages build first:**
   - `@fruster/bus` (no internal deps)
   - `@fruster/ts-transformer` (no internal deps)
   - `@fruster/decorators` (no internal deps)
   - `@fruster/log` (no internal deps)

2. **Dependent packages build next:**
   - `@fruster/test-utils` (depends on `@fruster/bus`)
   - `@fruster/health` (depends on `@fruster/bus`, `@fruster/log`)
   - `@fruster/runner` (depends on `@fruster/bus`, `@fruster/log`, `@fruster/ts-transformer`)

3. **Applications build last:**
   - `demo-app` (depends on all packages)

### Automatic Build on Install

The root `package.json` has a `postinstall` hook that automatically runs `pnpm run build` after dependencies are installed. This ensures all packages are built in the correct order without manual intervention.

```bash
# These commands automatically build packages:
pnpm install              # Installs deps + builds all
pnpm run setup            # Same as pnpm install
pnpm run setup:clean      # Clean + install + build
```

### Manual Build Commands

```bash
# Build all packages in topological order
pnpm run build

# Build only packages that changed since last commit
pnpm run build:changed

# Rebuild everything from scratch
pnpm run clean && pnpm run build
```

### Why This Matters

Some packages (like `@fruster/runner` and `demo-app`) import from the built `dist/` directories of other packages. If dependencies aren't built first, you'll see errors like:

```
Error: Cannot find module '@fruster/ts-transformer/dist/...'
```

The `pnpm -r run build` command (used in our build script) ensures packages are built in dependency order, so this happens automatically.

## Testing

### Running Tests

```bash
# All packages
pnpm test

# Specific package
cd packages/bus && pnpm test

# With coverage (for @fruster/bus)
cd packages/bus && pnpm test
```

### Test Requirements

- **@fruster/bus** requires 90% line coverage
- All tests must pass before merging
- Add tests for new functionality
- Update tests when modifying existing code

### Prerequisites for Tests

Some tests require external services:

```bash
# Start NATS server
docker run --name nats --rm -p 4222:4222 nats:latest

# Or install nats-server locally
# Tests in @fruster/test-utils manage NATS programmatically
```

## Architecture

### Workspace Protocol

Packages use `workspace:*` for internal dependencies:

```json
{
  "dependencies": {
    "@fruster/bus": "workspace:*"
  }
}
```

During publish, Changesets automatically converts these to actual version numbers.

### Automatic Dependency Bumping

When a package changes, all dependent packages are automatically bumped:

- `@fruster/bus` (patch) → all dependents get patch bump
- Dependencies in package.json are updated to new versions

### Build Order

pnpm automatically builds packages in topological order based on dependencies.

## Getting Help

- **Issues**: https://github.com/FrostDigital/fruster/issues
- **Documentation**: See CLAUDE.md for detailed architecture info
- **Questions**: Open a GitHub Discussion

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

Thank you for contributing to Fruster! 🚀
