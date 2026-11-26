<script lang="ts">
  import { untrack } from "svelte";
  import { api, ApiError, type Gateway, type Modem } from "./api.ts";
  import { Checkbox } from "./components/ui/checkbox/index.ts";
  import { NativeSelect } from "./components/ui/native-select/index.ts";
  import { Button } from "./components/ui/button/index.ts";
  import { Input } from "./components/ui/input/index.ts";
  import { Label } from "./components/ui/label/index.ts";
  import * as Card from "./components/ui/card/index.ts";
  import EmcommFields from "./EmcommFields.svelte";

  let { callsign, callsigns = [], existing, onsaved, oncancel }: {
    callsign: string;
    callsigns?: string[];
    existing?: Gateway;
    onsaved: () => void;
    oncancel: () => void;
  } = $props();

  interface Ch {
    frequencyKhz: number | null; modem: string; variant: string; modemVersion: string; serviceCode: string;
    operatingHours: string; antenna: string; notes: string;
  }
  const blank = (): Ch => ({ frequencyKhz: null, modem: "mercury", variant: "", modemVersion: "", serviceCode: "PUBLIC", operatingHours: "00-23", antenna: "", notes: "" });

  let modems = $state<Modem[]>([]);
  api.modems().then((m) => (modems = m));

  // The form edits a copy taken when it opens.
  const e = untrack(() => existing);
  const myCall = untrack(() => callsign);
  let form = $state({
    callsign: e?.callsign ?? `${myCall}-10`,
    gridsquare: e?.gridsquare ?? "",
    latitude: e?.latitude ?? (null as number | null),
    longitude: e?.longitude ?? (null as number | null),
    locationPrecision: e?.locationPrecision ?? "exact",
    comments: e?.comments ?? "",
    software: e?.software ?? "",
    winlinkListed: e?.winlinkListed ?? false,
    emcomm: {
      backupPower: e?.emcomm.backupPower ?? ([] as string[]),
      runtimeHours: e?.emcomm.runtimeHours ?? (null as number | null),
      offGrid: e?.emcomm.offGrid ?? false,
      lastTested: e?.emcomm.lastTested ?? "",
      aresRaces: e?.emcomm.aresRaces ?? false,
      servedAgencies: e?.emcomm.servedAgencies ?? "",
      activationContact: e?.emcomm.activationContact ?? "",
    },
    channels: (e?.channels.map((c) => ({
      frequencyKhz: c.frequencyHz / 1000, modem: c.modem, variant: c.variant ?? "", modemVersion: c.modemVersion ?? "",
      serviceCode: c.serviceCode, operatingHours: c.operatingHours, antenna: c.antenna, notes: c.notes,
    })) ?? [blank()]) as Ch[],
  });
  let err = $state("");
  let issues = $state<string[]>([]);
  let busy = $state(false);

  const modem = (id: string) => modems.find((m) => m.id === id);

  function compatNote(c: Ch): string {
    const m = modem(c.modem);
    if (!m) return "";
    if (!m.compat) return "Not in the Winlink-compatible feed yet (no client can dial it). Shown on the site and in the API.";
    if (m.compat.serviceCode) return `Pat and other clients see it as “${m.compat.supportedModes}” under service code ${m.compat.serviceCode}.`;
    return "";
  }

  async function save(ev: Event) {
    ev.preventDefault();
    err = "";
    issues = [];
    busy = true;
    const body = {
      ...form,
      latitude: form.latitude ?? null,
      longitude: form.longitude ?? null,
      software: form.software || null,
      emcomm: { ...form.emcomm, lastTested: form.emcomm.lastTested || null, runtimeHours: form.emcomm.runtimeHours || null },
      channels: form.channels.map((c) => ({
        frequencyKhz: Number(c.frequencyKhz),
        modem: c.modem,
        variant: c.variant || null,
        modemVersion: c.modemVersion || null,
        serviceCode: c.serviceCode || "PUBLIC",
        operatingHours: c.operatingHours || "00-23",
        antenna: c.antenna,
        notes: c.notes,
      })),
    };
    try {
      if (existing) await api.updateGateway(existing.id, body);
      else await api.createGateway(body);
      onsaved();
    } catch (x) {
      err = (x as Error).message;
      if (x instanceof ApiError && x.issues) issues = x.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    } finally {
      busy = false;
    }
  }
</script>

