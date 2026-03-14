import type { PageServerLoad } from './$types';
import { ensureDevUsers, isDevAuthEnabled } from '$server/auth/dev-users';
import { redirect } from '@sveltejs/kit';

function normalizeReturnTo(returnTo: string | null) {
	if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
		return '/adventures';
	}

	return returnTo;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const returnTo = normalizeReturnTo(url.searchParams.get('returnTo'));

	if (locals.user) {
		redirect(302, returnTo);
	}

	const devAuthEnabled = isDevAuthEnabled();
	const testUsers = devAuthEnabled ? await ensureDevUsers() : [];

	return {
		devAuthEnabled,
		testUsers,
		returnTo
	};
};
