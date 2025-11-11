#!/usr/bin/env node

/**
 * Environment Variables Validation
 * Checks if all required environment variables are set
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const requiredVars = {
  'Docker Infrastructure': [
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
    'POSTGRES_PORT',
    'REDIS_PORT',
    'RABBITMQ_USER',
    'RABBITMQ_PASSWORD',
    'RABBITMQ_PORT',
    'RABBITMQ_MANAGEMENT_PORT',
    'PGADMIN_EMAIL',
    'PGADMIN_PASSWORD',
    'PGADMIN_PORT',
  ],
  'Application Configuration': ['NODE_ENV', 'DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'],
  'API Gateway': ['API_GATEWAY_PORT'],
  Microservices: [
    'USER_SERVICE_PORT',
    'EMAIL_SERVICE_PORT',
    'PUSH_SERVICE_PORT',
    'TEMPLATE_SERVICE_PORT',
  ],
};

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    console.error(`${colors.red}✗ Error: .env file not found!${colors.reset}`);
    console.log(`${colors.yellow}Please copy .env.example to .env:${colors.reset}`);
    console.log('  cp .env.example .env\n');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach((line) => {
    if (!line || line.trim().startsWith('#')) {
      return;
    }

    // Parse KEY=VALUE
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      envVars[key] = value;
    }
  });

  return envVars;
}

function validateEnv() {
  console.log(`${colors.blue}🔍 Validating environment variables...${colors.reset}\n`);

  const envVars = loadEnvFile();
  let missingVars = [];
  let emptyVars = [];
  let allValid = true;

  // Check each category
  for (const [category, vars] of Object.entries(requiredVars)) {
    console.log(`${colors.yellow}${category}:${colors.reset}`);

    vars.forEach((varName) => {
      if (!(varName in envVars)) {
        console.log(`  ${colors.red}✗ ${varName} - MISSING${colors.reset}`);
        missingVars.push(varName);
        allValid = false;
      } else if (envVars[varName] === '' || envVars[varName] === '<your-value>') {
        console.log(`  ${colors.yellow}⚠ ${varName} - EMPTY OR PLACEHOLDER${colors.reset}`);
        emptyVars.push(varName);
        allValid = false;
      } else {
        console.log(`  ${colors.green}✓ ${varName}${colors.reset}`);
      }
    });

    console.log();
  }

  console.log(`${colors.blue}Summary:${colors.reset}`);

  if (allValid) {
    console.log(`${colors.green}✓ All required environment variables are set!${colors.reset}\n`);
    return true;
  } else {
    if (missingVars.length > 0) {
      console.log(`${colors.red}✗ Missing variables (${missingVars.length}):${colors.reset}`);
      missingVars.forEach((v) => console.log(`  - ${v}`));
      console.log();
    }

    if (emptyVars.length > 0) {
      console.log(
        `${colors.yellow}⚠ Empty or placeholder variables (${emptyVars.length}):${colors.reset}`,
      );
      emptyVars.forEach((v) => console.log(`  - ${v}`));
      console.log();
    }

    console.log(
      `${colors.yellow}Please update your .env file with the required values.${colors.reset}`,
    );
    console.log(`${colors.yellow}See .env.example for reference.${colors.reset}\n`);
    return false;
  }
}

// Run validation
const isValid = validateEnv();
process.exit(isValid ? 0 : 1);
