#!/usr/bin/env node

/**
 * Interactive Database Testing Utility
 *
 * This script will:
 * 1. Test connection to PostgreSQL server
 * 2. Show available databases
 * 3. Prompt user to test specific database connection
 * 4. Offer to create database if it doesn't exist
 */

require('dotenv/config');
const { Client } = require('pg');
const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

let serverClient = null;
let prisma = null;

async function cleanup() {
  if (serverClient) {
    try {
      await serverClient.end();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  if (prisma) {
    try {
      await prisma.$disconnect();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  rl.close();
}

async function testServerConnection(urlObj) {
  console.log('\n' + '═'.repeat(120));
  console.log('STEP 1: TESTING POSTGRESQL SERVER CONNECTIVITY');
  console.log('═'.repeat(120) + '\n');

  console.log('Connection details:');
  console.log('   Host:', urlObj.hostname);
  console.log('   Port:', urlObj.port || '5432');
  console.log('   Target Database:', urlObj.pathname.slice(1));
  console.log('   Username:', urlObj.username);
  console.log('   Password:', urlObj.password ? '***' : '(not set)');
  console.log();

  serverClient = new Client({
    host: urlObj.hostname,
    port: urlObj.port || 5432,
    user: urlObj.username,
    password: urlObj.password,
    database: 'postgres', // Connect to default postgres database
    ssl: urlObj.searchParams.get('sslmode') === 'require' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  });

  try {
    await serverClient.connect();
    console.log('✓ Successfully connected to PostgreSQL server!');

    const versionResult = await serverClient.query('SELECT version()');
    console.log('✓ PostgreSQL version:', versionResult.rows[0].version.split(',')[0]);

    return true;
  } catch (error) {
    console.error('✗ Connection to PostgreSQL server failed!\n');
    console.error('Error:', error.message);

    if (error.code === 'ENOTFOUND') {
      console.error('  → DNS resolution failed. Check the hostname.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('  → Connection refused. Server may be down or firewall blocking.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('  → Connection timeout. Check network/firewall settings.');
    } else if (error.message.includes('password authentication failed')) {
      console.error('  → Invalid username or password.');
    } else if (error.message.includes('SSL')) {
      console.error('  → SSL connection issue. Try adding ?sslmode=require to DATABASE_URL');
    }

    console.error('\nTroubleshooting:');
    console.error('  1. Verify PostgreSQL server is running and accessible');
    console.error('  2. Check firewall/security group settings');
    console.error('  3. Confirm credentials in .env are correct');

    return false;
  }
}

async function listDatabases(targetDb) {
  console.log('\n' + '═'.repeat(120));
  console.log('STEP 2: LISTING AVAILABLE DATABASES');
  console.log('═'.repeat(120) + '\n');

  try {
    const dbResult = await serverClient.query(
      'SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname',
    );

    console.log('Found', dbResult.rows.length, 'database(s) on server:\n');

    dbResult.rows.forEach((row, index) => {
      const isTarget = row.datname === targetDb;
      const marker = isTarget ? '→' : ' ';
      const suffix = isTarget ? ' (target database)' : '';
      console.log(`   ${marker} ${index + 1}. ${row.datname}${suffix}`);
    });

    const dbExists = dbResult.rows.some((row) => row.datname === targetDb);
    return { databases: dbResult.rows, dbExists };
  } catch (error) {
    console.error('✗ Failed to list databases:', error.message);
    return { databases: [], dbExists: false };
  }
}

async function promptDatabaseTest(targetDb, dbExists) {
  console.log('\n' + '═'.repeat(120));
  console.log('STEP 3: TEST DATABASE CONNECTION');
  console.log('═'.repeat(120) + '\n');

  if (!dbExists) {
    console.log(`⚠️  Target database "${targetDb}" does NOT exist on the server.\n`);

    const answer = await question(`Would you like to create database "${targetDb}"? (yes/no): `);

    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      return await createDatabase(targetDb);
    } else {
      console.log('\n✗ Database creation cancelled. Exiting...');
      return false;
    }
  }

  const answer = await question(`\nTest connection to database "${targetDb}"? (yes/no): `);

  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    return await testDatabaseConnection(targetDb);
  } else {
    console.log('\n→ Database connection test skipped.');
    return false;
  }
}

async function createDatabase(targetDb) {
  console.log('\n' + '─'.repeat(120));
  console.log(`Creating database "${targetDb}"...`);

  try {
    await serverClient.query(`CREATE DATABASE "${targetDb}"`);
    console.log(`✓ Database "${targetDb}" created successfully!`);
    console.log('\nNext steps:');
    console.log('  1. Push schema to database: pnpm prisma db push');
    console.log('  2. Or run migrations: pnpm prisma migrate dev');
    return true;
  } catch (error) {
    if (error.code === '42P04') {
      console.log(`ℹ  Database "${targetDb}" already exists.`);
      return true;
    }
    console.error(`✗ Failed to create database: ${error.message}`);
    return false;
  }
}

async function testDatabaseConnection(targetDb) {
  console.log('\n' + '─'.repeat(120));
  console.log(`Testing connection to database "${targetDb}"...`);

  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    await prisma.$connect();
    console.log(`✓ Successfully connected to database "${targetDb}"!`);

    const result =
      await prisma.$queryRaw`SELECT NOW() as current_time, current_database() as db_name`;
    console.log('  Server time:', result[0].current_time);
    console.log('  Database name:', result[0].db_name);

    // Check for tables
    console.log('\n' + '─'.repeat(120));
    console.log('Checking database schema...');

    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    if (tables.length === 0) {
      console.log('⚠️  No tables found in database.');
      console.log('\nTo create tables, run:');
      console.log('  → pnpm prisma db push  (recommended for development)');
      console.log('  → pnpm prisma migrate dev  (recommended for production)');
    } else {
      console.log(`✓ Found ${tables.length} table(s):\n`);
      tables.forEach((t, index) => {
        console.log(`   ${index + 1}. ${t.tablename}`);
      });

      // Check record counts
      console.log('\n' + '─'.repeat(120));
      console.log('Checking record counts...\n');

      try {
        const userCount = await prisma.user.count();
        console.log('   Users:', userCount);
      } catch (e) {
        console.log('   Users: Table may not exist');
      }

      try {
        const notificationCount = await prisma.notification.count();
        console.log('   Notifications:', notificationCount);
      } catch (e) {
        console.log('   Notifications: Table may not exist');
      }

      try {
        const templateCount = await prisma.template.count();
        console.log('   Templates:', templateCount);
      } catch (e) {
        console.log('   Templates: Table may not exist');
      }

      try {
        const logCount = await prisma.notificationLog.count();
        console.log('   Notification Logs:', logCount);
      } catch (e) {
        console.log('   Notification Logs: Table may not exist');
      }
    }

    return true;
  } catch (error) {
    console.error(`✗ Failed to connect to database "${targetDb}"`);
    console.error('Error:', error.message);

    if (error.code === '3D000') {
      console.log('\n→ Database does not exist. Please create it first.');
    }

    return false;
  }
}

async function main() {
  console.log('\n' + '█'.repeat(120));
  console.log('DATABASE CONNECTIVITY TEST UTILITY');
  console.log('█'.repeat(120));

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('\n✗ DATABASE_URL environment variable is not set!');
    console.error('  Please create a .env file in the project root with DATABASE_URL');
    process.exit(1);
  }

  const urlObj = new URL(databaseUrl);
  const targetDb = urlObj.pathname.slice(1);

  // Step 1: Test server connection
  const serverConnected = await testServerConnection(urlObj);

  if (!serverConnected) {
    console.log('\n' + '█'.repeat(120));
    console.log('✗ FAILED: Cannot proceed without server connection');
    console.log('█'.repeat(120) + '\n');
    await cleanup();
    process.exit(1);
  }

  // Step 2: List databases
  const { databases, dbExists } = await listDatabases(targetDb);

  if (databases.length === 0) {
    console.log('\n⚠️  No databases found or cannot list databases.');

    const answer = await question(`\nWould you like to create database "${targetDb}"? (yes/no): `);

    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      await createDatabase(targetDb);
    } else {
      console.log('\n✗ Database creation cancelled. Exiting...');
    }

    console.log('\n' + '█'.repeat(120));
    console.log('TEST COMPLETED');
    console.log('█'.repeat(120) + '\n');
    await cleanup();
    return;
  }

  // Step 3: Prompt for database test or creation
  const tested = await promptDatabaseTest(targetDb, dbExists);

  // Summary
  console.log('\n' + '█'.repeat(120));
  if (tested) {
    console.log('✓ ALL TESTS PASSED - DATABASE IS READY!');
    console.log('█'.repeat(120));
    console.log('\nYou can now:');
    console.log('  → Start your application: pnpm start:dev');
    console.log('  → Open Prisma Studio: pnpm prisma:studio');
    console.log('  → Run database seeds: pnpm prisma:seed');
  } else {
    console.log('TEST COMPLETED');
    console.log('█'.repeat(120));
  }
  console.log();

  await cleanup();
}

// Handle errors and cleanup
process.on('SIGINT', async () => {
  console.log('\n\nProcess interrupted. Cleaning up...');
  await cleanup();
  process.exit(0);
});

process.on('unhandledRejection', async (error) => {
  console.error('\nUnhandled error:', error);
  await cleanup();
  process.exit(1);
});

main().catch(async (error) => {
  console.error('\nFatal error:', error);
  await cleanup();
  process.exit(1);
});
