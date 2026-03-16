# Contributing to BMAD Studio

Thanks for your interest in contributing! This guide covers everything you need to get started.

## Reporting Bugs

Open a [GitHub issue](https://github.com/jwhiteside/bmad-studio/issues) with:

- Steps to reproduce the problem
- What you expected vs what happened
- Your Node.js version and OS
- Browser and version (if UI-related)
- Any relevant console errors

## Suggesting Features

Open an issue with the **feature request** label. Describe:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

## Development Setup

### Prerequisites

- Node.js >= 20.0.0
- npm (comes with Node.js)
- A BMAD project to test against (or use the included `_bmad/` directory in dev)

### Getting Started

```bash
git clone https://github.com/jwhiteside/bmad-studio.git
cd bmad-studio
npm install
npm run dev
```

This starts:
- **Client** (Vite) at http://localhost:5173 with hot reload
- **Server** (Fastify via tsx) at http://localhost:4040 with watch mode

### Project Structure

```
packages/
  shared/    # TypeScript types shared between client and server
  server/    # Fastify API — file parsing, data serving, write safety
  client/    # React SPA — Vite, Tailwind CSS, React Router
bin/         # CLI entry point for npx
```

### Common Commands

```bash
npm run dev        # Start dev servers with hot reload
npm run build      # Build all packages
npm test           # Run test suite (Vitest)
npm run lint       # Lint all packages (ESLint)
npm run format     # Format code (Prettier)
```

### Running Tests

```bash
npm test                    # Run all tests
npx vitest run --watch      # Watch mode
npx vitest run packages/server  # Server tests only
```

## Submitting Pull Requests

1. **Fork** the repository and create a branch from `main`
2. **Make your changes** — keep PRs focused on a single concern
3. **Add tests** for new functionality
4. **Run the full test suite** — `npm test` must pass with zero failures
5. **Run the linter** — `npm run lint` should be clean
6. **Write a clear PR description** explaining what changed and why

### Code Style

- TypeScript strict mode throughout
- Functional React components with hooks
- Tailwind CSS for styling (no CSS modules or styled-components)
- CSS custom properties (`var(--color-*)`) for theming
- Prefer named exports over default exports
- Keep components focused — one component per file when possible

### Commit Messages

Use conventional commit style:

```
feat: add workflow export dialog
fix: resolve step loading race condition
docs: update README installation steps
```

## Architecture Notes

- **File-system as source of truth** — Studio reads/writes BMAD markdown and YAML files directly. No database.
- **Non-destructive writes** — All file writes go through the write-safety service (snapshot, tmp, rename, verify).
- **WebSocket live reload** — Chokidar watches the `_bmad/` directory and pushes updates to the client via WebSocket.
- **Parser isolation** — Each entity type (agent, skill, workflow, team) has its own parser. Format changes require parser updates, not rewrites.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
