# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Fruster is a framework for building Node.js microservices with NATS message bus integration. This is a pnpm workspace monorepo containing multiple packages that work together to provide a complete microservice framework.

## Repository Structure

This is a pnpm workspace monorepo with the following key packages in `packages/`:

- **@fruster/bus** - Core NATS message bus client with request/response patterns, publish/subscribe, JSON schema validation, and metadata handling
- **@fruster/decorators** - TypeScript decorators (`@injectable`, `@subscribe`, `@inject`) for dependency injection and message handling
- **@fruster/runner** - CLI tool (`fruster-runner`) that runs services with TypeScript transformation support
- **@fruster/ts-transformer** - TypeScript compiler plugin that generates JSON schemas from TypeScript interfaces at build time
- **@fruster/log** - Winston-based logging utility for microservices
- **@fruster/health** - Health check functionality for services
- **@fruster/test-utils** - Testing utilities including NATS server control and MongoDB helpers
- **demo-app** - Example application demonstrating the framework usage

## Commands

### Setup and Installation
```bash
# Install pnpm (via corepack, built into Node.js)
corepack enable
corepack prepare pnpm@10.27.0 --activate

# Install dependencies for all packages
# Note: This automatically builds all packages via postinstall hook
pnpm install
# or
pnpm run setup

# Clean install (removes all node_modules and reinstalls)
pnpm run setup:clean
```

**Important:** `pnpm install` automatically runs `pnpm run build` via a postinstall hook. This ensures all packages are built in topological (dependency) order. Packages like `@fruster/runner` and `demo-app` require dependencies to be built first since they import from `dist/` directories.

### Testing
```bash
# Run tests for all packages
pnpm test

# Run tests only for packages changed since last commit
pnpm test:changed

# Run tests in a specific package
cd packages/bus && pnpm test

# Run tests in watch mode (in packages that support it)
cd packages/demo-app && pnpm run test:watch
```

### Building
```bash
# Build all packages in topological (dependency) order
# pnpm automatically builds: bus, decorators, ts-transformer, log first
# Then: test-utils, health, runner
# Finally: demo-app
pnpm run build

# Build only packages changed since last commit
pnpm run build:changed

# Build a specific package
cd packages/bus && pnpm run build

# Watch and rebuild packages automatically
pnpm run watch

# Clean build artifacts
pnpm run clean

# Clean everything (node_modules + build artifacts)
pnpm run clean:all
```

**Build Order:** pnpm's `-r` (recursive) flag automatically handles topological sorting. Core packages without internal dependencies build first, followed by packages that depend on them. This ensures `@fruster/runner` can import from `@fruster/ts-transformer/dist/`, and `demo-app` has all dependencies built.

### Running the Demo App
```bash
# Start NATS server (required)
docker run --name nats --network nats --rm -p 4222:4222

# Run demo app in development mode (auto-restart)
cd packages/demo-app && pnpm run dev

# Run demo app normally
cd packages/demo-app && pnpm start

# Build and run demo app
cd packages/demo-app && pnpm run build && pnpm run start:dist
```

### Development
```bash
# Run fruster-runner (the CLI tool for starting services)
fruster-runner ./app.ts

# Build a service using fruster-runner
fruster-runner ./app.ts --build
```

### Auditing
```bash
# Audit high severity vulnerabilities across all packages
pnpm run audit:high
```

## Architecture

### Message Bus Architecture

The framework is built around NATS as a message bus. Services communicate through:

1. **Request/Response Pattern** (`FrusterRequest`/`FrusterResponse`) - Synchronous-style communication where one service requests data from another
2. **Publish/Subscribe Pattern** - Asynchronous event broadcasting
3. **Subject-based Routing** - Messages are routed using NATS subjects (e.g., `demo-service.get-car`, `http.get.car`)

### Service Structure

Services follow this pattern:

