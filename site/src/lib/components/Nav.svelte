<script lang="ts">
	import type { User } from '$types';

	interface Props {
		user: User | null;
	}

	let { user }: Props = $props();
</script>

<nav class="nav">
	<div class="nav-inner">
		<a href="/" class="nav-brand">
			<span class="brand-icon">⚔</span>
			<span class="brand-text">Adventure Awaits</span>
		</a>

		<div class="nav-right">
			{#if user}
				<a href="/adventures" class="nav-link">Adventures</a>
				<div class="nav-user">
					{#if user.avatarUrl}
						<img src={user.avatarUrl} alt="" class="avatar" />
					{:else}
						<div class="avatar avatar-placeholder">
							{user.username.charAt(0).toUpperCase()}
						</div>
					{/if}
					<span class="username">{user.username}</span>
				</div>
				<form method="POST" action="/auth/logout">
					<button type="submit" class="btn btn-ghost btn-sm">Sign Out</button>
				</form>
			{:else}
				<a href="/auth/login" class="btn btn-primary btn-sm">Sign In</a>
			{/if}
		</div>
	</div>
</nav>

<style>
	.nav {
		border-bottom: 1px solid var(--border);
		background: rgba(7, 17, 31, 0.85);
		backdrop-filter: blur(12px);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.nav-inner {
		width: min(1200px, calc(100vw - 32px));
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 0;
		gap: 1rem;
	}

	.nav-brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: var(--text);
		font-weight: 700;
		font-size: 1.1rem;
	}

	.nav-brand:hover {
		text-decoration: none;
	}

	.brand-icon {
		font-size: 1.3rem;
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.nav-link {
		color: var(--text-muted);
		font-size: 0.9rem;
		font-weight: 500;
		transition: color 0.15s;
	}

	.nav-link:hover {
		color: var(--text);
		text-decoration: none;
	}

	.nav-user {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid var(--border);
	}

	.avatar-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(124, 156, 255, 0.2);
		color: var(--accent);
		font-size: 0.8rem;
		font-weight: 700;
	}

	.username {
		font-size: 0.9rem;
		color: var(--text-muted);
	}

	.btn-sm {
		padding: 0.4rem 0.85rem;
		font-size: 0.85rem;
	}

	@media (max-width: 640px) {
		.username {
			display: none;
		}
		.brand-text {
			display: none;
		}
	}
</style>
