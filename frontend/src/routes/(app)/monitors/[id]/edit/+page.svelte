<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { api } from '$lib/api'
  import { t } from '$lib/i18n'
  import MonitorForm from '$lib/components/MonitorForm.svelte'
  import PageLoader from '$lib/components/PageLoader.svelte'
  import HeaderPattern from '$lib/components/HeaderPattern.svelte'
  import type { Monitor } from '$lib/api'

  $: id = $page.params.id as string
  let monitor: Monitor | null = null
  let loading = true

  onMount(async () => {
    monitor = await api.monitors.get(id)
    loading = false
  })

  function onSaved(e: CustomEvent<Monitor>) {
    goto(`/monitors/${e.detail.id}`)
  }
</script>

<svelte:head><title>{$t('editMonitor.heading')} - Pingflare</title></svelte:head>

<div style="background-color: rgb(var(--bg))">

  <div class="relative overflow-hidden" style="border-bottom: 1px solid var(--border-color)">
    <HeaderPattern />
    <div class="relative px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto">
      <a href="/monitors/{id}" class="inline-flex items-center gap-1 text-xs mb-4 transition-colors hover:text-[var(--color-primary)]"
        style="color: rgb(var(--text-muted))">{$t('editMonitor.back')}</a>
      <h1 class="text-3xl font-semibold tracking-tight" style="color: rgb(var(--text))">
        {#if monitor}{$t('editMonitor.editNamed', { name: monitor.name })}{:else}{$t('editMonitor.heading')}{/if}
      </h1>
    </div>
  </div>

  <div class="px-4 py-5 md:px-8 md:py-8 max-w-5xl mx-auto">
    {#if loading}
      <PageLoader />
    {:else if monitor}
      <div class="card">
        <MonitorForm {monitor} mode="edit" on:saved={onSaved} on:cancel={() => goto(`/monitors/${id}`)} />
      </div>
    {/if}
  </div>

</div>
