// See https://svelte.dev/docs/kit/types#app.d.ts

import type { User } from '$types';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			sessionId: string | null;
		}

		interface PageData {
			user: User | null;
		}
	}
}

export {};