<form onsubmit={save}>
  <Card.Root>
    <Card.Header>
      <Card.Title><h2 class="m-0">{existing ? `Edit ${existing.callsign}` : "List a gateway"}</h2></Card.Title>
    </Card.Header>
    <Card.Content>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <div class="grid content-start gap-1.5">
          <Label for="gc">Gateway callsign</Label>
          <Input id="gc" class="font-mono" required list="mycalls" bind:value={form.callsign} />
          <datalist id="mycalls">{#each callsigns.length ? callsigns : [callsign] as c}<option value="{c}-10"></option><option value={c}></option>{/each}</datalist>
          <div class="text-muted-foreground text-sm">One of {(callsigns.length ? callsigns : [callsign]).join(", ")}, with any SSID</div>
        </div>
        <div class="grid content-start gap-1.5"><Label for="gg">Grid square</Label><Input id="gg" class="font-mono" required placeholder="DN16ra" bind:value={form.gridsquare} /></div>
        <div class="grid content-start gap-1.5">
          <Label for="lp">Show location as</Label>
          <NativeSelect id="lp" class="w-full" bind:value={form.locationPrecision}>
            <option value="exact">Exact (lat/lon below)</option>
            <option value="grid6">6-character grid (~5 km)</option>
            <option value="grid4">4-character grid (~100 km)</option>
          </NativeSelect>
        </div>
        <div class="grid content-start gap-1.5"><Label for="la">Latitude (optional)</Label><Input id="la" type="number" step="any" min="-90" max="90" bind:value={form.latitude} /></div>
        <div class="grid content-start gap-1.5"><Label for="lo">Longitude (optional)</Label><Input id="lo" type="number" step="any" min="-180" max="180" bind:value={form.longitude} /></div>
        <div class="grid content-start gap-1.5"><Label for="sw">Software</Label><Input id="sw" placeholder="LinBPQ, RMS Trimode, openrms-gateway…" bind:value={form.software} /></div>
      </div>
      <div class="mt-3 grid gap-1.5"><Label for="cm">Comments</Label><Input id="cm" maxlength={500} bind:value={form.comments} /></div>
      <Label class="mt-3 font-normal"><Checkbox bind:checked={form.winlinkListed} /> Also listed on Winlink</Label>

      <h3 class="mt-5">Channels</h3>
      {#each form.channels as c, i}
        <div class="mb-3 rounded-lg border border-dashed p-3">
          <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
            <div class="grid content-start gap-1.5">
              <Label for="f{i}">Centre frequency (kHz)</Label>
              <Input id="f{i}" type="number" step="0.1" required bind:value={c.frequencyKhz} />
            </div>
            <div class="grid content-start gap-1.5">
              <Label for="m{i}">Mode (real waveform)</Label>
              <NativeSelect id="m{i}" class="w-full" bind:value={c.modem} onchange={() => (c.variant = modem(c.modem)?.defaultVariant ?? "")}>
                {#each modems as m}<option value={m.id}>{m.label}</option>{/each}
              </NativeSelect>
            </div>
            <div class="grid content-start gap-1.5">
              <Label for="v{i}">Bandwidth / speed</Label>
              <NativeSelect id="v{i}" class="w-full" bind:value={c.variant} disabled={!modem(c.modem)?.variants.length}>
                <option value="">—</option>
                {#each modem(c.modem)?.variants ?? [] as v}<option>{v}</option>{/each}
              </NativeSelect>
            </div>
            <div class="grid content-start gap-1.5"><Label for="mv{i}">Modem version</Label><Input id="mv{i}" bind:value={c.modemVersion} /></div>
            <div class="grid content-start gap-1.5"><Label for="sc{i}">Service code</Label><Input id="sc{i}" class="font-mono" bind:value={c.serviceCode} /></div>
            <div class="grid content-start gap-1.5"><Label for="h{i}">Hours (UTC)</Label><Input id="h{i}" bind:value={c.operatingHours} /></div>
            <div class="grid content-start gap-1.5"><Label for="a{i}">Antenna</Label><Input id="a{i}" bind:value={c.antenna} /></div>
            <div class="grid content-start gap-1.5"><Label for="n{i}">Notes</Label><Input id="n{i}" bind:value={c.notes} /></div>
          </div>
          <div class="mt-2 flex flex-wrap items-center justify-between gap-3">
            <span class="text-muted-foreground text-sm">{compatNote(c)}</span>
            {#if form.channels.length > 1}
              <Button variant="destructive" size="sm" onclick={() => form.channels.splice(i, 1)}>Remove channel</Button>
            {/if}
          </div>
        </div>
      {/each}
      <Button variant="outline" onclick={() => form.channels.push(blank())}>+ Add channel</Button>

      <h3 class="mt-5">Emcomm readiness (optional)</h3>
      <EmcommFields bind:emcomm={form.emcomm} />

      {#if err}<p class="text-destructive">{err}</p>{/if}
      {#each issues as i}<div class="text-destructive text-sm">{i}</div>{/each}
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>{existing ? "Save" : "List gateway"}</Button>
        <Button variant="outline" onclick={oncancel}>Cancel</Button>
      </div>
    </Card.Content>
  </Card.Root>
</form>
