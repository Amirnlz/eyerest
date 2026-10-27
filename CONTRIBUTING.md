# Contributing

## Code style

ESLint is the source of truth for both code quality and formatting. Run `npm run lint` before submitting changes; use `npm run lint:fix` to apply safe fixes. `npm run format:check` and `npm run format` are aliases for those same style checks and fixes. The full `npm run check` command runs TypeScript, lint, and unit tests.

Follow these conventions when writing or reviewing code:

- Use two spaces for indentation, single quotes for JavaScript and TypeScript strings, and semicolons.
- Keep trailing commas in multiline arrays, objects, imports, and argument lists. Use parentheses around every arrow function parameter.
- Prefer `const`, strict equality, object shorthand, and template strings when interpolating values.
- Import types with `import type` and export types with `export type` when the import or export contains only types.
- Keep functions focused and make side effects explicit. Keep the core state machine pure; put I/O behind the existing ports and adapters.
- Treat unused variables as errors. Prefix intentionally unused parameters with `_`.
- Do not add `debugger`, `alert`, or routine `console.log` calls. Use `console.info`, `console.warn`, and `console.error` for actionable diagnostics.
- In renderer code, follow the Rules of Hooks and keep effect dependencies complete. Access Electron APIs through the preload bridge rather than directly from the renderer.
- Keep lines near 100 characters where practical. ESLint reports longer lines as warnings so long names, URLs, and meaningful strings do not block a change.

Lint globals are scoped by process: main and preload code use Node globals, renderer and harness code use browser globals, and tests use Node and Vitest globals.
