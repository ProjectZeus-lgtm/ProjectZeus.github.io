<script lang="ts">
	import GlassPanel from '$components/GlassPanel.svelte';
	import { enhance } from '$app/forms';

	let { form } = $props();

	let mode = $state<'solo' | 'multiplayer'>('solo');
	let name = $state('');
	let submitting = $state(false);
</script>

<svelte:head>
	<title>New Adventure</title>
</svelte:head>

<div class="page-container">
	<div class="form-wrapper">
		<GlassPanel>
			<div class="form-content">
				<h1>New Adventure</h1>
				<p class="text-muted">Name your quest and choose how you'll face it</p>

				{#if form?.error}
					<div class="error-banner">{form.error}</div>
				{/if}

				<form
					method="POST"
					class="adventure-form"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							await update();
							submitting = false;
						};
					}}
				>
					<div class="field">
						<label for="name">Adventure Name</label>
						<input
							type="text"
							id="name"
							name="name"
							placeholder="The Fall of Crimson Keep..."
							maxlength="100"
							required
							bind:value={name}
						/>
					</div>

					<fieldset class="field mode-fieldset">
						<legend>Mode</legend>
						<div class="mode-toggle">
							<button
								type="button"
								class="mode-option"
								class:active={mode === 'solo'}
								onclick={() => (mode = 'solo')}
							>
								<span class="mode-icon">🗡️</span>
								<span class="mode-label">Solo</span>
								<span class="mode-desc text-muted">Journey alone</span>
							</button>
							<button
								type="button"
								class="mode-option"
								class:active={mode === 'multiplayer'}
								onclick={() => (mode = 'multiplayer')}
							>
								<span class="mode-icon">👥</span>
								<span class="mode-label">Multiplayer</span>
								<span class="mode-desc text-muted">Gather your party</span>
							</button>
						</div>
						<input type="hidden" name="mode" value={mode} />
					</fieldset>

					{#if mode === 'multiplayer'}
						<div class="info-note">
							<span>ℹ️</span>
							<span>After creating, you'll get a lobby link to share with your party.</span>
						</div>
					{/if}

					<button type="submit" class="btn btn-primary btn-lg full-width" disabled={!name.trim() || submitting}>
						{submitting ? 'Creating…' : mode === 'solo' ? 'Start Adventure' : 'Create Lobby'}
					</button>
				</form>
			</div>
		</GlassPanel>
	</div>
</div>

<style>
	.form-wrapper {
		max-width: 520px;
		margin: 2rem auto;
	}

	.form-content {
		padding: 1rem 1.5rem 1.5rem;
	}

	h1 {
		margin: 0 0 0.3rem;
	}

	.form-content > p {
		margin: 0 0 1.5rem;
	}

	.adventure-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.mode-fieldset {
		padding: 0;
		margin: 0;
		border: 0;
	}

	label {
		font-weight: 600;
		font-size: 0.9rem;
	}

	legend {
		font-weight: 600;
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
	}

	.mode-toggle {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}

	.mode-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
		padding: 1.25rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border: 2px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		transition: all 0.2s;
		color: var(--text);
	}

	.mode-option:hover {
		border-color: rgba(124, 156, 255, 0.35);
	}

	.mode-option.active {
		border-color: var(--accent);
		background: rgba(124, 156, 255, 0.08);
	}

	.mode-icon {
		font-size: 1.5rem;
	}

	.mode-label {
		font-weight: 600;
		font-size: 1rem;
	}

	.mode-desc {
		font-size: 0.82rem;
	}

	.info-note {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		background: rgba(124, 156, 255, 0.08);
		border: 1px solid rgba(124, 156, 255, 0.2);
		border-radius: 12px;
		font-size: 0.9rem;
		color: var(--text-muted);
	}

	.error-banner {
		padding: 0.75rem 1rem;
		background: rgba(255, 109, 138, 0.1);
		border: 1px solid rgba(255, 109, 138, 0.3);
		border-radius: 12px;
		color: var(--danger);
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
	}

	.full-width {
		width: 100%;
	}

	.btn-lg {
		padding: 0.9rem 2rem;
		font-size: 1.05rem;
		border-radius: 16px;
	}
</style>
