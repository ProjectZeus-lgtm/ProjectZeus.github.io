import { Discord } from 'arctic';
import { env } from '$env/dynamic/private';

export function getDiscordProvider() {
	return new Discord(
		env.DISCORD_CLIENT_ID!,
		env.DISCORD_CLIENT_SECRET!,
		env.DISCORD_REDIRECT_URI ?? 'http://localhost:5173/auth/callback/discord'
	);
}
