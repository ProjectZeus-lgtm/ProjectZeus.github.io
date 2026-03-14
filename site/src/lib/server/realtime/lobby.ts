/**
 * Lobby-specific real-time helpers.
 *
 * - getLobbyState()        — fetch the current LobbyState from the DB
 * - broadcastLobbyUpdate() — fetch state then push it to every SSE listener
 */

import { db } from '$server/db/client';
import { adventures, adventureMembers, users } from '$server/db/schema';
import { eq } from 'drizzle-orm';
import type { LobbyState, LobbyMember } from '$types';
import { eventBus } from './event-bus';

/** Fetch the full lobby state for an adventure. */
export async function getLobbyState(adventureId: string): Promise<LobbyState | null> {
	const adventure = await db
		.select()
		.from(adventures)
		.where(eq(adventures.id, adventureId))
		.limit(1);

	if (adventure.length === 0) return null;

	const rows = await db
		.select({
			adventureId: adventureMembers.adventureId,
			userId: adventureMembers.userId,
			role: adventureMembers.role,
			isReady: adventureMembers.isReady,
			joinedAt: adventureMembers.joinedAt,
			username: users.username,
			avatarUrl: users.avatarUrl
		})
		.from(adventureMembers)
		.innerJoin(users, eq(adventureMembers.userId, users.id))
		.where(eq(adventureMembers.adventureId, adventureId));

	const members: LobbyMember[] = rows.map((m) => ({
		adventureId: m.adventureId,
		userId: m.userId,
		role: m.role as 'owner' | 'player',
		isReady: m.isReady,
		joinedAt: m.joinedAt,
		username: m.username,
		avatarUrl: m.avatarUrl
	}));

	const allReady = members.length > 0 && members.every((m) => m.isReady);

	return {
		adventure: adventure[0] as LobbyState['adventure'],
		members,
		allReady
	};
}

/**
 * Fetch the latest lobby state from the DB and broadcast it to all
 * SSE subscribers for this adventure.
 */
export async function broadcastLobbyUpdate(adventureId: string): Promise<void> {
	const state = await getLobbyState(adventureId);
	if (!state) return;

	if (state.adventure.status === 'active') {
		// Adventure just started — tell everyone to redirect
		eventBus.emit(adventureId, 'adventure-started', { adventureId });
	} else {
		eventBus.emit(adventureId, 'lobby-update', state);
	}
}
