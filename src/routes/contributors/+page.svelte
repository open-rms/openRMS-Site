<script lang="ts">
  import { api, ago, type Contributor } from "#lib/api.ts";
  import StatusDot from "#lib/StatusDot.svelte";
  import { Badge } from "#lib/components/ui/badge/index.ts";
  import { NativeSelect } from "#lib/components/ui/native-select/index.ts";
  import * as Card from "#lib/components/ui/card/index.ts";
  import * as Table from "#lib/components/ui/table/index.ts";

  let days = $state(7);
  let data = $state<Awaited<ReturnType<typeof api.contributors>> | null>(null);
  let err = $state("");
  $effect(() => {
    api.contributors(days).then((d) => (data = d)).catch((e) => (err = e.message));
  });
  const rank = (i: number) => i + 1;
</script>

<div class="mb-4 flex flex-wrap items-end justify-between gap-4">
  <div>
    <h1 class="mb-1">Watchers</h1>
    <p class="m-0 max-w-[62ch] text-muted-foreground">
      People running openRMS-Watch receivers that report what they hear on the air. Thank you. Want to help?
      Install openRMS-Watch, then add your receiver on your <a href="/dashboard">dashboard</a> or link it with its on-screen code.
    </p>
  </div>
  <NativeSelect bind:value={days} aria-label="Period">
    <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
  </NativeSelect>
</div>
{#if err}<p class="text-destructive">{err}</p>{/if}

{#if data}
  <div class="mb-4 flex flex-wrap gap-6">
    <div><b class="text-2xl tabular-nums">{data.totals.watchers}</b><div class="text-xs text-muted-foreground">active watchers</div></div>
    <div><b class="text-2xl tabular-nums">{data.totals.live}</b><div class="text-xs text-muted-foreground">live now</div></div>
    <div><b class="text-2xl tabular-nums">{data.totals.listeningHours.toLocaleString()}</b><div class="text-xs text-muted-foreground">listening hours</div></div>
    <div><b class="text-2xl tabular-nums">{data.totals.frames.toLocaleString()}</b><div class="text-xs text-muted-foreground">frames reported</div></div>
  </div>
  <Card.Root class="py-0">
    <Card.Content class="px-0">
      <Table.Root>
        <Table.Header>
          <Table.Row><Table.Head>#</Table.Head><Table.Head>Operator</Table.Head><Table.Head>Watcher</Table.Head><Table.Head>Bands</Table.Head><Table.Head>Listening</Table.Head><Table.Head>Frames</Table.Head><Table.Head>Status</Table.Head></Table.Row>
        </Table.Header>
        <Table.Body>
          {#each data.contributors as c, i (c.callsign + c.watcher)}
            <Table.Row>
              <Table.Cell class="tabular-nums text-muted-foreground">{rank(i)}</Table.Cell>
              <Table.Cell><span class="font-mono font-bold">{c.callsign}</span> {#if c.ownerVerified}<Badge variant="open">verified</Badge>{/if}</Table.Cell>
              <Table.Cell class="text-sm">{c.watcher}<div class="font-mono text-xs text-muted-foreground">{c.gridsquare ?? ""}</div></Table.Cell>
              <Table.Cell class="text-xs">{c.bands.join(", ")}</Table.Cell>
              <Table.Cell class="tabular-nums text-sm">{c.listeningHours} h</Table.Cell>
              <Table.Cell class="tabular-nums text-sm">{c.frames}</Table.Cell>
              <Table.Cell class="text-xs">{#if c.live}<StatusDot status="online" />live{:else}{ago(c.lastSeen)}{/if}<div class="text-muted-foreground">since {c.firstContribution.slice(0, 10)}</div></Table.Cell>
            </Table.Row>
          {:else}
            <Table.Row><Table.Cell colspan={7} class="text-muted-foreground">No watcher reported in this period yet.</Table.Cell></Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </Card.Content>
  </Card.Root>
  {#if data.totals.anonymous}<p class="text-xs text-muted-foreground">Plus {data.totals.anonymous} watcher{data.totals.anonymous === 1 ? "" : "s"} whose owners chose not to be listed.</p>{/if}
{/if}
