<script lang="ts">
	import type { LobbyMember } from '$types';

	interface Props {
		member: LobbyMember;
		isCurrentUser?: boolean;
	}

	let { member, isCurrentUser = false }: Props = $props();
</script>

<div class="lobby-player" class:current={isCurrentUser}>
	<div class="player-info">
		{#if member.avatarUrl}
			<img src={member.avatarUrl} alt="" class="avatar" />
		{:else}
			<div class="avatar avatar-placeholder">
				{member.username.charAt(0).toUpperCase()}
			</div>
		{/if}
		<div class="player-details">
			<span class="player-name">
				{member.username}
				{#if isCurrentUser}<span class="you-tag">(you)</span>{/if}
			</span>
			<span class="player-role text-muted">{member.role}</span>
		</div>
	</div>

	<div class="ready-status" class:ready={member.isReady} class:not-ready={!member.isReady}>
		{member.isReady ? '✓ Ready' : '○ Waiting'}
	</div>
</div>

<style>
	.lobby-player {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: rgba(255, 255, 255, 0.02);
		transition: border-color 0.2s;
	}

	.lobby-player.current {
		border-color: rgba(124, 156, 255, 0.35);
		background: rgba(124, 156, 255, 0.05);
	}

	.player-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid var(--border);
	}

	.avatar-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(124, 156, 255, 0.2);
		color: var(--accent);
		font-weight: 700;
		font-size: 0.9rem;
	}

	.player-details {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.player-name {
		font-weight: 600;
		font-size: 0.95rem;
	}

	.you-tag {
		color: var(--accent);
		font-weight: 400;
		font-size: 0.82rem;
	}

	.player-role {
		font-size: 0.8rem;
		text-transform: capitalize;
	}

	.ready-status {
		font-size: 0.85rem;
		font-weight: 600;
		padding: 0.3rem 0.75rem;
		border-radius: 999px;
	}

	.ready {
		color: var(--accent-2);
		background: rgba(52, 211, 162, 0.12);
	}

	.not-ready {
		color: var(--text-muted);
		background: rgba(255, 255, 255, 0.05);
	}
</style>
