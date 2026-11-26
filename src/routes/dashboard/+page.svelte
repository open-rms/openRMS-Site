<script lang="ts">
  import { goToAccounts } from "#lib/config.ts";
  import { goto } from "$app/navigation";
  import { api, ago, fmtFreq, STATUS_LABEL, type Gateway } from "#lib/api.ts";
  import { session } from "#lib/auth.ts";
  import GatewayForm from "#lib/GatewayForm.svelte";
  import ClaimDetailsForm from "#lib/ClaimDetailsForm.svelte";
  import ClubsCard from "#lib/ClubsCard.svelte";
  import WatchersCard from "#lib/WatchersCard.svelte";
  import StatusDot from "#lib/StatusDot.svelte";
  import { Button } from "#lib/components/ui/button/index.ts";
  import { Input } from "#lib/components/ui/input/index.ts";
  import { NativeSelect } from "#lib/components/ui/native-select/index.ts";
  import { Badge } from "#lib/components/ui/badge/index.ts";
  import * as Card from "#lib/components/ui/card/index.ts";
  import * as Table from "#lib/components/ui/table/index.ts";

  let gateways = $state<Gateway[]>([]);
  let editing = $state<Gateway | "new" | null>(null);
  let claimable = $state<(Gateway & { claimedByMe: boolean; claimedByOther: boolean })[]>([]);
  let editingClaim = $state<Gateway | null>(null);
  let myCalls = $state<string[]>([]);
  let keys = $state<{ id: string; name: string | null; start: string | null; createdAt: string; metadata?: any }[]>([]);
  let newKey = $state<string | null>(null);
  let keyName = $state("");
  let keyGateway = $state("");
  let msg = $state("");

  $effect(() => {
    if (!$session.isPending && !$session.data?.user) goToAccounts("/login");
  });

  async function load() {
    gateways = (await api.myGateways()).gateways;
    claimable = (await api.claimable()).gateways;
    myCalls = ((await api.me()).callsigns ?? []).map((m) => m.callsign);
    // Gateway keys are owned by the Directory (identity.md §5).
    keys = (await api.gatewayKeys()).keys.map((k) => ({ ...k, metadata: { gatewayIds: k.gatewayIds ?? [] } }));
  }
  $effect(() => {
    if ($session.data?.user) load().catch((e) => (msg = e.message));
  });

  async function confirm(g: Gateway) {
    await api.confirmGateway(g.id);
    msg = `${g.callsign} confirmed on the air.`;
    load();
  }
  async function remove(g: Gateway) {
    if (!window.confirm(`Remove ${g.callsign} from the directory?`)) return;
    await api.deleteGateway(g.id);
    load();
  }
  async function claim(g: Gateway) {
    try {
      await api.claim(g.id);
      msg = `${g.callsign} claimed. Add your details below.`;
      await load();
      editingClaim = claimable.find((x) => x.id === g.id) ?? null;
    } catch (e) {
      msg = (e as Error).message;
    }
  }
  async function release(g: Gateway) {
    if (!window.confirm(`Release ${g.callsign}? The details you added will be removed. The Winlink listing stays.`)) return;
    await api.release(g.id);
    load();
  }
  async function createKey(e: Event) {
    e.preventDefault();
    try {
      newKey = (await api.createGatewayKey(keyName || "gateway", keyGateway ? [keyGateway] : null)).key;
    } catch (x) {
      msg = (x as Error).message;
      return;
    }
    keyName = "";
    load();
  }
  async function revoke(id: string) {
    await api.revokeGatewayKey(id);
    load();
  }
  const user = $derived($session.data?.user);
</script>

