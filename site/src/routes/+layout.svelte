<script lang="ts">
	import '../app.css';
	import Nav from '$components/Nav.svelte';

	let { data, children } = $props();
</script>

<Nav user={data.user} />

<main>
	{@render children()}
</main>
