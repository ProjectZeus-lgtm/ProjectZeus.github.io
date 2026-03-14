<script lang="ts">
	import AdventureCard from '$components/AdventureCard.svelte';
	import GlassPanel from '$components/GlassPanel.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Your Adventures</title>
</svelte:head>

<div class="page-container">
	<header class="page-header">
		<div>
			<h1>Your Adventures</h1>
			<p class="text-muted">Continue a journey or forge a new path</p>
		</div>
		<a href="/adventures/new" class="btn btn-primary">+ New Adventure</a>
	</header>

	{#if data.adventures.length === 0}
		<GlassPanel>
			<div class="empty-state">
				<span class="empty-icon">🗺️</span>
				<h2>No adventures yet</h2>
				<p class="text-muted">Your journey begins with a single step. Create your first adventure to get started.</p>
				<a href="/adventures/new" class="btn btn-primary" style="margin-top: 1rem;">Create Adventure</a>
			</div>
		</GlassPanel>
	{:else}
		<div class="adventures-grid">
			{#each data.adventures as adventure}
				<AdventureCard {adventure} memberCount={adventure.memberCount} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 2rem;
		gap: 1rem;
	}

	.page-header h1 {
		margin: 0 0 0.3rem;
	}

	.page-header p {
		margin: 0;
	}

	.adventures-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.25rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem 2rem;
	}

	.empty-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 1rem;
	}

	.empty-state h2 {
		margin: 0 0 0.5rem;
	}

	.empty-state p {
		margin: 0;
		max-width: 400px;
		margin-inline: auto;
	}

	@media (max-width: 640px) {
		.page-header {
			flex-direction: column;
		}
	}
</style>
