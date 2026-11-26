<script lang="ts">
  import { api, ago, type Watcher } from "./api.ts";
  import StatusDot from "./StatusDot.svelte";
  import { Label } from "./components/ui/label/index.ts";
  import { Checkbox } from "./components/ui/checkbox/index.ts";
  import { Button } from "./components/ui/button/index.ts";
  import { Input } from "./components/ui/input/index.ts";
  import { NativeSelect } from "./components/ui/native-select/index.ts";
  import { Badge } from "./components/ui/badge/index.ts";
  import * as Card from "./components/ui/card/index.ts";
  import * as Table from "./components/ui/table/index.ts";

  let watchers = $state<Watcher[]>([]);
  let msg = $state(""), err = $state("");
  let newKey = $state<{ name: string; key: string } | null>(null);
  let name = $state(""), grid = $state(""), precision = $state("grid4"), isPublic = $state(true);
  const origin = typeof location !== "undefined" ? location.origin : "";

  async function load() {
    watchers = (await api.watchers()).watchers;
  }
  load().catch((e) => (err = e.message));

  async function run(fn: () => Promise<unknown>, ok = "") {
    err = "";
    msg = "";
    try {
      await fn();
      msg = ok;
      await load();
    } catch (e) {
      err = (e as Error).message;
    }
  }
  function create(e: Event) {
    e.preventDefault();
    run(async () => {
      const w = await api.createWatcher({ name: name.trim(), gridsquare: grid.trim() || null, locationPrecision: precision, public: isPublic });
      const { key } = await api.mintWatcherKey(w.id);
      newKey = { name: w.name, key };
      name = grid = "";
    });
  }
  function mint(w: Watcher) {
    if (w.hasKey && !window.confirm(`Replace the key for ${w.name}? The old key stops working immediately.`)) return;
    run(async () => {
      newKey = { name: w.name, key: (await api.mintWatcherKey(w.id)).key };
    });
  }
  function revoke(w: Watcher) {
    if (!window.confirm(`Revoke the key for ${w.name}? It stops uploading; local use keeps working.`)) return;
    run(() => api.revokeWatcherKey(w.id), "Key revoked.");
  }
  function del(w: Watcher) {
    if (!window.confirm(`Delete ${w.name} and everything it uploaded?`)) return;
    run(() => api.deleteWatcher(w.id), "Watcher deleted.");
  }
  const live = (w: Watcher) => !!w.lastSeenAt && Date.now() - new Date(w.lastSeenAt).getTime() < 10 * 60_000;
</script>

<Card.Root>
  <Card.Header>
    <Card.Title><h2 class="m-0">Watchers</h2></Card.Title>
    <Card.Description>
      An openRMS-Watch receiver can upload the Mercury connections it hears, as independent
      evidence that listed gateways are on the air. Create a watcher, then paste its key into the watcher's settings.
      Your location is shown only as precisely as you choose here; exact coordinates are never uploaded.
    </Card.Description>
  </Card.Header>
  <Card.Content>
    {#if newKey}
      <div class="bg-primary-soft mb-3 rounded-lg p-3">
        <b>Upload key for {newKey.name}. Copy it now; it is not shown again.</b>
        <pre>{newKey.key}</pre>
        <div class="text-sm">In the watcher's settings: Directory URL <code>{origin}</code>, key as above.</div>
        <Button class="mt-2" variant="outline" size="sm" onclick={() => (newKey = null)}>Done</Button>
      </div>
    {/if}

    {#if watchers.length}
      <Table.Root>
        <Table.Header><Table.Row><Table.Head>Watcher</Table.Head><Table.Head>Shown as</Table.Head><Table.Head>Last upload</Table.Head><Table.Head></Table.Head></Table.Row></Table.Header>
        <Table.Body>
          {#each watchers as w (w.id)}
            <Table.Row>
              <Table.Cell>
                <b>{w.name}</b>
                {#if w.disabled}<div class="text-destructive text-sm">disabled by a moderator{w.disabledReason ? `: ${w.disabledReason}` : ""}</div>{/if}
                {#if w.lastStatus?.software}<div class="text-muted-foreground text-sm">{w.lastStatus.software}{w.lastStatus.sdr ? ` · ${w.lastStatus.sdr}` : ""}</div>{/if}
              </Table.Cell>
              <Table.Cell class="text-sm">
                <NativeSelect size="sm" value={w.locationPrecision} onchange={(e) => run(() => api.updateWatcher(w.id, { locationPrecision: (e.target as HTMLSelectElement).value }), "Saved.")}>
                  <option value="grid4">4-char grid</option><option value="grid6">6-char grid</option><option value="hidden">hidden</option>
                </NativeSelect>
                <Label class="mt-1.5 font-normal"><Checkbox checked={w.public} onCheckedChange={(v) => run(() => api.updateWatcher(w.id, { public: v }), "Saved.")} /> in contributor list</Label>
              </Table.Cell>
              <Table.Cell class="text-sm">{#if live(w)}<StatusDot status="online" />live{:else}{ago(w.lastSeenAt)}{/if}</Table.Cell>
              <Table.Cell class="text-right whitespace-nowrap">
                <Button variant="outline" size="sm" onclick={() => mint(w)}>{w.hasKey ? "New key" : "Create key"}</Button>
                {#if w.hasKey}<Button variant="outline" size="sm" onclick={() => revoke(w)}>Revoke key</Button>{/if}
                <Button variant="destructive" size="sm" onclick={() => del(w)}>Delete</Button>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    {/if}

    <form class="mt-3 flex flex-wrap items-center gap-3" onsubmit={create}>
      <Input class="max-w-[240px]" placeholder="Watcher name (e.g. shack-hackrf)" bind:value={name} required />
      <Input class="max-w-[110px] font-mono" placeholder="Grid (DN16)" bind:value={grid} />
      <NativeSelect class="max-w-[190px]" bind:value={precision}>
        <option value="grid4">show 4-char grid</option><option value="grid6">show 6-char grid</option><option value="hidden">hide location</option>
      </NativeSelect>
      <Label class="font-normal"><Checkbox bind:checked={isPublic} /> in contributor list</Label>
      <Button type="submit">Add watcher</Button>
    </form>
    {#if msg}<p>{msg}</p>{/if}
    {#if err}<p class="text-destructive">{err}</p>{/if}
  </Card.Content>
</Card.Root>
