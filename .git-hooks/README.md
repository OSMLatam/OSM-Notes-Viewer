# Git Hooks - OSM-Notes-Viewer

Unified Git hooks for JavaScript/HTML/CSS projects in the OSM-Notes ecosystem.

## Overview

This project uses unified Git hooks that ensure code quality before commits and pushes. The hooks are designed to be consistent across all JavaScript projects in the OSM-Notes ecosystem.

## Available Hooks

### Pre-commit Hook

**Location**: `.git-hooks/pre-commit`

**Checks before each commit:**

1. ✅ **Prettier** - Formatting for JavaScript, HTML, CSS
2. ✅ **Prettier** - Formatting for Markdown, JSON, YAML
3. ✅ **ESLint** - JavaScript linting (if configured)

**Installation:**

```bash
ln -sf ../../.git-hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Bypass (not recommended):**

```bash
git commit --no-verify
```

### Pre-push Hook

**Location**: `.git-hooks/pre-push`

**Executes before each push:**

1. ✅ **Tests** - Runs test suite (if available)

**Installation:**

```bash
ln -sf ../../.git-hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

**Bypass:**

```bash
git push --no-verify
```

## Unified Structure

JavaScript/HTML/CSS projects in the OSM-Notes ecosystem use similar hook structures:

- **OSM-Notes-Viewer** ✅

This ensures consistent code quality standards across all projects.

## Requirements

The hooks require the following tools (optional - hooks skip checks if tools are not installed):

- `prettier` or `npx` - Code formatting
- `npm` - For running tests and ESLint (if configured)

## Notes

- Git hooks are optional and mainly useful for local development
- CI/CD uses GitHub Actions workflows for validation
- Hooks gracefully skip checks if required tools are not installed
