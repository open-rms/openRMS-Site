<script lang="ts">
  // Emcomm readiness inputs, shared by the gateway form and the claim details form.
  export interface EmcommForm {
    backupPower: string[]; runtimeHours: number | null; offGrid: boolean; lastTested: string;
    aresRaces: boolean; servedAgencies: string; activationContact: string;
  }
  import { Input } from "./components/ui/input/index.ts";
  import { Label } from "./components/ui/label/index.ts";
  import { Checkbox } from "./components/ui/checkbox/index.ts";
  let { emcomm = $bindable() }: { emcomm: EmcommForm } = $props();
  const POWER = ["battery", "solar", "generator", "wind"];
  const uid = Math.random().toString(36).slice(2, 7);
  function toggle(p: string) {
    emcomm.backupPower = emcomm.backupPower.includes(p) ? emcomm.backupPower.filter((x) => x !== p) : [...emcomm.backupPower, p];
  }
</script>

<div class="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
  {#each POWER as p}
    <Label class="font-normal"><Checkbox checked={emcomm.backupPower.includes(p)} onCheckedChange={() => toggle(p)} /> {p}</Label>
  {/each}
  <Label class="font-normal"><Checkbox bind:checked={emcomm.offGrid} /> off-grid capable</Label>
  <Label class="font-normal"><Checkbox bind:checked={emcomm.aresRaces} /> ARES/RACES</Label>
</div>
<div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-3 gap-y-3">
  <div class="grid gap-1.5"><Label for="rh{uid}">Runtime on backup (hours)</Label><Input id="rh{uid}" type="number" min="0" bind:value={emcomm.runtimeHours} /></div>
  <div class="grid gap-1.5"><Label for="lt{uid}">Last tested</Label><Input id="lt{uid}" type="date" bind:value={emcomm.lastTested} /></div>
  <div class="grid gap-1.5"><Label for="sa{uid}">Agencies served</Label><Input id="sa{uid}" bind:value={emcomm.servedAgencies} /></div>
</div>
<div class="mt-3 grid gap-1.5">
  <Label for="ac{uid}">Activation contact (public)</Label>
  <Input id="ac{uid}" placeholder="Only what you are happy to publish" bind:value={emcomm.activationContact} />
</div>
