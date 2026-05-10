<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import { theme } from '$lib/stores'
  import { locale } from '$lib/i18n'

  onMount(() => {
    document.documentElement.classList.toggle('dark', $theme === 'dark')
  })

  $: if (typeof document !== 'undefined') {
    document.documentElement.lang = $locale
  }
</script>

<slot />
