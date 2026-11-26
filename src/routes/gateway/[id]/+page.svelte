<script lang="ts">
  import { page } from "$app/state";
  import { api, fmtFreq, ago, hasPerm, STATUS_LABEL, STATUS_HELP, type Gateway, type WatchEvent } from "#lib/api.ts";
  import { session } from "#lib/auth.ts";
  import { goto } from "$app/navigation";
  import GatewayMap from "#lib/GatewayMap.svelte";
  import StatusDot from "#lib/StatusDot.svelte";
  import { Button } from "#lib/components/ui/button/index.ts";
  import { Textarea } from "#lib/components/ui/textarea/index.ts";
  import { Badge } from "#lib/components/ui/badge/index.ts";
  import * as Card from "#lib/components/ui/card/index.ts";
  import * as Table from "#lib/components/ui/table/index.ts";

  let g = $state<Gateway | null>(null);
  let err = $state("");
  let reportOpen = $state(false);
  let reason = $state("");
  let reportMsg = $state("");

  let heardEvents = $state<WatchEvent[]>([]);
  $effect(() => {
    const id = page.params.id!;
    g = null;
    heardEvents = [];
    api.gateway(id).then((x) => {
      g = x;
      api.events({ gateway: x.id, limit: "8" }).then((r) => (heardEvents = r.events)).catch(() => {});
    }).catch((e) => (err = e.message));
  });
  const KIND: Record<string, string> = { CALL: "called by", ACCEPT: "answered", CQ: "CQ", ATTEMPT_ACCEPTED: "connected", ATTEMPT: "unanswered call" };

  let claimErr = $state("");
  async function claim() {
    try {
      await api.claim(g!.id);
      goto("/dashboard");
    } catch (e) {
      claimErr = (e as Error).message;
    }
  }
  let myCalls = $state<string[]>([]);
  let canHide = $state(false);
  $effect(() => {
    if ($session.data?.user)
      api.me().then((m) => {
        myCalls = (m.callsigns ?? []).map((x) => x.callsign);
        canHide = hasPerm(m.permissions, "gateway", "hide");
      });
  });
  async function hide() {
    const reason = window.prompt(`Hide ${g!.callsign} from the directory? Reason:`);
    if (!reason) return;
    try {
      await api.staff.hide(g!.id, true, reason);
      reportMsg = "Listing hidden.";
    } catch (e) {
      reportMsg = (e as Error).message;
    }
  }
  const canClaim = $derived(!!g && g.source === "winlink" && !g.claimed && myCalls.includes(g.baseCallsign));
  async function report() {
    try {
      await api.report(g!.id, reason);
      reportMsg = "Thanks. A moderator will look at it.";
      reportOpen = false;
    } catch (e) {
      reportMsg = (e as Error).message;
    }
  }
  const hasEmcomm = (e: Gateway["emcomm"]) =>
    !!e && ((e.backupPower?.length ?? 0) > 0 || !!e.runtimeHours || !!e.offGrid || !!e.lastTested || !!e.aresRaces || !!e.servedAgencies || !!e.activationContact);
  const power = (e: Gateway["emcomm"]) => (e.backupPower ?? []).filter((p) => p !== "grid-only");
</script>

