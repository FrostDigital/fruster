# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Fruster is a framework for building Node.js microservices with NATS message bus integration. This is a Lerna-managed monorepo containing multiple packages that work together to provide a complete microservice framework.

## Repository Structure

This is a Lerna monorepo with the following key packages in `packages/`:

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
# Bootstrap all packages and link dependencies
npx lerna@4 bootstrap

# Install dependencies for all packages
npm run install
```

### Testing
```bash
# Run tests for all packages
npx lerna@4 run test
# or
npm test

# Run tests in a specific package
cd packages/bus && npm test

# Run tests in watch mode (in packages that support it)
npm run test:watch
```

### Building
```bash
# Build all packages
npx lerna@4 run build

# Build a specific package
cd packages/bus && npm run build

# Clean build artifacts
npm run clean
# or
npx lerna@4 run clean
```

### Running the Demo App
```bash
# Start NATS server (required)
docker run --name nats --network nats --rm -p 4222:4222

# Run demo app in development mode (auto-restart)
cd packages/demo-app && npm run dev

# Run demo app normally
cd packages/demo-app && npm start

# Build and run demo app
cd packages/demo-app && npm run build && npm run start:dist
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
npm run audit:high
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

Packages use Lerna for publishing and are scoped to `@fruster/*`.

**Automated Changelog Generation:**

This repository uses [conventional-changelog-cli](https://github.com/conventional-changelog/conventional-changelog) to automatically generate changelogs from git commit history. The team follows [Conventional Commits](https://www.conventionalcommits.org/) format.

**Publishing Workflow:**

```bash
# 1. Version bump (automatically generates changelog)
npx lerna@4 version [major|minor|patch|prerelease]
# This runs the 'version' script which:
# - Generates/updates CHANGELOG.md based on commits since last version
# - Commits the changelog and package.json changes
# - Creates a git tag

# 2. Publish to npm
npx lerna@4 publish from-git
# This publishes all packages with the new version tag
# The 'postpublish' script automatically pushes tags to GitHub
```

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

Include `BREAKING CHANGE:` in the commit body for major version bumps:

```
feat: new API design

BREAKING CHANGE: Old API methods have been removed
```

**Manual Changelog Operations:**

```bash
# Generate changelog for unreleased commits
npm run changelog

# Regenerate entire changelog from git history
npm run changelog:first
```

**Pre-release Workflow:**

For alpha, beta, or release candidate versions:

```bash
# Create a pre-release version
npx lerna@4 version prerelease
# Example: 1.2.0-alpha.0 -> 1.2.0-alpha.1

# Or create pre-release from stable version
npx lerna@4 version preminor --preid=alpha
# Example: 1.2.0 -> 1.3.0-alpha.0

# Publish with dist-tag to prevent auto-install
npx lerna@4 publish from-git --dist-tag next
# Users install with: npm install @fruster/bus@next
```

**Pre-release Version Commands:**

- `prerelease` - Bump pre-release version (1.2.0-alpha.0 → 1.2.0-alpha.1)
- `prepatch --preid=alpha` - 1.2.0 → 1.2.1-alpha.0
- `preminor --preid=alpha` - 1.2.0 → 1.3.0-alpha.0
- `premajor --preid=alpha` - 1.2.0 → 2.0.0-alpha.0

**Common preid values:** `alpha`, `beta`, `rc` (release candidate)

**Graduating Pre-release to Stable:**

```bash
# Bump from pre-release to stable
npx lerna@4 version patch
# Example: 1.2.0-alpha.5 -> 1.2.0

# Publish as latest (default dist-tag)
npx lerna@4 publish from-git
```

All packages have `"publishConfig": { "access": "public" }` for npm registry.

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
