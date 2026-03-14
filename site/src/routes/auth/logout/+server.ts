import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession, SESSION_COOKIE } from '$server/auth/sessions';

export const POST: RequestHandler = async ({ cookies, locals }) => {
	const token = cookies.get(SESSION_COOKIE);

	if (token) {
		await deleteSession(token);
	}

	cookies.delete(SESSION_COOKIE, { path: '/' });
	redirect(302, '/');
};
