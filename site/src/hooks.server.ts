import type { Handle } from '@sveltejs/kit';
import { validateSession, SESSION_COOKIE } from '$server/auth/sessions';
import { dbClient } from '$server/db/client';

// Warm the libsql WebSocket connection at startup so the first real
// request doesn't pay the TCP + TLS handshake cost.
dbClient.execute('SELECT 1').catch(() => {});

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);

	if (token) {
		const result = await validateSession(token);
		if (result) {
			event.locals.user = result.user;
			event.locals.sessionId = result.sessionId;
		} else {
			// Expired or invalid session — clear the cookie
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
			event.locals.user = null;
			event.locals.sessionId = null;
		}
	} else {
		event.locals.user = null;
		event.locals.sessionId = null;
	}

	return resolve(event);
};
