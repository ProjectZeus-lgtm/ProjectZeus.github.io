import { Google } from 'arctic';
import { env } from '$env/dynamic/private';

export function getGoogleProvider() {
	return new Google(
		env.GOOGLE_CLIENT_ID!,
		env.GOOGLE_CLIENT_SECRET!,
		env.GOOGLE_REDIRECT_URI ?? 'http://localhost:5173/auth/callback/google'
	);
}