1. **Handler Classes** - Decorated with `@injectable()`, contain business logic
2. **Handler Methods** - Decorated with `@subscribe({ subject: "..." })` to listen for messages
3. **TypeScript Interfaces** - Define request/response types with JSDoc annotations for schema generation
4. **Entry Point** - `app.ts` that connects to bus, starts service, and initializes health checks

### TypeScript Transformation Pipeline

The `@fruster/ts-transformer` package is critical to the framework:

- It's a TypeScript compiler plugin that runs during compilation
- Scans handler files for `@subscribe` decorators
- Extracts TypeScript interfaces for request/response types
- Generates JSON schemas from these interfaces using JSDoc annotations
- These schemas are used at runtime for request/response validation

Key JSDoc annotations for schema generation:
- `@TJS-type` - Override inferred type
- `@TJS-format` - Specify format (e.g., `uuid`, `email`, `date-time`)
- Standard JSDoc comments become schema descriptions

### Decorator Pattern

The `@fruster/decorators` package provides:

- `@injectable()` - Marks a class as injectable, automatically registers subscriptions
- `@subscribe(options)` - Marks a method as a message handler
- `@inject()` - Injects dependencies into class properties
- `injections(obj)` - Registers classes/objects for injection

### Test Architecture

Testing utilities in `@fruster/test-utils`:

- **NATS Server Control** - Programmatically start/stop NATS for tests
- **MongoDB Helpers** - Utilities for testing with MongoDB
- **Test Bus** - Special bus instance with test-friendly APIs
- Tests use Jasmine as the test framework

## Development Workflow

### Adding a New Handler

1. Create a TypeScript interface for your request with JSDoc annotations
2. Create a handler class decorated with `@injectable()`
3. Add a method decorated with `@subscribe({ subject: "your.subject" })`
4. The method should accept `FrusterRequest<YourRequestType>` and return `FrusterResponse<YourResponseType>`
5. Register the handler in your service's startup

### Working with Schemas

- Schemas are generated at build/runtime from TypeScript interfaces
- Use JSDoc annotations to control schema generation
- Schemas are stored in the `schemasDir` specified in connect options
- The bus validates requests/responses against these schemas automatically

### Publishing Packages

Packages use Changesets for versioning/publishing and are scoped to `@fruster/*`.

**Automated Changelog Generation:**

