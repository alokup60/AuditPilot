// 1. Read process.env
// 2. Validate required values
// 3. Convert types
// 4. Apply safe defaults where appropriate
// 5. Fail fast if configuration is invalid
// 6. Export typed values

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function loadEnv(): void {
  if (typeof process === 'undefined' || typeof (process as any).loadEnvFile !== 'function') {
    return;
  }

  try {
    let currentDir = process.cwd();
    const root = path.parse(currentDir).root;

    while (true) {
      const envPath = path.join(currentDir, '.env');
      if (fs.existsSync(envPath)) {
        try {
          (process as any).loadEnvFile(envPath);
          break;
        } catch {
          // If loading this .env fails, continue
        }
      }
      if (currentDir === root) break;
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) break;
      currentDir = parentDir;
    }
  } catch {
    // Ignore any environment loading errors
  }
}

loadEnv();

export interface ServerConfig {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
}

export interface MongoConfig {
  uri: string;
}

export interface RedisConfig {
  url: string;
}

export interface AuthConfig {
  jwtSecret: string;
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
}

export interface ObservabilityConfig {
  sentryDsn: string;
  otelEndpoint: string;
  logLevel: string;
}

export interface Config {
  server: ServerConfig;
  mongodb: MongoConfig;
  redis: RedisConfig;
  auth: AuthConfig;
  s3: S3Config;
  gemini: GeminiConfig;
  observability: ObservabilityConfig;
}

export type AppConfig = Config;

export function parsePort(portStr?: string, defaultPort = 4000): number {
  if (portStr === undefined || portStr.trim() === '') {
    return defaultPort;
  }
  const parsed = Number(portStr.trim());
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid PORT: "${portStr}". Port must be an integer between 1 and 65535.`);
  }
  return parsed;
}

function getEnvValue(val: string | undefined, defaultValue: string): string {
  if (val === undefined || val.trim() === '') {
    return defaultValue;
  }
  return val.trim();
}

export function createConfig(env: Record<string, string | undefined> = process.env): Config {
  const nodeEnv = getEnvValue(env.NODE_ENV, 'development');
  const port = parsePort(env.PORT, 4000);
  const corsOrigin = getEnvValue(env.CORS_ORIGIN, 'http://localhost:5173');

  const mongodbUri = getEnvValue(env.MONGODB_URI, 'mongodb://localhost:27017/website_audit');
  const redisUrl = getEnvValue(env.REDIS_URL, 'redis://localhost:6379');

  const jwtAccessSecret = getEnvValue(
    env.JWT_ACCESS_SECRET || env.JWT_SECRET,
    'replace-with-strong-development-secret',
  );
  const jwtRefreshSecret = getEnvValue(
    env.JWT_REFRESH_SECRET || env.JWT_SECRET,
    'replace-with-strong-development-secret',
  );
  const jwtSecret = getEnvValue(env.JWT_SECRET || env.JWT_ACCESS_SECRET, jwtAccessSecret);
  const accessExpiresIn = getEnvValue(env.JWT_ACCESS_EXPIRES_IN || env.JWT_EXPIRES_IN, '15m');
  const refreshExpiresIn = getEnvValue(env.JWT_REFRESH_EXPIRES_IN, '7d');

  const s3Bucket = getEnvValue(env.AWS_S3_BUCKET || env.S3_BUCKET, 'website-audit-artifacts');
  const s3Region = getEnvValue(env.AWS_REGION || env.S3_REGION, 'ap-south-1');
  const awsAccessKeyId = getEnvValue(env.AWS_ACCESS_KEY_ID, '');
  const awsSecretAccessKey = getEnvValue(env.AWS_SECRET_ACCESS_KEY, '');

  const geminiApiKey = getEnvValue(env.GEMINI_API_KEY, '');
  const geminiModel = getEnvValue(env.GEMINI_MODEL, 'gemini-1.5-flash');

  const sentryDsn = getEnvValue(env.SENTRY_DSN, '');
  const otelEndpoint = getEnvValue(env.OTEL_EXPORTER_OTLP_ENDPOINT, '');
  const logLevel = getEnvValue(env.LOG_LEVEL, 'info');

  return {
    server: {
      nodeEnv,
      port,
      corsOrigin,
    },
    mongodb: {
      uri: mongodbUri,
    },
    redis: {
      url: redisUrl,
    },
    auth: {
      jwtSecret,
      accessSecret: jwtAccessSecret,
      refreshSecret: jwtRefreshSecret,
      accessExpiresIn,
      refreshExpiresIn,
    },
    s3: {
      bucket: s3Bucket,
      region: s3Region,
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
    },
    gemini: {
      apiKey: geminiApiKey,
      model: geminiModel,
    },
    observability: {
      sentryDsn,
      otelEndpoint,
      logLevel,
    },
  };
}

export const config: Config = createConfig();
