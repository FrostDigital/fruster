---
"@fruster/test-utils": minor
"@fruster/bus": patch
---

Add in-memory MongoDB support and enhance test utilities:

**@fruster/test-utils:**
- Add optional mongodb-memory-server support for in-memory MongoDB testing
- New `useInMemoryMongo` option to start an in-memory MongoDB server
- New `inMemoryMongoOptions` for configuring the in-memory server
- Add mongodb-memory-server as optional peer dependency
- Automatically stop in-memory server when calling `stop()` or `close()`
- Comprehensive README documentation with comparison table and migration guide
- Add graceful NATS server detection and error handling

**demo-app (not published):**
- Add real-world MongoDB integration example with CarRepository pattern
- Create CarRepo for database operations following Fruster repository pattern
- Add CreateCarHandler for creating cars in database
- Update GetCarHandler to retrieve cars by ID from database
- Update tests to use in-memory MongoDB with realistic CRUD scenarios
- Add mongodb and mongodb-memory-server dependencies for complete example
