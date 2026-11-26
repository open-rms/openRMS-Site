<script lang="ts">
  import { untrack } from "svelte";
  import { api, ApiError, type Gateway } from "./api.ts";
  import { Textarea } from "./components/ui/textarea/index.ts";
  import { Button } from "./components/ui/button/index.ts";
  import { Input } from "./components/ui/input/index.ts";
  import { Label } from "./components/ui/label/index.ts";
  import * as Card from "./components/ui/card/index.ts";
  import EmcommFields, { type EmcommForm } from "./EmcommFields.svelte";

  let { gateway, onsaved, oncancel }: { gateway: Gateway; onsaved: () => void; oncancel: () => void } = $props();
  const g = untrack(() => gateway);
  let comments = $state(g.ownerComments ?? "");
  let software = $state(g.software ?? "");
  let emcomm = $state<EmcommForm>({
    backupPower: g.emcomm.backupPower ?? [],
    runtimeHours: g.emcomm.runtimeHours ?? null,
    offGrid: g.emcomm.offGrid ?? false,
    lastTested: g.emcomm.lastTested ?? "",
    aresRaces: g.emcomm.aresRaces ?? false,
    servedAgencies: g.emcomm.servedAgencies ?? "",
    activationContact: g.emcomm.activationContact ?? "",
  });
  let err = $state(""), busy = $state(false);

  async function save(e: Event) {
    e.preventDefault();
    busy = true;
    err = "";
    try {
      await api.saveDetails(g.id, {
        comments,
        software: software || null,
        emcomm: { ...emcomm, lastTested: emcomm.lastTested || null, runtimeHours: emcomm.runtimeHours || null },
      });
      onsaved();
    } catch (x) {
      err = (x as Error).message;
      if (x instanceof ApiError && x.issues) err += ": " + x.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ");
    } finally {
      busy = false;
    }
  }
</script>

<form onsubmit={save}>
  <Card.Root>
    <Card.Header>
      <Card.Title><h2 class="m-0">Details for {g.callsign}</h2></Card.Title>
      <Card.Description>
        Channels, location and status keep coming from the Winlink list. What you add here shows on the
        gateway's page and in the API. It is not sent to Winlink.
      </Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-col gap-3">
      <div class="grid gap-1.5">
        <Label for="oc">Comments from the sysop</Label>
        <Textarea id="oc" rows={3} maxlength={1000} bind:value={comments} placeholder="Coverage notes, schedule, how to reach you for tests…" />
      </div>
      <div class="grid gap-1.5"><Label for="osw">Software</Label><Input id="osw" placeholder="RMS Trimode, LinBPQ…" bind:value={software} /></div>
      <h3 class="mt-3">Emcomm readiness</h3>
      <EmcommFields bind:emcomm />
      {#if err}<p class="text-destructive my-0">{err}</p>{/if}
      <div class="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>Save details</Button>
        <Button variant="outline" onclick={oncancel}>Cancel</Button>
      </div>
    </Card.Content>
  </Card.Root>
</form>
