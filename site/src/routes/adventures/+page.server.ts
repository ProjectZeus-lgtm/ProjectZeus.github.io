import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$server/db/client';
import { adventures, adventureMembers } from '$server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		redirect(302, `/auth/login?returnTo=${encodeURIComponent(url.pathname + url.search)}`);
	}

	// Get all adventures where the user is a member
	const memberRows = await db
		.select({
			adventure: adventures,
			memberCount: db.$count(adventureMembers, eq(adventureMembers.adventureId, adventures.id))
		})
		.from(adventureMembers)
		.innerJoin(adventures, eq(adventureMembers.adventureId, adventures.id))
		.where(eq(adventureMembers.userId, locals.user.id))
		.orderBy(desc(adventures.updatedAt));

	return {
		adventures: memberRows.map((row) => ({
			...row.adventure,
			memberCount: row.memberCount
		}))
	};
};
