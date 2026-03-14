import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

const client = createClient({
	url: env.TURSO_URL ?? 'file:local.db',
	authToken: env.TURSO_AUTH_TOKEN
});

export const dbClient = client;
export const db = drizzle(client, { schema });
