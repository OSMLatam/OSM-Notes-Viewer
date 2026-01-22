#!/usr/bin/env bash
#
# Run CI Tests Locally
# Simulates the GitHub Actions workflow to test changes locally
# Author: Andres Gomez (AngocA)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

print_message() {
    local color="${1}"
    shift
    echo -e "${color}$*${NC}"
}

print_message "${YELLOW}" "=== Running CI Tests Locally (OSM-Notes-Viewer) ==="
echo

cd "${PROJECT_ROOT}"

# Check Node.js version
if ! command -v node > /dev/null 2>&1; then
    print_message "${RED}" "Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [[ ${NODE_VERSION} -lt 18 ]]; then
    print_message "${RED}" "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_message "${GREEN}" "✓ Node.js $(node -v) found"

# Check npm
if ! command -v npm > /dev/null 2>&1; then
    print_message "${RED}" "npm is not installed"
    exit 1
fi

print_message "${GREEN}" "✓ npm $(npm -v) found"

echo
print_message "${YELLOW}" "=== Step 1: Code Quality Checks ==="
echo

# Install dependencies
print_message "${BLUE}" "Installing dependencies..."
npm ci --prefer-offline --no-audit

# Check code formatting
print_message "${BLUE}" "Checking code formatting..."
if npm run lint 2>/dev/null; then
    print_message "${GREEN}" "✓ Lint passed"
else
    print_message "${YELLOW}" "⚠ Lint script not found or failed (non-blocking)"
fi

# Check Prettier formatting
print_message "${BLUE}" "Checking Prettier formatting..."
if npx prettier --check "**/*.{js,md,json,yaml,yml,css,html}" --ignore-path .prettierignore 2>/dev/null; then
    print_message "${GREEN}" "✓ Prettier formatting check passed"
else
    print_message "${RED}" "✗ Prettier formatting check failed"
    exit 1
fi

# Validate package.json
print_message "${BLUE}" "Validating package.json..."
if npm run validate 2>/dev/null; then
    print_message "${GREEN}" "✓ Package validation passed"
else
    print_message "${YELLOW}" "⚠ Package validation skipped (script not found)"
fi

echo
print_message "${YELLOW}" "=== Step 2: Tests ==="
echo

# Run tests
print_message "${BLUE}" "Running tests..."
if npm run test:run; then
    print_message "${GREEN}" "✓ Tests passed"
else
    print_message "${RED}" "✗ Tests failed"
    exit 1
fi

# Generate coverage (optional)
print_message "${BLUE}" "Generating coverage report..."
if npm run test:coverage 2>/dev/null; then
    print_message "${GREEN}" "✓ Coverage report generated"
else
    print_message "${YELLOW}" "⚠ Coverage report generation skipped (non-blocking)"
fi

echo
print_message "${YELLOW}" "=== Step 3: Build Check ==="
echo

# Build project
print_message "${BLUE}" "Building project..."
if npm run build; then
    print_message "${GREEN}" "✓ Build successful"

    # Check build artifacts
    if [[ -d "dist" ]]; then
        print_message "${GREEN}" "✓ Build artifacts found in dist/"
        ls -la dist/ | head -5
    else
        print_message "${YELLOW}" "⚠ No dist directory found (this is OK for static projects)"
    fi
else
    print_message "${RED}" "✗ Build failed"
    exit 1
fi

echo
print_message "${YELLOW}" "=== Step 4: Security Audit ==="
echo

# Run security audit
print_message "${BLUE}" "Running security audit..."
if npm audit --audit-level=moderate 2>/dev/null; then
    print_message "${GREEN}" "✓ Security audit passed"
else
    print_message "${YELLOW}" "⚠ Security audit found issues (non-blocking)"
fi

echo
print_message "${GREEN}" "=== All CI Tests Completed Successfully ==="
echo
print_message "${GREEN}" "✅ Code Quality Checks: PASSED"
print_message "${GREEN}" "✅ Tests: PASSED"
print_message "${GREEN}" "✅ Build Check: PASSED"
print_message "${GREEN}" "✅ Security Audit: COMPLETED"
echo

exit 0
