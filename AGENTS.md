# OpenCode Instructions

## Commands

- `npm run lint && npm run typecheck && npm test` - Run full dev checks
- `npm run build && npm start` - Build and start dev server

## Test Execution

- Always execute tests with the project built: `npm run build`
- Use `jest --testPathPattern=yourTestFile.spec.js yourTestModule.spec.ts` to target specific files.
- Run an individual test case: find its line number in a file and use `--runInBand`, e.g., `npm test -- -t 'Test Name (line_number)'`

## Directory Structure

- `/src`: Contains all source code divided into `components`, `pages`, `api`, `context`, etc.
- `/tests`: Unit tests for modules/components. Not always in sync with source paths.

## Quirks & Conventions

- The API uses Axios instances setup in `axiosInstance.ts` and must import this when making requests.
- TypeScript types are used extensively for type-safety, including custom interfaces.
- Follow naming conventions as described in `/CONVENTIONS.md`

## Other Resources

Refer to existing instruction files:

- `.cursor/rules/`
- `.github/copilot-instructions.md`
