<script lang="ts">
	import type { Adventure } from '$types';

	interface Props {
		adventure: Adventure;
		memberCount?: number;
	}

	let { adventure, memberCount = 1 }: Props = $props();

	let modeClass = $derived(adventure.mode === 'solo' ? 'badge-solo' : 'badge-multiplayer');
	let statusClass = $derived(`badge-${adventure.status}`);

	let href = $derived(
		adventure.status === 'lobby'
			? `/adventures/${adventure.id}/lobby`
			: `/adventures/${adventure.id}`
	);

	let actionLabel = $derived(
		adventure.status === 'lobby'
			? 'Join Lobby'
			: adventure.status === 'active'
				? 'Continue'
				: 'View'
	);

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<a {href} class="adventure-card">
	<div class="card-header">
		<h3>{adventure.name}</h3>
		<div class="badges">
			<span class="badge {modeClass}">{adventure.mode}</span>
			<span class="badge {statusClass}">{adventure.status}</span>
		</div>
	</div>

	<div class="card-meta">
		<span class="meta-item">
			{#if adventure.mode === 'multiplayer'}
				👥 {memberCount} player{memberCount !== 1 ? 's' : ''}
			{:else}
				🗡️ Solo
			{/if}
		</span>
		<span class="meta-item text-muted">{formatDate(adventure.createdAt)}</span>
	</div>

	<div class="card-action">
		<span class="action-label">{actionLabel} →</span>
	</div>
</a>

<style>
	.adventure-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.25rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		text-decoration: none;
		color: var(--text);
		transition: all 0.2s ease;
	}

	.adventure-card:hover {
		border-color: rgba(124, 156, 255, 0.4);
		transform: translateY(-2px);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		text-decoration: none;
	}

	.card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.badges {
		display: flex;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	.card-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.88rem;
	}

	.card-action {
		margin-top: auto;
	}

	.action-label {
		font-size: 0.88rem;
		font-weight: 600;
		color: var(--accent);
	}
</style>
