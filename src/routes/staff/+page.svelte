<script lang="ts">
  import { goToAccounts } from "#lib/config.ts";
  import { goto } from "$app/navigation";
  import { session } from "#lib/auth.ts";
  import {
    api, ago, hasPerm, RANK, type Permissions, type StaffRole, type StaffUser, type StaffClub, type StaffReport, type StaffImport, type StaffAudit, type StaffWatcher,
  } from "#lib/api.ts";
  import { Button } from "#lib/components/ui/button/index.ts";
  import { Input } from "#lib/components/ui/input/index.ts";
  import { Label } from "#lib/components/ui/label/index.ts";
  import { Checkbox } from "#lib/components/ui/checkbox/index.ts";
  import { NativeSelect } from "#lib/components/ui/native-select/index.ts";
  import { Badge } from "#lib/components/ui/badge/index.ts";
  import * as Card from "#lib/components/ui/card/index.ts";
  import * as Table from "#lib/components/ui/table/index.ts";
  import * as Tabs from "#lib/components/ui/tabs/index.ts";

  let me = $state<{ id: string; role: StaffRole } | null>(null);
  let perms = $state<Permissions>({}); // Directory permissions (listings, watchers, settings)
  let acctPerms = $state<Permissions>({}); // openRMS-Accounts permissions (users, roles, clubs)
  let accountAudit = $state<StaffAudit[]>([]);
  let tab = $state("users");
  let msg = $state(""), err = $state("");

  let q = $state("");
  let users = $state<StaffUser[]>([]);
  let clubs = $state<StaffClub[]>([]);
  let reports = $state<StaffReport[]>([]);
  let imports = $state<StaffImport[]>([]);
  let audit = $state<StaffAudit[]>([]);
  let watchers = $state<StaffWatcher[]>([]);
  let publishClients = $state(false);
  let optouts = $state<{ callsign: string; reason: string | null; createdAt: string }[]>([]);
  let optCall = $state(""), optReason = $state("");

  $effect(() => {
    if (!$session.isPending && !$session.data?.user) goToAccounts("/login");
  });
  $effect(() => {
    if ($session.data?.user)
      api.me().then((m) => {
        if (!m.user || m.user.role === "user") return goto("/dashboard");
        me = { id: m.user.id, role: m.user.role };
        perms = m.permissions ?? {};
        api.accountsMe().then((a) => {
          acctPerms = a.permissions ?? {};
          if (!tabs.some((t) => t.id === tab)) tab = tabs[0]?.id ?? "reports";
          loadTab();
        });
      });
  });

  const tabs = $derived(
    [
      { id: "users", label: "Users", show: hasPerm(acctPerms, "user", "list") },
      { id: "clubs", label: "Clubs", show: hasPerm(acctPerms, "club", "list") },
      { id: "reports", label: "Reports", show: hasPerm(perms, "report", "list") },
      { id: "imports", label: "Imports", show: hasPerm(perms, "import", "view") },
      { id: "watchers", label: "Watchers", show: hasPerm(perms, "watcher", "list") },
      { id: "settings", label: "Settings & opt-outs", show: hasPerm(perms, "watcher", "list") },
      { id: "audit", label: "Directory log", show: hasPerm(perms, "audit", "view") },
      { id: "account-audit", label: "Account log", show: hasPerm(acctPerms, "audit", "view") },
    ].filter((t) => t.show),
  );

  async function loadTab() {
    err = "";
    try {
      if (tab === "users") users = (await api.staff.users(q)).users;
      if (tab === "clubs") clubs = (await api.staff.clubs()).clubs;
      if (tab === "reports") reports = (await api.staff.reports()).reports;
      if (tab === "imports") imports = (await api.staff.imports()).imports;
      if (tab === "audit") audit = (await api.staff.audit()).entries;
      if (tab === "account-audit") accountAudit = (await api.staff.accountAudit()).entries;
      if (tab === "watchers") watchers = (await api.staff.watchers()).watchers;
      if (tab === "settings") {
        publishClients = (await api.staff.settings()).settings.find((s) => s.key === "publish_client_callsigns")?.value === true;
        if (hasPerm(perms, "optout", "manage")) optouts = (await api.staff.optouts()).optouts;
      }
    } catch (e) {
      err = (e as Error).message;
    }
  }
  async function act(fn: () => Promise<unknown>, ok: string) {
    msg = "";
    err = "";
    try {
      await fn();
      msg = ok;
      await loadTab();
    } catch (e) {
      err = (e as Error).message;
    }
  }

  const roleOf = (r: string | null): StaffRole => {
    const list = (r ?? "user").split(",") as StaffRole[];
    return list.filter((x) => x in RANK).sort((a, b) => RANK[b] - RANK[a])[0] ?? "user";
  };
  // Mirror of the server's rank rules, only to decide what to show; the server enforces them.
  const outranks = (target: string | null) => !!me && RANK[me.role] > RANK[roleOf(target)];
  const assignable = $derived(
    (["user", "moderator", "admin", "superadmin"] as StaffRole[]).filter((r) =>
      r === "user" ? RANK[me?.role ?? "user"] >= 2 : hasPerm(acctPerms, "role", `assign-${r}`) && (me?.role === "superadmin" || RANK[r] < RANK[me?.role ?? "user"]),
    ),
  );
  const METHODS = ["license-lookup", "qrz", "lotw", "on-air", "trustee-docs", "moderator"];
  let method = $state("license-lookup");
