import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLobbyState } from '$server/realtime/lobby';

/** GET /api/lobby/[id] — fetch lobby state (also used as SSE fallback) */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		error(401, 'Not authenticated');
	}

	const state = await getLobbyState(params.id);
	if (!state) error(404, 'Adventure not found');

	return json(state);
};
