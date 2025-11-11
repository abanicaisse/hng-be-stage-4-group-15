import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test users
  const password_hash = await bcrypt.hash('password123', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      password_hash,
      email_enabled: true,
      push_enabled: true,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      name: 'John Doe',
      password_hash,
      push_token: 'test-push-token-123',
      email_enabled: true,
      push_enabled: true,
    },
  });

  // Create test templates
  const emailTemplate = await prisma.template.upsert({
    where: { code: 'welcome_email' },
    update: {},
    create: {
      code: 'welcome_email',
      name: 'Welcome Email',
      type: 'EMAIL',
      subject: 'Welcome to Notification System!',
      content: 'Hello {{name}}, welcome to our platform! Click here: {{link}}',
      variables: {
        name: 'string',
        link: 'string',
      },
    },
  });

  const pushTemplate = await prisma.template.upsert({
    where: { code: 'test_push' },
    update: {},
    create: {
      code: 'test_push',
      name: 'Test Push Notification',
      type: 'PUSH',
      subject: 'Test Notification',
      content: 'Hello {{name}}, this is a test notification!',
      variables: {
        name: 'string',
      },
    },
  });

  console.log('OK - Database seeded successfully!');
  console.log('Created users:', { user1: user1.email, user2: user2.email });
  console.log('Created templates:', {
    emailTemplate: emailTemplate.code,
    pushTemplate: pushTemplate.code,
  });
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
