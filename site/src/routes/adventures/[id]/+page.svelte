<script lang="ts">
	import GlassPanel from '$components/GlassPanel.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.adventure.name}</title>
</svelte:head>

<div class="page-container">
	<div class="adventure-screen">
		<!-- Header -->
		<div class="adventure-header">
			<div>
				<h1>{data.adventure.name}</h1>
				<div class="header-meta">
					<span class="badge badge-{data.adventure.mode}">
						{data.adventure.mode}
					</span>
					<span class="badge badge-active">Active</span>
					{#if data.adventure.worldSeed}
						<span class="text-muted">Seed: {data.adventure.worldSeed}</span>
					{/if}
				</div>
			</div>
		</div>

		<div class="adventure-grid">
			<!-- Party panel -->
			<GlassPanel>
				<div class="panel-inner">
					<h2>Party</h2>
					<div class="party-list">
						{#each data.members as member}
							<div class="party-member">
								{#if member.avatarUrl}
									<img src={member.avatarUrl} alt="" class="avatar" />
								{:else}
									<div class="avatar avatar-placeholder">
										{member.username.charAt(0).toUpperCase()}
									</div>
								{/if}
								<div>
									<span class="member-name">
										{member.username}
										{#if member.userId === data.currentUserId}
											<span class="you-tag">(you)</span>
										{/if}
									</span>
									<span class="member-role text-muted">{member.role}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</GlassPanel>

			<!-- Main narrative area (TBD) -->
			<GlassPanel>
				<div class="narrative-area">
					<div class="tbd-notice">
						<span class="tbd-icon">⚔️</span>
						<h2>The Adventure Begins Here</h2>
						<p class="text-muted">
							This is where the narrative engine, world context, and AI-driven storytelling
							will come to life. Character creation, scene descriptions, dialogue choices,
							dice rolls, and combat — all grounded in the world data from Azgaar.
						</p>
						<div class="tbd-tags">
							<span class="tbd-tag">Narrative Engine</span>
							<span class="tbd-tag">Character Creation</span>
							<span class="tbd-tag">World Context</span>
							<span class="tbd-tag">5e Mechanics</span>
							<span class="tbd-tag">AI Game Master</span>
						</div>
					</div>
				</div>
			</GlassPanel>
		</div>
	</div>
</div>

<style>
	.adventure-screen {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.adventure-header h1 {
		margin: 0 0 0.5rem;
	}

	.header-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.adventure-grid {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: 1.5rem;
		align-items: start;
	}

	.panel-inner {
		padding: 0.25rem 0.5rem;
	}

	.panel-inner h2 {
		margin: 0 0 1rem;
		font-size: 1rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.party-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.party-member {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.avatar {
		width: 32px;
		height: 32px;
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
		font-size: 0.85rem;
	}

	.member-name {
		display: block;
		font-weight: 600;
		font-size: 0.92rem;
	}

	.you-tag {
		color: var(--accent);
		font-weight: 400;
		font-size: 0.8rem;
	}

	.member-role {
		display: block;
		font-size: 0.78rem;
		text-transform: capitalize;
	}

	/* Narrative TBD */
	.narrative-area {
		min-height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.tbd-notice {
		text-align: center;
		max-width: 500px;
		padding: 2rem;
	}

	.tbd-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 1rem;
	}

	.tbd-notice h2 {
		margin: 0 0 0.75rem;
	}

	.tbd-notice p {
		margin: 0 0 1.5rem;
		line-height: 1.6;
	}

	.tbd-tags {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
	}

	.tbd-tag {
		padding: 0.3rem 0.75rem;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 600;
		background: rgba(124, 156, 255, 0.1);
		border: 1px solid rgba(124, 156, 255, 0.2);
		color: var(--accent);
	}

	@media (max-width: 768px) {
		.adventure-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
