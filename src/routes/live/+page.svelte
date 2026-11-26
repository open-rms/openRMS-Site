<script lang="ts">
  // On the air: Mercury connections heard by community watchers, live (SSE) and as sightings.
  import { onMount } from "svelte";
  import { api, ago, fmtFreq, type Sighting, type WatchEvent } from "#lib/api.ts";
  import { Badge } from "#lib/components/ui/badge/index.ts";
  import { NativeSelect } from "#lib/components/ui/native-select/index.ts";
  import * as Card from "#lib/components/ui/card/index.ts";
  import * as Table from "#lib/components/ui/table/index.ts";

  const BANDS = ["", "80m", "60m", "40m", "30m", "20m", "17m", "15m", "12m", "10m", "6m", "2m"];
  let band = $state("");
  let events = $state<WatchEvent[]>([]);
  let sightings = $state<Sighting[]>([]);
  let connected = $state(false);
  let err = $state("");
  let es: EventSource | null = null;

  function connect() {
    es?.close();
    connected = false;
    const params = new URLSearchParams(band ? { band } : {});
    api.events({ ...(band ? { band } : {}), limit: "50" }).then((r) => {
      events = r.events;
      const last = r.events.reduce((m, e) => Math.max(m, e.id), 0);
      if (last) params.set("lastEventId", String(last));
      es = new EventSource(`/api/v1/watch/stream?${params}`);
      es.addEventListener("hello", () => (connected = true));
      es.addEventListener("frame", (m) => {
        const e = JSON.parse((m as MessageEvent).data) as WatchEvent;
        if (!events.some((x) => x.id === e.id)) events = [e, ...events].slice(0, 200);
      });
      es.onerror = () => (connected = false); // EventSource reconnects by itself and resumes from the last id
    }).catch((e) => (err = e.message));
    api.sightings({ days: "7", ...(band ? { band } : {}) }).then((r) => (sightings = r.sightings)).catch(() => {});
  }
  onMount(() => {
    connect();
    return () => es?.close();
  });

  const KIND: Record<string, string> = {
    CALL: "called", ACCEPT: "answered", CQ: "CQ", DISCONNECT: "disconnect", ATTEMPT_ACCEPTED: "connected", ATTEMPT: "unanswered call",
  };
  const stationName = (s: WatchEvent["station"] | Sighting | null) =>
    !s ? "—" : s.callsign ?? (s.resolution === "ambiguous" ? `one of ${s.candidates.map((c) => c.callsign).join(", ")}` : `unknown (CRC ${s.crc})`);
  const stationLink = (s: { gatewayId: string | null } | null) => (s?.gatewayId ? `/gateway/${s.gatewayId}` : null);
</script>

<div class="mb-4 flex flex-wrap items-end justify-between gap-4">
  <div>
    <h1 class="mb-1">On the air</h1>
    <p class="m-0 max-w-[62ch] text-muted-foreground">
      Mercury connections heard by community <a href="/contributors">watchers</a>: independent evidence of which gateways are really
      on the air, and where. Watchers upload every 10 minutes, so new connections show up with up to that much delay.
      Run a watcher yourself and add it on your dashboard.
    </p>
  </div>
  <div class="flex items-center gap-3">
    <NativeSelect bind:value={band} onchange={connect} aria-label="Band">
      {#each BANDS as b}<option value={b}>{b || "All bands"}</option>{/each}
    </NativeSelect>
    <Badge variant={connected ? "open" : "outline"}>{connected ? "live" : "connecting…"}</Badge>
  </div>
</div>
{#if err}<p class="text-destructive">{err}</p>{/if}

<div class="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
  <Card.Root class="py-0">
    <Card.Content class="px-0">
      <Table.Root>
        <Table.Header>
          <Table.Row><Table.Head>Time (UTC)</Table.Head><Table.Head>Gateway</Table.Head><Table.Head>What</Table.Head><Table.Head>Dial</Table.Head><Table.Head>Heard by</Table.Head></Table.Row>
        </Table.Header>
        <Table.Body>
          {#each events as e (e.id)}
            <Table.Row>
              <Table.Cell class="font-mono text-xs">{e.ts.slice(11, 19)}<div class="text-muted-foreground">{e.ts.slice(5, 10)}</div></Table.Cell>
              <Table.Cell>
                {#if stationLink(e.station)}<a class="font-mono font-bold" href={stationLink(e.station)}>{stationName(e.station)}</a>
                {:else}<span class="font-mono text-sm">{stationName(e.station)}</span>{/if}
              </Table.Cell>
              <Table.Cell class="text-sm">{KIND[e.kind ?? ""] ?? e.kind}{e.client ? ` · ${e.client}` : ""}{e.snrDb != null ? ` · ${e.snrDb} dB` : ""}</Table.Cell>
              <Table.Cell class="font-mono text-xs">{e.dialHz ? fmtFreq(e.dialHz) : ""}<div class="text-muted-foreground">{e.band ?? ""}</div></Table.Cell>
              <Table.Cell class="text-xs">{e.watcher.name}<div class="font-mono text-muted-foreground">{e.watcher.gridsquare ?? ""}</div></Table.Cell>
            </Table.Row>
          {:else}
            <Table.Row><Table.Cell colspan={5} class="text-muted-foreground">Nothing heard yet{band ? ` on ${band}` : ""}. New connections appear here as they happen.</Table.Cell></Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </Card.Content>
  </Card.Root>

  <div>
    <h2 class="text-lg">Sightings, last 7 days</h2>
    <p class="text-xs text-muted-foreground">
      <b>Confirmed</b>: heard by watchers of two verified accounts within 10 minutes. <b>Single</b>: one watcher.
      <b>Called</b>: only calls to it were heard. Stations that match no listing show as unknown.
    </p>
    <Card.Root class="py-0">
      <Card.Content class="px-0">
        <Table.Root>
          <Table.Header><Table.Row><Table.Head>Station</Table.Head><Table.Head>Dial</Table.Head><Table.Head>Evidence</Table.Head></Table.Row></Table.Header>
          <Table.Body>
            {#each sightings as s (s.id)}
              <Table.Row>
                <Table.Cell>
                  {#if stationLink(s)}<a class="font-mono font-bold" href={stationLink(s)}>{stationName(s)}</a>{:else}<span class="font-mono text-sm">{stationName(s)}</span>{/if}
                </Table.Cell>
                <Table.Cell class="font-mono text-xs">{fmtFreq(s.dialHz)}<div class="text-muted-foreground">{s.band ?? ""}</div></Table.Cell>
                <Table.Cell class="text-xs">
                  <Badge variant={s.confidence === "confirmed" ? "open" : "outline"}>{s.confidence}</Badge>
                  <div class="text-muted-foreground">{s.watchers} watcher{s.watchers === 1 ? "" : "s"} · {s.clients} client{s.clients === 1 ? "" : "s"} · {ago(s.lastHeard)}</div>
                </Table.Cell>
              </Table.Row>
            {:else}
              <Table.Row><Table.Cell colspan={3} class="text-muted-foreground">No sightings yet.</Table.Cell></Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>
  </div>
</div>