This repository uses [Changesets](https://github.com/changesets/changesets) to manage versioning and changelog generation. The team follows [Conventional Commits](https://www.conventionalcommits.org/) format for commit messages.

**Publishing Workflow:**

```bash
# 1. Create a changeset (during development, in your PR)
pnpm changeset
# This interactive CLI will:
# - Ask which packages have changed
# - Ask whether changes are major, minor, or patch
# - Request a description of the changes

# 2. Version bump (maintainers only, on main branch)
pnpm run version-packages
# This runs 'changeset version' which:
# - Updates package.json versions
# - Generates/updates CHANGELOG.md files
# - Updates workspace dependencies automatically
# - Removes processed changeset files

# 3. Commit version changes
git add .
git commit -m "chore: version packages"
git push

# 4. Publish to npm (maintainers only)
pnpm run release
# This runs 'pnpm run build && changeset publish' which:
# - Builds all packages
# - Publishes packages to npm
# - Creates git tags
```

**Automatic Dependency Bumping:**

When a package is updated, Changesets automatically bumps all dependent packages:
- If `@fruster/bus` gets a patch bump, all packages depending on it also get a patch bump
- Dependencies in package.json are automatically updated to the new versions
- This ensures the monorepo stays in sync

**Commit Message Format:**

Follow Conventional Commits format for proper changelog generation:

- `feat: description` - New features (appears in changelog)
- `fix: description` - Bug fixes (appears in changelog)
- `docs: description` - Documentation changes
- `chore: description` - Maintenance tasks
- `refactor: description` - Code refactoring
- `test: description` - Test changes
- `style: description` - Code style changes
- `perf: description` - Performance improvements

**Breaking Changes:**

When creating a changeset for breaking changes, select "major" as the bump type:

```bash
pnpm changeset
# Select packages
# Choose "major" for breaking changes
# Describe the breaking change in detail
```

**Pre-release Workflow:**

For alpha, beta, or release candidate versions:

```bash
# 1. Create changesets as normal during development
pnpm changeset

# 2. Enter pre-release mode
pnpm changeset pre enter alpha
# This puts the monorepo in pre-release mode
# The pre-release identifier (alpha/beta/rc) becomes the npm dist-tag

# 3. Version packages
pnpm run version-packages
# Versions will be like: 1.3.0-alpha.0

# 4. Commit version changes
git add .
git commit -m "chore: version packages (alpha)"
git push

# 5. Build and publish packages
pnpm run build
pnpm publish -r --tag alpha --no-git-checks
# IMPORTANT: Use 'pnpm publish -r' instead of 'changeset publish'
# This ensures workspace:* dependencies are converted to actual versions
# Users install with: pnpm add @fruster/bus@alpha

# 6. For subsequent alpha releases, create new changesets and repeat steps 3-5
# Versions will increment automatically (alpha.1, alpha.2, etc.)

# 7. Exit pre-release mode when ready for stable release
pnpm changeset pre exit
pnpm run version-packages  # Creates stable versions
git add .
git commit -m "chore: version packages"
git push
pnpm run build
pnpm publish -r --no-git-checks  # Publishes as latest
```

**Common pre-release identifiers:** `alpha`, `beta`, `rc` (release candidate)

**Important Notes:**
- When in pre-release mode, Changesets automatically uses the pre-release identifier as the npm dist-tag
- Always use `pnpm publish -r` instead of `changeset publish` to ensure proper workspace protocol conversion
- The `--no-git-checks` flag allows publishing without git tags (useful for alpha releases)

All packages have `"publishConfig": { "access": "public" }` for npm registry.

**Workspace Protocol:**

During development, packages use `workspace:*` for internal dependencies:
```json
{
  "dependencies": {
    "@fruster/bus": "workspace:*"
  }
}
```

During publish, Changesets automatically converts these to actual version numbers (e.g., `^1.2.0`).

## Key Files and Patterns

### Handler Pattern Example
See `packages/demo-app/lib/handlers/GetCarHandler.ts` for a complete example of:
- Class with `@injectable()` decorator
- Methods with `@subscribe()` decorator
- TypeScript interfaces with JSDoc for schema generation
- Typed `FrusterRequest`/`FrusterResponse` usage

### Service Entry Point Pattern
See `packages/demo-app/app.ts` for the standard service startup pattern:
1. Connect to bus with config
2. Start service logic
3. Initialize health checks
4. Handle startup errors with exit code 1

### Bus Connection
The bus is typically imported as a singleton: `import bus from "@fruster/bus"`
Connect with: `await bus.connect(options)` where options include NATS URLs and schema directory.

## TypeScript Configuration

- All packages use TypeScript 5.4.5
- Packages compile to `dist/` directories
- Source is in `lib/` (for bus) or `src/` (for ts-transformer) or root (for others)
- Tests are in `spec/` directories using Jasmine

## Specialized Agent

This repository includes a specialized Fruster Developer agent at `.claude/agents/fruster-developer.md`. Use this agent when:
- Building new Fruster microservices
- Creating message handlers with decorators
- Implementing service clients for inter-service communication
- Working with NATS message bus patterns
- Writing tests for Fruster services

The agent has deep knowledge of Fruster patterns, conventions, and best practices.

## Notes

- The `fruster-runner` CLI is the recommended way to run services (handles TypeScript transformation)
- NATS must be running for services to function (default: `nats://localhost:4222`)
- The framework expects services to follow the handler/decorator pattern for proper schema generation
- Coverage requirements: @fruster/bus requires 90% line coverage (nyc configuration)
- Service clients should be thin API wrappers with zero business logic
- Always use service subjects (e.g., `user-service.get-user`), NOT HTTP subjects (`http.*`) in service clients
