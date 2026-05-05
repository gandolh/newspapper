# Claude Project Context

This directory contains context files for AI assistants (Claude, GPT, etc.) working on the Newspapper project.

## Files in This Directory

### `project-overview.md`

High-level overview of the project:

- What it does
- Current status
- Architecture
- Technology stack
- What's complete vs. what needs work

**Read this first** to understand the project.

### `implementation-guide.md`

Practical guide for implementing the CLI commands:

- Step-by-step instructions
- Code patterns and templates
- Testing strategies
- Common issues and solutions

**Read this when implementing** commands.

### `codebase-map.md`

Quick reference for navigating the codebase:

- Where to find specific functionality
- Module APIs and usage
- Data structures
- Common workflows

**Reference this while coding** to find what you need.

## Quick Start for AI Assistants

1. **Understand the project**: Read `project-overview.md`
2. **Pick a command to implement**: See `docs/todos/README.md` for priority order
3. **Read the TODO guide**: `docs/todos/{command-name}.md`
4. **Reference the codebase map**: Use `codebase-map.md` to find modules
5. **Follow the patterns**: Use `implementation-guide.md` for code templates
6. **Test your work**: Follow testing instructions in the TODO guide

## Current State

**Bootstrap: COMPLETE ✅**

- All modules implemented
- All documentation written
- Project structure ready

**Implementation: PENDING ⏳**

- 9 CLI commands need implementation
- Each has a detailed guide in `docs/todos/`

## Your Mission

Implement the CLI commands in `src/commands/` using the existing modules. Each command orchestrates the already-implemented storage, scraping, NLP, summarization, and rendering modules.

Start with `scrape.js` and work through the priority list in `docs/todos/README.md`.

## Key Resources

- **TODO Guides**: `docs/todos/` - Detailed implementation instructions
- **Architecture**: `docs/architecture.md` - System design
- **CLI Reference**: `docs/cli-commands.md` - Command specifications
- **Design Systems**: `docs/design-systems.md` - Visual specifications

## Important Notes

- All heavy lifting is done by existing modules
- Your job is to orchestrate them in command handlers
- Follow the patterns in `implementation-guide.md`
- Test each command independently
- Update manifest after operations
- Provide helpful error messages

Good luck! 🚀
