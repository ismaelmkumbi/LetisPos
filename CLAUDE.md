# LetisPos — Claude Code Configuration

## Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- NEVER save working files or tests to root — use `/src`, `/tests`, `/docs`, `/config`, `/scripts`
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- Keep files under 500 lines
- Validate input at system boundaries

## Agent Coordination

- When spawning multiple agents, use `run_in_background: true` and name them
- Agents communicate via `SendMessage`, not polling
- After spawning agents: stop, tell user what's running, wait for results
- Use agents for: 3+ file changes, new features, cross-module refactoring, API changes, security, performance
- Skip agents for: single file edits, 1-2 line fixes, docs updates, config changes, questions

## Build & Test

- ALWAYS run tests after code changes
- ALWAYS verify build succeeds before committing
- Run: `npm run build && npm test`

## Reference

Full agent catalog, MCP tools, swarm config, and CLI reference: see `/docs/claude-flow-reference.md`
