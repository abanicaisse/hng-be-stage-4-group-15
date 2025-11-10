export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://admin:password@localhost:5672',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  services: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    templateService: process.env.TEMPLATE_SERVICE_URL || 'http://localhost:3003',
  },
  rateLimit: {
    ttl: 60,
    limit: 100,
  },
});
