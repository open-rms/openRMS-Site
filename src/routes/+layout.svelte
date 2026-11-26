<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { authClient, session } from "#lib/auth.ts";
  import { api, clearDirectoryToken } from "#lib/api.ts";
  import { accountsPage } from "#lib/config.ts";
  import { Button } from "#lib/components/ui/button/index.ts";
  import { Badge } from "#lib/components/ui/badge/index.ts";
  let isStaff = $state(false);
  $effect(() => {
    if ($session.data?.user) api.me().then((m) => (isStaff = !!m.user && m.user.role !== "user"));
    else isStaff = false;
  });
  let { children } = $props();

  async function signOut() {
    await authClient.signOut();
    clearDirectoryToken();
    goto("/");
  }
  const nav = [
    { href: "/", label: "Directory" },
    { href: "/live", label: "On the air" },
    { href: "/contributors", label: "Watchers" },
    { href: "/developers", label: "API & Pat" },
    { href: "/about", label: "About" },
  ];
</script>

<header class="bg-card mb-5 border-b">
  <div class="mx-auto flex min-h-14 max-w-[1200px] flex-wrap items-center gap-6 px-4">
    <a class="text-foreground flex items-center gap-2 text-[1.05rem] no-underline" href="/">
      <img src="/favicon.svg" alt="" width="26" height="26" />
      <span>openRMS <b>Directory</b></span>
    </a>
    <nav class="flex flex-1 gap-4">
      {#each nav as n}
        <a
          href={n.href}
          aria-current={page.url.pathname === n.href ? "page" : undefined}
          class="text-muted-foreground aria-[current=page]:text-foreground aria-[current=page]:border-primary border-b-2 border-transparent py-1 no-underline"
        >{n.label}</a>
      {/each}
    </nav>
    <div class="flex items-center gap-3">
      {#if $session.data?.user}
        {#if isStaff}<a href="/staff">Staff</a>{/if}
        <a href="/dashboard" class="font-mono font-bold no-underline">{$session.data.user.callsign}</a>
        <a href={accountsPage("/account", page.url.href)} class="text-sm text-muted-foreground">Account</a>
        <Button variant="outline" onclick={signOut}>Sign out</Button>
      {:else if !$session.isPending}
        <a href={accountsPage("/login", page.url.href)}>Sign in</a>
        <Button href={accountsPage("/signup", `${page.url.origin}/dashboard`)}>List a gateway</Button>
      {/if}
    </div>
  </div>
</header>

<main class="mx-auto min-h-[70vh] max-w-[1200px] px-4">
  {@render children()}
</main>

<footer class="text-muted-foreground mx-auto mt-12 max-w-[1200px] border-t px-4 pt-4 pb-8 text-sm">
  openRMS is open source (AGPL-3.0). The directory lists gateways on every mode, not only the ones Winlink knows.
  Listings marked <Badge variant="outline">Winlink</Badge> are imported from the Winlink gateway list; the rest are listed by their sysops.
</footer>
