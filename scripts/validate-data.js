#!/usr/bin/env node
/**
 * Validate data files against JSON schemas from the submodule
 *
 * This script validates data files against the schemas defined in
 * lib/OSM-Notes-Common/schemas/ to ensure data integrity across repositories.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const PROJECT_ROOT = resolve(__dirname, '..');
const SCHEMAS_DIR = join(PROJECT_ROOT, 'lib/OSM-Notes-Common/schemas');
const DATA_DIR = join(PROJECT_ROOT, 'data');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Initialize Ajv with format support
const ajv = addFormats(new Ajv({ allErrors: true, verbose: true }));

// Error tracking
let totalErrors = 0;
let totalValidated = 0;

/**
 * Load and parse a JSON file
 */
function loadJSON(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`${colors.red}✗ Error reading ${filePath}:${colors.reset}`, error.message);
    throw error;
  }
}

/**
 * Load and compile a schema
 */
function loadSchema(schemaPath) {
  try {
    const schema = loadJSON(schemaPath);
    return ajv.compile(schema);
  } catch (error) {
    console.error(`${colors.red}✗ Error loading schema ${schemaPath}:${colors.reset}`, error.message);
    throw error;
  }
}

/**
 * Validate data against a schema
 */
function validateData(data, schema, description, filePath = null) {
  const valid = schema(data);

  if (!valid) {
    totalErrors++;
    console.error(`${colors.red}✗ Validation failed: ${description}${colors.reset}`);

    if (filePath) {
      console.error(`  File: ${filePath}`);
    }

    console.error(`  Schema: ${schema.errors[0].instancePath || '/'}`);
    console.error(`  Error: ${schema.errors[0].message}`);

    if (schema.errors.length > 1) {
      console.error(`  (${schema.errors.length} total errors)`);
    }

    return false;
  }

  return true;
}

/**
 * Validate metadata.json
 */
function validateMetadata() {
  console.log(`${colors.blue}Validating metadata...${colors.reset}`);

  const schema = loadSchema(join(SCHEMAS_DIR, 'metadata.schema.json'));
  const data = loadJSON(join(DATA_DIR, 'metadata.json'));

  const valid = validateData(data, schema, 'metadata', join(DATA_DIR, 'metadata.json'));

  if (valid) {
    console.log(`${colors.green}✓ metadata.json is valid${colors.reset}`);
  }

  totalValidated++;
  console.log('');
}

/**
 * Validate index file (users or countries)
 */
function validateIndex(indexFile, schemaFile, indexType) {
  console.log(`${colors.blue}Validating ${indexType} index...${colors.reset}`);

  const schema = loadSchema(schemaFile);
  const data = loadJSON(indexFile);

  if (!Array.isArray(data)) {
    console.error(`${colors.red}✗ ${indexType} index is not an array${colors.reset}`);
    totalErrors++;
    totalValidated++;
    console.log('');
    return;
  }

  let validCount = 0;
  let errorCount = 0;

  data.forEach((entry, index) => {
    const valid = schema(entry);
    if (!valid) {
      errorCount++;
      console.error(`${colors.red}✗ Entry ${index} failed validation:${colors.reset}`);
      console.error(`  ${schema.errors[0].message}`);

      // Show the problematic field
      if (schema.errors[0].instancePath) {
        const field = schema.errors[0].instancePath.replace('/', '');
        const value = entry[field];
        console.error(`  Field: ${field} = ${JSON.stringify(value)}`);
      }
    } else {
      validCount++;
    }
  });

  if (errorCount === 0) {
    console.log(`${colors.green}✓ All ${data.length} ${indexType} entries are valid${colors.reset}`);
  } else {
    console.error(`${colors.red}✗ ${errorCount} out of ${data.length} entries failed validation${colors.reset}`);
    totalErrors += errorCount;
  }

  totalValidated++;
  console.log('');
}

/**
 * Validate profile files (users or countries)
 */
function validateProfiles(profilesDir, schemaFile, profileType, sampleSize = null) {
  console.log(`${colors.blue}Validating ${profileType} profiles${sampleSize ? ` (sample of ${sampleSize})` : ''}...${colors.reset}`);

  const schema = loadSchema(schemaFile);

  try {
    const files = readdirSync(profilesDir)
      .filter(f => f.endsWith('.json'))
      .map(f => join(profilesDir, f));

    const filesToCheck = sampleSize ? files.slice(0, sampleSize) : files;

    if (filesToCheck.length === 0) {
      console.log(`${colors.yellow}! No profile files found${colors.reset}`);
      totalValidated++;
      console.log('');
      return;
    }

    let validCount = 0;
    let errorCount = 0;

    filesToCheck.forEach((filePath, index) => {
      const data = loadJSON(filePath);
      const fileName = filePath.split('/').pop();

      const valid = schema(data);
      if (!valid) {
        errorCount++;
        console.error(`${colors.red}✗ ${fileName} failed validation:${colors.reset}`);
        console.error(`  ${schema.errors[0].message}`);

        // Show first error details
        if (schema.errors[0].instancePath) {
          console.error(`  Path: ${schema.errors[0].instancePath}`);
        }
      } else {
        validCount++;
      }
    });

    if (errorCount === 0) {
      console.log(`${colors.green}✓ All ${filesToCheck.length} ${profileType} profiles are valid${colors.reset}`);
    } else {
      console.error(`${colors.red}✗ ${errorCount} out of ${filesToCheck.length} profiles failed validation${colors.reset}`);
      totalErrors += errorCount;
    }

    totalValidated++;
  } catch (error) {
    console.error(`${colors.red}✗ Error validating profiles:${colors.reset}`, error.message);
    totalErrors++;
    totalValidated++;
  }

  console.log('');
}

/**
 * Main validation function
 */
function main() {
  console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  OSM Notes Viewer - Data Validation${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}`);
  console.log('');
  console.log(`Schemas: ${SCHEMAS_DIR}`);
  console.log(`Data: ${DATA_DIR}`);
  console.log('');

  try {
    // Validate metadata
    validateMetadata();

    // Validate user index
    validateIndex(
      join(DATA_DIR, 'indexes', 'users.json'),
      join(SCHEMAS_DIR, 'user-index.schema.json'),
      'user'
    );

    // Validate country index
    validateIndex(
      join(DATA_DIR, 'indexes', 'countries.json'),
      join(SCHEMAS_DIR, 'country-index.schema.json'),
      'country'
    );

    // Validate user profiles (sample)
    validateProfiles(
      join(DATA_DIR, 'users'),
      join(SCHEMAS_DIR, 'user-profile.schema.json'),
      'user',
      10 // Sample first 10
    );

    // Validate country profiles (sample)
    validateProfiles(
      join(DATA_DIR, 'countries'),
      join(SCHEMAS_DIR, 'country-profile.schema.json'),
      'country',
      10 // Sample first 10
    );

    // Summary
    console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}`);
    if (totalErrors === 0) {
      console.log(`${colors.green}✓ All validations passed!${colors.reset}`);
      console.log(`  Validated: ${totalValidated} file groups`);
      console.log(`  Errors: 0`);
    } else {
      console.log(`${colors.red}✗ Validation failed!${colors.reset}`);
      console.log(`  Validated: ${totalValidated} file groups`);
      console.log(`  Errors: ${totalErrors}`);
    }
    console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}`);

    process.exit(totalErrors === 0 ? 0 : 1);
  } catch (error) {
    console.error(`${colors.red}✗ Fatal error during validation:${colors.reset}`, error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run main function
main();