{#if user}
  <div class="mb-2.5 flex flex-wrap items-center gap-3">
    <h1 class="m-0">Your gateways</h1>
    <span class="font-mono">{user.callsign}</span>
    {#if user.callsignVerified}
      <Badge variant="open">callsign verified</Badge>
    {:else}
      <Badge variant="outline" title="A moderator confirms callsigns. Your listings appear meanwhile, marked unverified.">callsign not yet verified</Badge>
    {/if}
  </div>
  {#if msg}<p>{msg}</p>{/if}

  {#if editingClaim}
    <ClaimDetailsForm
      gateway={editingClaim}
      onsaved={() => { msg = `Details for ${editingClaim?.callsign} saved.`; editingClaim = null; load(); }}
      oncancel={() => (editingClaim = null)}
    />
  {:else if editing}
    <GatewayForm
      callsign={user.callsign}
      callsigns={myCalls}
      existing={editing === "new" ? undefined : editing}
      onsaved={() => { editing = null; load(); }}
      oncancel={() => (editing = null)}
    />
  {:else}
    <div class="flex flex-col gap-5">
      <Card.Root>
        <Card.Content>
          {#if gateways.length === 0}
            <p class="mt-0">You have not listed a gateway yet.</p>
          {:else}
            <Table.Root>
              <Table.Header><Table.Row><Table.Head>Callsign</Table.Head><Table.Head>Channels</Table.Head><Table.Head>Status</Table.Head><Table.Head></Table.Head></Table.Row></Table.Header>
              <Table.Body>
                {#each gateways as g}
                  <Table.Row>
                    <Table.Cell><a class="font-mono" href="/gateway/{g.id}"><b>{g.callsign}</b></a>{#if g.club}<div class="text-muted-foreground text-sm">{g.club.name}</div>{/if}{#if g.hidden}<div class="text-destructive text-sm">hidden by a moderator</div>{/if}</Table.Cell>
                    <Table.Cell class="text-sm">{#each g.channels as c}<div>{fmtFreq(c.frequencyHz)} {c.modemLabel} {c.variant ?? ""}</div>{/each}</Table.Cell>
                    <Table.Cell class="text-sm">
                      <StatusDot status={g.status} />{STATUS_LABEL[g.status]}
                      <div class="text-muted-foreground">heartbeat {ago(g.lastHeartbeatAt)}<br />confirmed {ago(g.confirmedAt)}</div>
                    </Table.Cell>
                    <Table.Cell class="text-right whitespace-nowrap">
                      <Button variant="outline" size="sm" onclick={() => confirm(g)} title="Keeps a listing without automatic heartbeats current">Still on the air</Button>
                      <Button variant="outline" size="sm" onclick={() => (editing = g)}>Edit</Button>
                      <Button variant="destructive" size="sm" onclick={() => remove(g)}>Remove</Button>
                    </Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          {/if}
          <Button class="mt-3" onclick={() => (editing = "new")}>+ List a gateway</Button>
        </Card.Content>
      </Card.Root>

      <ClubsCard myUserId={user.id} onchange={load} />

      <Card.Root>
        <Card.Header>
          <Card.Title><h2 class="m-0">Your gateways on the Winlink list</h2></Card.Title>
          {#if claimable.length === 0}
            <Card.Description>No gateway under {myCalls.join(", ") || user.callsign} is on the Winlink list right now.</Card.Description>
          {:else}
            <Card.Description>
              Claim a Winlink listing under your callsigns or clubs to add comments and emcomm readiness to its page here.
              Its channels and status keep updating from Winlink.
            </Card.Description>
          {/if}
        </Card.Header>
        {#if claimable.length > 0}
          <Card.Content>
            <Table.Root>
              <Table.Header><Table.Row><Table.Head>Callsign</Table.Head><Table.Head>Channels</Table.Head><Table.Head>Status</Table.Head><Table.Head></Table.Head></Table.Row></Table.Header>
              <Table.Body>
                {#each claimable as g}
                  <Table.Row>
                    <Table.Cell><a class="font-mono" href="/gateway/{g.id}"><b>{g.callsign}</b></a></Table.Cell>
                    <Table.Cell class="text-sm">{#each g.channels as c}<div>{fmtFreq(c.frequencyHz)} {c.winlinkSupportedModes ?? c.modemLabel}</div>{/each}</Table.Cell>
                    <Table.Cell class="text-sm"><StatusDot status={g.status} />{STATUS_LABEL[g.status]}<div class="text-muted-foreground">{ago(g.lastSeenAt)}</div></Table.Cell>
                    <Table.Cell class="text-right whitespace-nowrap">
                      {#if g.claimedByMe}
                        <Badge variant="open">claimed</Badge>
                        <Button variant="outline" size="sm" onclick={() => (editingClaim = g)}>Edit details</Button>
                        <Button variant="destructive" size="sm" onclick={() => release(g)}>Release</Button>
                      {:else if g.claimedByOther}
                        <span class="text-muted-foreground text-sm">claimed by another account; contact a moderator</span>
                      {:else}
                        <Button size="sm" onclick={() => claim(g)}>Claim</Button>
                      {/if}
                    </Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </Card.Content>
        {/if}
      </Card.Root>

      <WatchersCard />

      <Card.Root>
        <Card.Header>
          <Card.Title><h2 class="m-0">API keys for gateway software</h2></Card.Title>
          <Card.Description>
            Gateway software sends a heartbeat with a key, so the listing shows <b>Online</b> without you confirming it by hand.
            See <a href="/developers#heartbeat">the heartbeat example</a>. A key limited to one gateway can only report for that gateway.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          {#if newKey}
            <div class="bg-primary-soft mb-3 rounded-lg p-3">
              <b>Copy this key now; it is not shown again.</b>
              <pre>{newKey}</pre>
              <Button variant="outline" size="sm" onclick={() => (newKey = null)}>Done</Button>
            </div>
          {/if}
          <form class="flex flex-wrap items-center gap-3" onsubmit={createKey}>
            <Input class="max-w-[240px]" placeholder="Key name (e.g. linbpq-shack)" bind:value={keyName} />
            <NativeSelect class="max-w-[220px]" bind:value={keyGateway}>
              <option value="">Any of my gateways</option>
              {#each gateways as g}<option value={g.id}>Only {g.callsign}</option>{/each}
            </NativeSelect>
            <Button type="submit">Create key</Button>
          </form>
          {#if keys.length}
            <Table.Root class="mt-3">
              <Table.Header><Table.Row><Table.Head>Name</Table.Head><Table.Head>Starts with</Table.Head><Table.Head>Limited to</Table.Head><Table.Head>Created</Table.Head><Table.Head></Table.Head></Table.Row></Table.Header>
              <Table.Body>
                {#each keys as k}
                  <Table.Row>
                    <Table.Cell>{k.name}</Table.Cell>
                    <Table.Cell class="font-mono">{k.start}…</Table.Cell>
                    <Table.Cell class="text-sm">{(k.metadata?.gatewayIds ?? []).map((id: string) => gateways.find((g) => g.id === id)?.callsign ?? id).join(", ") || "all"}</Table.Cell>
                    <Table.Cell class="text-sm">{ago(k.createdAt)}</Table.Cell>
                    <Table.Cell><Button variant="destructive" size="sm" onclick={() => revoke(k.id)}>Revoke</Button></Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          {/if}
        </Card.Content>
      </Card.Root>
    </div>
  {/if}
{/if}