{#if err}
  <p class="text-destructive">{err}</p>
{:else if !g}
  <p class="text-muted-foreground">Loading…</p>
{:else}
  <div class="flex flex-wrap items-center gap-2.5">
    <h1 class="m-0 font-mono">{g.callsign}</h1>
    <Badge variant="outline"><StatusDot status={g.status} class="mr-0" />{STATUS_LABEL[g.status]}</Badge>
    {#if g.source === "winlink"}
      <Badge variant="outline">From the Winlink list</Badge>
      {#if g.claimed}
        <Badge variant="open">Claimed by {g.club ? g.club.name : "sysop"}</Badge>
        {#if g.ownerVerified}<Badge variant="open">Callsign verified</Badge>{:else}<Badge variant="outline">Callsign not yet verified</Badge>{/if}
      {/if}
    {:else}
      <Badge variant="open">Listed by {g.club ? g.club.name : "sysop"}</Badge>
      {#if g.ownerVerified}<Badge variant="open">Callsign verified</Badge>{:else}<Badge variant="outline">Callsign not yet verified</Badge>{/if}
      {#if g.winlinkListed}<Badge variant="outline">Also on Winlink</Badge>{/if}
    {/if}
  </div>
  {#if g.unverifiedConflict}
    <Card.Root class="ring-stale my-2.5 text-sm">
      <Card.Content>This callsign is also on the Winlink list. Until the sysop's callsign is verified,
        Pat and other clients get the Winlink listing, not this one.</Card.Content>
    </Card.Root>
  {/if}
  {#if canClaim}
    <Card.Root class="ring-primary my-2.5 text-sm">
      <Card.Content>
        This listing is under {g.baseCallsign}, a callsign you manage. <Button size="sm" onclick={claim}>Claim it</Button>
        to add comments and emcomm readiness. {#if claimErr}<span class="text-destructive">{claimErr}</span>{/if}
      </Card.Content>
    </Card.Root>
  {/if}
  <p class="text-muted-foreground">{STATUS_HELP[g.status]}. Last seen {ago(g.lastSeenAt)}.{#if g.comments} · {g.comments}{/if}</p>

  <div class="grid items-start gap-5 min-[861px]:grid-cols-[1fr_340px]">
    <div class="flex min-w-0 flex-col gap-4">
      <Card.Root>
        <Card.Header><Card.Title><h2 class="m-0">Channels</h2></Card.Title></Card.Header>
        <Card.Content>
          <Table.Root>
            <Table.Header><Table.Row><Table.Head>Frequency (centre)</Table.Head><Table.Head>Mode</Table.Head><Table.Head>Service code</Table.Head><Table.Head>Hours</Table.Head><Table.Head>Notes</Table.Head></Table.Row></Table.Header>
            <Table.Body>
              {#each g.channels as c}
                <Table.Row>
                  <Table.Cell class="font-mono">{fmtFreq(c.frequencyHz)} <span class="text-muted-foreground text-sm">{c.band ?? ""}</span></Table.Cell>
                  <Table.Cell>
                    <b>{c.modemLabel}</b>{c.variant ? ` ${c.variant}` : ""}
                    {#if c.modemVersion}<div class="text-muted-foreground text-sm">v{c.modemVersion}</div>{/if}
                    {#if c.winlinkSupportedModes && c.winlinkSupportedModes !== `${c.modemLabel}${c.variant ? " " + c.variant : ""}`}
                      <div class="text-muted-foreground text-sm">Winlink lists it as “{c.winlinkSupportedModes}”</div>
                    {/if}
                  </Table.Cell>
                  <Table.Cell class="font-mono text-sm">{c.serviceCode}</Table.Cell>
                  <Table.Cell class="text-sm">{c.operatingHours}</Table.Cell>
                  <Table.Cell class="text-sm">{c.antenna}{c.notes ? ` · ${c.notes}` : ""}</Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
          {#if g.live?.currentFrequencyHz}
            <p class="mb-0 text-sm">Now: {fmtFreq(g.live.currentFrequencyHz)} {g.live.currentModem ?? ""} {g.live.busy ? "· in a session" : ""}</p>
          {/if}
        </Card.Content>
      </Card.Root>

      {#if g.heardOnAir || heardEvents.length}
        <Card.Root>
          <Card.Header>
            <Card.Title><h2 class="m-0">Heard on the air</h2></Card.Title>
            <Card.Description>Independent reports from community <a href="/contributors">watchers</a>. They never change the listing.</Card.Description>
          </Card.Header>
          <Card.Content class="grid gap-3 text-sm">
            {#if g.heardOnAir}
              <div class="flex flex-wrap items-center gap-2">
                <Badge variant={g.heardOnAir.confidence === "confirmed" ? "open" : "outline"}>{g.heardOnAir.confidence}</Badge>
                <span>last heard {ago(g.heardOnAir.lastHeard)} on <span class="font-mono">{fmtFreq(g.heardOnAir.dialHz)}</span> (dial)</span>
                <span class="text-muted-foreground">· {g.heardOnAir.watchers} watcher{g.heardOnAir.watchers === 1 ? "" : "s"}</span>
              </div>
            {:else}
              <p class="m-0 text-muted-foreground">Calls to this gateway were heard, but not the gateway itself answering.</p>
            {/if}
            {#if heardEvents.length}
              <ul class="m-0 grid list-none gap-1 p-0 text-xs">
                {#each heardEvents as e (e.id)}
                  <li><span class="font-mono">{e.ts.slice(5, 16).replace("T", " ")}Z</span> · {KIND[e.kind ?? ""] ?? e.kind}{e.kind === "CALL" && e.client ? ` ${e.client}` : ""} · <span class="font-mono">{e.dialHz ? fmtFreq(e.dialHz) : ""}</span> · {e.watcher.name}</li>
                {/each}
              </ul>
              <a class="text-xs" href="/live">Live feed →</a>
            {/if}
          </Card.Content>
        </Card.Root>
      {/if}

      {#if g.ownerComments}
        <Card.Root>
          <Card.Header><Card.Title><h2 class="m-0">From the sysop</h2></Card.Title></Card.Header>
          <Card.Content>
            <p class="m-0 whitespace-pre-wrap">{g.ownerComments}</p>
            {#if !g.ownerVerified}<p class="text-muted-foreground mb-0 text-sm">Added by the account holding this callsign, not yet verified.</p>{/if}
          </Card.Content>
        </Card.Root>
      {/if}

      {#if hasEmcomm(g.emcomm)}
        <Card.Root>
          <Card.Header><Card.Title><h2 class="m-0">Emcomm readiness</h2></Card.Title></Card.Header>
          <Card.Content>
            <dl class="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 [&_dt]:text-muted-foreground">
              {#if power(g.emcomm).length}<dt>Backup power</dt><dd>{power(g.emcomm).join(", ")}</dd>{/if}
              {#if g.emcomm.runtimeHours}<dt>Runtime</dt><dd>{g.emcomm.runtimeHours} h</dd>{/if}
              {#if g.emcomm.offGrid}<dt>Off-grid</dt><dd>Yes</dd>{/if}
              {#if g.emcomm.lastTested}<dt>Last tested</dt><dd>{g.emcomm.lastTested}</dd>{/if}
              {#if g.emcomm.aresRaces}<dt>ARES/RACES</dt><dd>Yes</dd>{/if}
              {#if g.emcomm.servedAgencies}<dt>Serves</dt><dd>{g.emcomm.servedAgencies}</dd>{/if}
              {#if g.emcomm.activationContact}<dt>Activation contact</dt><dd>{g.emcomm.activationContact}</dd>{/if}
            </dl>
          </Card.Content>
        </Card.Root>
      {/if}
    </div>

    <div class="flex min-w-0 flex-col gap-4">
      {#if g.latitude != null && g.longitude != null}
        <div><GatewayMap gateways={[g]} height="280px" center={[g.latitude, g.longitude]} /></div>
      {/if}
      <Card.Root>
        <Card.Content class="text-sm">
          <div><b>Grid:</b> <span class="font-mono">{g.gridsquare ?? "—"}</span>{g.locationPrecision !== "exact" ? " (approximate)" : ""}</div>
          {#if g.software}<div><b>Software:</b> {g.software}</div>{/if}
          <div><b>API:</b> <a href="/api/v1/gateways/{g.id}">JSON</a></div>
          {#if $session.data?.user}
            <div class="mt-2.5">
              {#if reportOpen}
                <Textarea rows={3} bind:value={reason} placeholder="What's wrong with this listing?" />
                <div class="mt-1.5 flex flex-wrap items-center gap-3">
                  <Button onclick={report} disabled={!reason.trim()}>Send report</Button>
                  <Button variant="outline" onclick={() => (reportOpen = false)}>Cancel</Button>
                </div>
              {:else}
                <Button variant="outline" size="sm" onclick={() => (reportOpen = true)}>Report a problem</Button>
              {/if}
            </div>
          {/if}
          {#if canHide}<div class="mt-2.5"><Button variant="destructive" size="sm" onclick={hide}>Hide listing (staff)</Button></div>{/if}
          {#if reportMsg}<p class="mb-0">{reportMsg}</p>{/if}
        </Card.Content>
      </Card.Root>
    </div>
  </div>
{/if}
