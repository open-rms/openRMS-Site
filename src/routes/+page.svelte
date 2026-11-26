<script lang="ts">
  import { api, fmtFreq, ago, STATUS_LABEL, STATUS_HELP, type Gateway, type Modem, type Stats } from "#lib/api.ts";
  import GatewayMap from "#lib/GatewayMap.svelte";
  import StatusDot from "#lib/StatusDot.svelte";
  import { Button } from "#lib/components/ui/button/index.ts";
  import { Input } from "#lib/components/ui/input/index.ts";
  import { Label } from "#lib/components/ui/label/index.ts";
  import { Checkbox } from "#lib/components/ui/checkbox/index.ts";
  import { NativeSelect } from "#lib/components/ui/native-select/index.ts";
  import { Badge } from "#lib/components/ui/badge/index.ts";
  import * as Card from "#lib/components/ui/card/index.ts";
  import * as Table from "#lib/components/ui/table/index.ts";
  import { page } from "$app/state";
  import { replaceState } from "$app/navigation";

  const BANDS = ["160m", "80m", "60m", "40m", "30m", "20m", "17m", "15m", "12m", "10m", "6m", "2m", "1.25m", "70cm"];
  const STATUSES = ["online", "listed", "stale", "offline"] as const;

  let modems = $state<Modem[]>([]);
  let stats = $state<Stats | null>(null);
  let gateways = $state<Gateway[]>([]);
  let total = $state(0);
  let loading = $state(true);
  let err = $state("");
  let shown = $state(100);

  const MI = 1.609344; // km per mile
  function initialUnit(): "km" | "mi" {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("distanceUnit") : null;
    if (saved === "km" || saved === "mi") return saved;
    return typeof navigator !== "undefined" && /^en-(US|GB|LR|MM)$/.test(navigator.language) ? "mi" : "km";
  }
  let unit = $state<"km" | "mi">(initialUnit());
  function setUnit(u: "km" | "mi") {
    // Keep the same distance when switching units.
    const r = Number(String(f.radius ?? "").trim());
    if (r > 0) f.radius = String(Math.round(u === "mi" ? r / MI : r * MI));
    unit = u;
    localStorage.setItem("distanceUnit", u);
  }
  const fmtDist = (km: number) => `${Math.round(unit === "mi" ? km / MI : km).toLocaleString()} ${unit === "mi" ? "mi" : "km"}`;

  // Filters live in the URL so a filtered view can be shared.
  const sp = page.url.searchParams;
  let f = $state({
    modem: sp.get("modem")?.split(",").filter(Boolean) ?? [],
    band: sp.get("band") ?? "",
    status: sp.get("status") ?? "",
    source: sp.get("source") ?? "",
    claimed: sp.get("claimed") === "true",
    q: sp.get("q") ?? "",
    grid: sp.get("grid") ?? "",
    // Shown in the chosen unit; sent to the API as radiusKm.
    radius: sp.get("radiusKm") ? String(Math.round(Number(sp.get("radiusKm")) / (initialUnit() === "mi" ? MI : 1))) : "",
  });

  api.modems().then((m) => (modems = m)).catch(() => {});
  api.stats().then((s) => (stats = s)).catch(() => {});

  const GRID = /^[A-R]{2}[0-9]{2}([A-X]{2}([0-9]{2})?)?$/i;
  const gridPartial = $derived(!!f.grid.trim() && !GRID.test(f.grid.trim()));

  function params(): Record<string, string> {
    const p: Record<string, string> = {};
    if (f.modem.length) p.modem = f.modem.join(",");
    // String(): number inputs hand over numbers, not text.
    for (const k of ["band", "status", "source", "q", "grid"] as const) if (String(f[k] ?? "").trim()) p[k] = String(f[k]).trim();
    const r = Number(String(f.radius ?? "").trim());
    if (r > 0) p.radiusKm = String(Math.round(unit === "mi" ? r * MI : r));
    // Only a complete Maidenhead square (4, 6 or 8 characters) filters; a partial one is ignored.
    if (p.grid && !GRID.test(p.grid)) delete p.grid;
    if (p.radiusKm && !p.grid) delete p.radiusKm;
    if (f.claimed) p.claimed = "true";
    return p;
  }

  let timer: ReturnType<typeof setTimeout>;
  $effect(() => {
    const p = params();
    clearTimeout(timer);
    timer = setTimeout(async () => {
      loading = true;
      err = "";
      try {
        const r = await api.gateways(p);
        gateways = r.gateways;
        total = r.total;
        shown = 100;
        // Update the address bar without navigating, so the filter field keeps focus.
        replaceState(`?${new URLSearchParams(p)}`, {});
      } catch (e) {
        err = (e as Error).message;
      } finally {
        loading = false;
      }
    }, 200);
  });

  function toggleModem(id: string) {
    f.modem = f.modem.includes(id) ? f.modem.filter((m) => m !== id) : [...f.modem, id];
  }
  function reset() {
    f = { modem: [], band: "", status: "", source: "", claimed: false, q: "", grid: "", radius: "" };
  }
  const modeSummary = (g: Gateway) => {
    const seen = new Map<string, string>();
    for (const c of g.channels) seen.set(c.modem, c.modemLabel);
    return [...seen.entries()];
  };
  const OPEN = new Set(["mercury", "xara", "data2g", "modem73", "ion-hf", "freedata", "other"]);
