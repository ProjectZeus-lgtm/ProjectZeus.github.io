import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$server/db/client';
import { adventures, adventureMembers, adventureState } from '$server/db/schema';
import { eq, and } from 'drizzle-orm';
import { broadcastLobbyUpdate } from '$server/realtime/lobby';

/** POST /api/lobby/[id]/ready — toggle ready status; start if all ready */
export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		error(401, 'Not authenticated');
	}

	const adventureId = params.id;

	// Get the member row
	const member = await db
		.select()
		.from(adventureMembers)
		.where(
			and(
				eq(adventureMembers.adventureId, adventureId),
				eq(adventureMembers.userId, locals.user.id)
			)
		)
		.limit(1);

	if (member.length === 0) {
		error(403, 'Not a member of this adventure');
	}

	// Toggle ready
	const newReady = !member[0].isReady;
	await db
		.update(adventureMembers)
		.set({ isReady: newReady })
		.where(
			and(
				eq(adventureMembers.adventureId, adventureId),
				eq(adventureMembers.userId, locals.user.id)
			)
		);

	// Check if all members are now ready
	if (newReady) {
		const allMembers = await db
			.select()
			.from(adventureMembers)
			.where(eq(adventureMembers.adventureId, adventureId));

		const allReady = allMembers.every(
			(m) => m.userId === locals.user!.id ? true : m.isReady
		);

		if (allReady && allMembers.length > 0) {
			const now = Date.now();
			// Transition adventure to active
			await db
				.update(adventures)
				.set({ status: 'active', updatedAt: now })
				.where(eq(adventures.id, adventureId));

			// Initialize adventure state if not exists
			const existingState = await db
				.select()
				.from(adventureState)
				.where(eq(adventureState.adventureId, adventureId))
				.limit(1);

			if (existingState.length === 0) {
				await db.insert(adventureState).values({
					adventureId,
					stateJson: JSON.stringify({ started: true, events: [] }),
					updatedAt: now
				});
			} else {
				await db
					.update(adventureState)
					.set({
						stateJson: JSON.stringify({
							...JSON.parse(existingState[0].stateJson),
							started: true
						}),
						updatedAt: now
					})
					.where(eq(adventureState.adventureId, adventureId));
			}

			// Broadcast adventure-started to all SSE clients
			await broadcastLobbyUpdate(adventureId);

			return json({ ok: true, ready: true, allReady: true, started: true });
		}
	}

	// Push update to all SSE clients (covers both ready toggle & start)
	await broadcastLobbyUpdate(adventureId);

	return json({ ok: true, ready: newReady, allReady: false, started: false });
};