</script>

{#if me}
  <div class="mb-2.5 flex flex-wrap items-center gap-3">
    <h1 class="m-0">Staff</h1>
    <Badge variant="open">{me.role}</Badge>
  </div>
  <Tabs.Root value={tab} onValueChange={(v) => { tab = v; loadTab(); }} class="mb-4">
    <Tabs.List class="h-auto flex-wrap group-data-horizontal/tabs:h-auto">
      {#each tabs as t}
        <Tabs.Trigger value={t.id}>{t.label}</Tabs.Trigger>
      {/each}
    </Tabs.List>
  </Tabs.Root>
  {#if msg}<p>{msg}</p>{/if}
  {#if err}<p class="text-destructive">{err}</p>{/if}

  {#if tab === "users"}
    <Card.Root><Card.Content>
      <form class="mb-2 flex flex-wrap items-center gap-3" onsubmit={(e) => { e.preventDefault(); loadTab(); }}>
        <Input class="max-w-[320px]" placeholder="Search callsign, email or name" bind:value={q} />
        <Button type="submit" variant="outline">Search</Button>
        <Label class="text-muted-foreground font-normal">Verification method
          <NativeSelect size="sm" bind:value={method}>{#each METHODS as m}<option>{m}</option>{/each}</NativeSelect>
        </Label>
      </form>
      <Table.Root>
        <Table.Header><Table.Row><Table.Head>Callsign</Table.Head><Table.Head>Account</Table.Head><Table.Head>Callsign status</Table.Head><Table.Head>Role</Table.Head><Table.Head></Table.Head></Table.Row></Table.Header>
        <Table.Body>
          {#each users as u (u.id)}
            <Table.Row class={u.banned ? "[&>td]:opacity-55" : ""}>
              <Table.Cell class="font-mono"><b>{u.callsign}</b></Table.Cell>
              <Table.Cell class="text-sm">{u.name}<div class="text-muted-foreground">{u.email} · joined {ago(u.createdAt)}</div></Table.Cell>
              <Table.Cell class="text-sm">
                {#if u.callsignVerified}<Badge variant="open">verified</Badge> <span class="text-muted-foreground">{u.callsignVerifiedMethod}</span>{:else}<Badge variant="outline">unverified</Badge>{/if}
                {#if hasPerm(acctPerms, "callsign", "verify")}
                  <div>
                    {#if u.callsignVerified}
                      <Button variant="outline" size="sm" onclick={() => act(() => api.staff.verifyUser(u.id, false, ""), `${u.callsign} marked unverified.`)}>Unverify</Button>
                    {:else}
                      <Button size="sm" onclick={() => act(() => api.staff.verifyUser(u.id, true, method), `${u.callsign} verified (${method}).`)}>Verify</Button>
                    {/if}
                  </div>
                {/if}
              </Table.Cell>
              <Table.Cell class="text-sm">
                {#if u.id !== me.id && outranks(u.role) && assignable.length}
                  <NativeSelect size="sm" value={roleOf(u.role)} onchange={(e) => act(() => api.staff.setRole(u.id, (e.target as HTMLSelectElement).value as StaffRole), `${u.callsign} role updated.`)}>
                    {#each assignable as r}<option value={r}>{r}</option>{/each}
                    {#if !assignable.includes(roleOf(u.role))}<option value={roleOf(u.role)} disabled>{roleOf(u.role)}</option>{/if}
                  </NativeSelect>
                {:else}
                  {roleOf(u.role)}
                {/if}
              </Table.Cell>
              <Table.Cell class="text-right">
                {#if hasPerm(acctPerms, "user", "ban") && u.id !== me.id && outranks(u.role)}
                  {#if u.banned}
                    <Button variant="outline" size="sm" onclick={() => act(() => api.staff.unban(u.id), `${u.callsign} unbanned.`)}>Unban</Button>
                  {:else}
                    <Button variant="destructive" size="sm" onclick={() => { const r = window.prompt(`Ban ${u.callsign}? Reason:`); if (r) act(() => api.staff.ban(u.id, r), `${u.callsign} banned.`); }}>Ban</Button>
                  {/if}
                {/if}
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </Card.Content></Card.Root>
  {:else if tab === "clubs"}
    <Card.Root><Card.Content>
      <Table.Root>
        <Table.Header><Table.Row><Table.Head>Callsign</Table.Head><Table.Head>Name</Table.Head><Table.Head>Members</Table.Head><Table.Head>Status</Table.Head></Table.Row></Table.Header>
        <Table.Body>
          {#each clubs as c (c.id)}
            <Table.Row>
              <Table.Cell class="font-mono"><b>{c.callsign}</b></Table.Cell>
              <Table.Cell>{c.name}</Table.Cell>
              <Table.Cell class="text-sm font-mono">{c.members}</Table.Cell>
              <Table.Cell class="text-sm">
                {#if c.callsignVerified}
                  <Badge variant="open">verified</Badge> <span class="text-muted-foreground">{c.callsignVerifiedMethod}</span>
                  {#if hasPerm(acctPerms, "club", "verify")}<Button variant="outline" size="sm" onclick={() => act(() => api.staff.verifyClub(c.id, false, ""), `${c.callsign} unverified.`)}>Unverify</Button>{/if}
                {:else if hasPerm(acctPerms, "club", "verify")}
                  <Button size="sm" onclick={() => act(() => api.staff.verifyClub(c.id, true, "trustee-docs"), `${c.callsign} verified.`)}>Verify trustee</Button>
                {:else}<Badge variant="outline">unverified</Badge>{/if}
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </Card.Content></Card.Root>
  {:else if tab === "reports"}
    <Card.Root><Card.Content>
      {#if reports.length === 0}<p class="text-muted-foreground my-0">No open reports.</p>{/if}
      {#each reports as r (r.id)}
        <div class="border-b py-2.5">
          <div class="flex flex-wrap items-center gap-3"><a class="font-mono" href="/gateway/{r.gateway_id}"><b>{r.callsign}</b></a><span class="text-sm text-muted-foreground">{ago(r.created_at)}</span></div>
          <p class="my-1">{r.reason}</p>
          <div class="flex flex-wrap items-center gap-3">
            {#if hasPerm(perms, "gateway", "hide")}
              <Button variant="destructive" size="sm" onclick={() => act(() => api.staff.hide(r.gateway_id, true, r.reason), `${r.callsign} hidden.`)}>Hide listing</Button>
            {/if}
            {#if hasPerm(perms, "report", "resolve")}
              <Button variant="outline" size="sm" onclick={() => act(() => api.staff.resolve(r.id), "Report resolved.")}>Resolve</Button>
            {/if}
          </div>
        </div>
      {/each}
    </Card.Content></Card.Root>
  {:else if tab === "imports"}
    <Card.Root><Card.Content>
      {#if hasPerm(perms, "import", "run")}
        <Button onclick={() => act(() => api.staff.runImport(), "Winlink import finished.")}>Run Winlink import now</Button>
      {/if}
      <Table.Root class="mt-3">
        <Table.Header><Table.Row><Table.Head>Started</Table.Head><Table.Head>Result</Table.Head><Table.Head>Gateways</Table.Head><Table.Head>Channels</Table.Head><Table.Head>Message</Table.Head></Table.Row></Table.Header>
        <Table.Body>
          {#each imports as i (i.id)}
            <Table.Row>
              <Table.Cell class="text-sm">{ago(i.started_at)}</Table.Cell>
              <Table.Cell class="text-sm">{i.ok === null ? "running" : i.ok ? "ok" : "failed"}</Table.Cell>
              <Table.Cell class="text-sm">{i.gateways ?? ""}</Table.Cell>
              <Table.Cell class="text-sm">{i.channels ?? ""}</Table.Cell>
              <Table.Cell class="text-sm text-muted-foreground">{i.message ?? ""}</Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </Card.Content></Card.Root>
  {:else if tab === "watchers"}
    <Card.Root><Card.Content>
      <Table.Root>
        <Table.Header><Table.Row><Table.Head>Watcher</Table.Head><Table.Head>Owner</Table.Head><Table.Head>Events</Table.Head><Table.Head>Last upload</Table.Head><Table.Head></Table.Head></Table.Row></Table.Header>
        <Table.Body>
          {#each watchers as w (w.id)}
            <Table.Row>
              <Table.Cell><b>{w.name}</b> <span class="text-sm text-muted-foreground">{w.gridsquare ?? ""}</span>{#if w.lastStatus?.software}<div class="text-sm text-muted-foreground">{w.lastStatus.software}</div>{/if}</Table.Cell>
              <Table.Cell class="text-sm"><span class="font-mono">{w.callsign}</span> {#if w.ownerVerified}<Badge variant="open">verified</Badge>{:else}<Badge variant="outline">unverified</Badge>{/if}</Table.Cell>
              <Table.Cell class="text-sm">{w.events}</Table.Cell>
              <Table.Cell class="text-sm">{ago(w.lastSeenAt)}{#if w.disabled}<div class="text-destructive">disabled{w.disabledReason ? `: ${w.disabledReason}` : ""}</div>{/if}</Table.Cell>
              <Table.Cell class="text-right">
                {#if hasPerm(perms, "watcher", "disable")}
                  {#if w.disabled}
                    <Button variant="outline" size="sm" onclick={() => act(() => api.staff.disableWatcher(w.id, false, ""), `${w.name} enabled.`)}>Enable</Button>
                  {:else}
                    <Button variant="destructive" size="sm" onclick={() => { const r = window.prompt(`Disable ${w.name}? Reason:`); if (r) act(() => api.staff.disableWatcher(w.id, true, r), `${w.name} disabled.`); }}>Disable</Button>
                  {/if}
                {/if}
                {#if hasPerm(perms, "watcher", "purge")}
                  <Button variant="destructive" size="sm" onclick={() => { if (window.confirm(`Delete all ${w.events} events from ${w.name}?`)) act(() => api.staff.purgeWatcher(w.id), "Events purged."); }}>Purge events</Button>
                {/if}
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </Card.Content></Card.Root>
  {:else if tab === "settings"}
    <Card.Root><Card.Content>
      <h2>Client callsigns in watcher data</h2>
      <p class="text-sm text-muted-foreground">
        Watchers report the callsigns of stations connecting to gateways. They are always stored. While this is off, the public
        live feed, events API and gateway pages say "a client"; staff with the right role still see them. Callsigns on the opt-out
        list stay hidden in public even when this is on.
      </p>
      <Label class="font-normal">
        <Checkbox checked={publishClients} disabled={!hasPerm(perms, "setting", "edit")}
          onCheckedChange={(v) => act(() => api.staff.setSetting("publish_client_callsigns", v), "Setting saved.")} />
        Publish client callsigns
      </Label>
      {#if !hasPerm(perms, "setting", "edit")}<p class="text-sm text-muted-foreground">Only admins can change this.</p>{/if}
    </Card.Content></Card.Root>
    {#if hasPerm(perms, "optout", "manage")}
      <Card.Root class="mt-4"><Card.Content>
        <h2>Opt-out list</h2>
        <form class="flex flex-wrap items-center gap-3" onsubmit={(e) => { e.preventDefault(); act(() => api.staff.addOptout(optCall.trim().toUpperCase(), optReason), `${optCall.toUpperCase()} added.`).then(() => { optCall = ""; optReason = ""; }); }}>
          <Input class="max-w-[160px] font-mono" placeholder="Callsign" bind:value={optCall} required />
          <Input class="max-w-[320px]" placeholder="Reason / how they asked" bind:value={optReason} />
          <Button type="submit" variant="outline">Add</Button>
        </form>
        <Table.Root class="mt-2.5">
          <Table.Body>
            {#each optouts as o (o.callsign)}
              <Table.Row>
                <Table.Cell class="font-mono">{o.callsign}</Table.Cell><Table.Cell class="text-sm text-muted-foreground">{o.reason ?? ""}</Table.Cell><Table.Cell class="text-sm">{ago(o.createdAt)}</Table.Cell>
                <Table.Cell class="text-right"><Button variant="outline" size="sm" onclick={() => act(() => api.staff.removeOptout(o.callsign), `${o.callsign} removed.`)}>Remove</Button></Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </Card.Content></Card.Root>
    {/if}
  {:else if tab === "audit"}
    <Card.Root><Card.Content>
      <Table.Root>
        <Table.Header><Table.Row><Table.Head>When</Table.Head><Table.Head>Who</Table.Head><Table.Head>Action</Table.Head><Table.Head>Target</Table.Head><Table.Head>Detail</Table.Head></Table.Row></Table.Header>
        <Table.Body>
          {#each audit as a (a.id)}
            <Table.Row>
              <Table.Cell class="text-sm">{ago(a.created_at)}</Table.Cell>
              <Table.Cell class="font-mono text-sm">{a.actor_callsign ?? "server"}</Table.Cell>
              <Table.Cell class="text-sm">{a.action}</Table.Cell>
              <Table.Cell class="text-sm font-mono">{a.target}</Table.Cell>
              <Table.Cell class="text-sm text-muted-foreground font-mono">{a.detail ?? ""}</Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </Card.Content></Card.Root>
  {:else if tab === "account-audit"}
    <Card.Root><Card.Content>
      <Table.Root>
        <Table.Header><Table.Row><Table.Head>When</Table.Head><Table.Head>Who</Table.Head><Table.Head>Action</Table.Head><Table.Head>Target</Table.Head><Table.Head>Detail</Table.Head></Table.Row></Table.Header>
        <Table.Body>
          {#each accountAudit as a (a.id)}
            <Table.Row>
              <Table.Cell class="text-sm">{ago(a.created_at)}</Table.Cell>
              <Table.Cell class="font-mono text-sm">{a.actor_callsign ?? "server"}</Table.Cell>
              <Table.Cell class="text-sm">{a.action}</Table.Cell>
              <Table.Cell class="text-sm font-mono">{a.target}</Table.Cell>
              <Table.Cell class="text-sm text-muted-foreground font-mono">{a.detail ?? ""}</Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </Card.Content></Card.Root>
  {/if}
{/if}