</script>

<section class="mb-5 flex flex-wrap items-end justify-between gap-8">
  <div>
    <h1>Radio email gateways, every mode</h1>
    <p class="text-muted-foreground m-0 max-w-[62ch]">
      An open directory of RMS gateways: Winlink's list plus gateways on open modes like Mercury and Data2G,
      listed by their sysops. Free to use, free to mirror, readable by Pat and other clients.
    </p>
  </div>
  {#if stats}
    <div class="flex gap-6 [&>div]:flex [&>div]:flex-col [&_b]:text-[1.4rem] [&_b]:tabular-nums [&_span]:text-muted-foreground [&_span]:text-xs">
      <div><b>{stats.gateways.toLocaleString()}</b><span>gateways</span></div>
      <div><b>{stats.channels.toLocaleString()}</b><span>channels</span></div>
      <div><b>{(stats.byStatus.online ?? 0) + (stats.byStatus.listed ?? 0)}</b><span>on the air</span></div>
      <div><b>{stats.bySource.openrms ?? 0}</b><span>sysop-listed</span></div>
    </div>
  {/if}
</section>

<div class="grid items-start gap-5 min-[861px]:grid-cols-[270px_1fr]">
  <Card.Root class="min-[861px]:sticky min-[861px]:top-4">
    <Card.Header class="flex items-center justify-between">
      <Card.Title><h2 class="m-0">Filter</h2></Card.Title>
      <Button variant="outline" size="sm" onclick={reset}>Reset</Button>
    </Card.Header>
    <Card.Content class="flex flex-col gap-3">
      <div class="grid gap-1.5">
        <Label for="q">Callsign</Label>
        <Input id="q" placeholder="e.g. W7" bind:value={f.q} />
      </div>
      <div class="grid gap-1.5">
        <span class="text-sm font-medium">Mode</span>
        <div class="flex flex-wrap gap-1.5">
          {#each modems.filter((m) => m.id !== "other") as m}
            <Button
              size="xs"
              variant={f.modem.includes(m.id) ? "default" : "outline"}
              class={["rounded-full", !m.winlinkNative && !f.modem.includes(m.id) && "border-dashed"]}
              aria-pressed={f.modem.includes(m.id)}
              onclick={() => toggleModem(m.id)}
            >
              {m.label}
            </Button>
          {/each}
        </div>
      </div>
      <div class="grid gap-1.5">
        <Label for="band">Band</Label>
        <NativeSelect id="band" class="w-full" bind:value={f.band}>
          <option value="">Any</option>
          {#each BANDS as b}<option>{b}</option>{/each}
        </NativeSelect>
      </div>
      <div class="grid gap-1.5">
        <Label for="status">Status</Label>
        <NativeSelect id="status" class="w-full" bind:value={f.status}>
          <option value="">Any</option>
          <option value="online,listed">On the air (online or listed)</option>
          {#each STATUSES as s}<option value={s}>{STATUS_LABEL[s]}</option>{/each}
        </NativeSelect>
      </div>
      <div class="grid gap-1.5">
        <Label for="source">Listed by</Label>
        <NativeSelect id="source" class="w-full" bind:value={f.source}>
          <option value="">Anyone</option>
          <option value="openrms">Sysop (openRMS)</option>
          <option value="winlink">Winlink list</option>
        </NativeSelect>
      </div>
      <Label class="font-normal"><Checkbox bind:checked={f.claimed} /> Only gateways with sysop details</Label>
      <div class="grid grid-cols-2 gap-2">
        <div class="grid gap-1.5">
          <Label for="grid">Near grid</Label>
          <Input id="grid" placeholder="DN16" bind:value={f.grid} aria-invalid={gridPartial} />
          {#if gridPartial}<span class="text-xs text-muted-foreground">Needs 4 or 6 characters, e.g. DN16</span>{/if}
        </div>
        <div class="grid gap-1.5">
          <div class="flex items-center justify-between gap-1">
            <Label for="radius">Within</Label>
            <select class="bg-transparent text-xs text-muted-foreground" aria-label="Distance unit" value={unit}
              onchange={(e) => setUnit((e.target as HTMLSelectElement).value as "km" | "mi")}>
              <option value="mi">miles</option><option value="km">km</option>
            </select>
          </div>
          <Input id="radius" type="number" min="0" placeholder={unit === "mi" ? "300" : "500"} bind:value={f.radius} disabled={!f.grid} />
        </div>
      </div>
      <ul class="text-muted-foreground m-0 grid list-none gap-1 p-0 text-sm">
        {#each STATUSES as s}<li><StatusDot status={s} /><b>{STATUS_LABEL[s]}</b>: {STATUS_HELP[s]}.</li>{/each}
      </ul>
    </Card.Content>
  </Card.Root>

  <section class="min-w-0">
    <GatewayMap {gateways} />
    <div class="mt-3 mb-1.5 flex flex-wrap items-center justify-between gap-3">
      <span>
        {#if loading}Loading…{:else}<b>{total.toLocaleString()}</b> gateways{/if}
        {#if err}<span class="text-destructive"> {err}</span>{/if}
      </span>
      <a class="text-sm" href="/api/v1/dumps/latest.csv">Download CSV</a>
    </div>
    <Card.Root class="py-0">
      <Table.Root>
        <Table.Header>
          <Table.Row><Table.Head>Callsign</Table.Head><Table.Head>Modes</Table.Head><Table.Head>Channels</Table.Head><Table.Head>Status</Table.Head>{#if f.grid}<Table.Head>Dist.</Table.Head>{/if}</Table.Row>
        </Table.Header>
        <Table.Body>
          {#each gateways.slice(0, shown) as g (g.id)}
            <Table.Row>
              <Table.Cell>
                <a class="font-mono font-bold no-underline" href="/gateway/{g.id}">{g.callsign}</a>
                <div class="text-muted-foreground text-sm">
                  {g.gridsquare ?? ""}
                  {#if g.heardOnAir}<Badge variant={g.heardOnAir.confidence === "confirmed" ? "open" : "outline"} title="Heard on the air by watchers {g.heardOnAir.lastHeard.slice(0, 10)}">heard</Badge>{" "}{/if}{#if g.source === "winlink"}<Badge variant="outline">Winlink</Badge>{#if g.claimed}{" "}<Badge variant="open" title="The sysop added details">sysop details</Badge>{/if}{:else if g.ownerVerified}<Badge variant="open" title="Callsign verified">verified</Badge>{/if}
                </div>
              </Table.Cell>
              <Table.Cell>
                {#each modeSummary(g) as [id, label]}
                  <Badge variant={OPEN.has(id) ? "open" : "outline"}>{label}</Badge>{" "}
                {/each}
              </Table.Cell>
              <Table.Cell class="font-mono text-sm">
                {#each g.channels.slice(0, 3) as c}<div class="whitespace-nowrap">{fmtFreq(c.frequencyHz)}</div>{/each}
                {#if g.channels.length > 3}<div class="text-muted-foreground">+{g.channels.length - 3} more</div>{/if}
              </Table.Cell>
              <Table.Cell class="text-sm"><StatusDot status={g.status} />{STATUS_LABEL[g.status]}<div class="text-muted-foreground">{ago(g.lastSeenAt)}</div></Table.Cell>
              {#if f.grid}<Table.Cell class="text-sm">{g.distanceKm != null ? fmtDist(g.distanceKm) : ""}</Table.Cell>{/if}
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
      {#if gateways.length > shown}
        <div class="p-3 text-center"><Button variant="outline" onclick={() => (shown += 200)}>Show more ({gateways.length - shown} left)</Button></div>
      {/if}
    </Card.Root>
  </section>
</div>
