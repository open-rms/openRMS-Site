<script lang="ts">
  // Sign-up lives in openRMS Accounts; this route stays so old links work.
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { accountsPage } from "#lib/config.ts";

  // Keep a same-site "next" (old /login?next=/dashboard links), as an absolute URL for Accounts.
  const raw = page.url.searchParams.get("next") ?? "";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? `${page.url.origin}${raw}` : `${page.url.origin}/dashboard`;
  const extra: Record<string, string> = {};
  const code = page.url.searchParams.get("user_code");
  if (code) extra.user_code = code;
  const target = accountsPage("/signup", next, extra);
  onMount(() => location.replace(target));
</script>

<p class="text-muted-foreground">Continuing to <a href={target}>openRMS Accounts</a>…</p>
