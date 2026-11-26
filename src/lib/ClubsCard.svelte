<script lang="ts">
  import { accountsPage } from "./config.ts";
  import { api, type Club } from "./api.ts";
  import { Button } from "./components/ui/button/index.ts";
  import { Input } from "./components/ui/input/index.ts";
  import { NativeSelect } from "./components/ui/native-select/index.ts";
  import { Badge } from "./components/ui/badge/index.ts";
  import * as Card from "./components/ui/card/index.ts";
  import * as Table from "./components/ui/table/index.ts";

  let { myUserId, onchange }: { myUserId: string; onchange: () => void } = $props();
  let clubs = $state<Club[]>([]);
  let msg = $state(""), err = $state("");
  let newCall = $state(""), newName = $state("");
  let addCall = $state<Record<string, string>>({});
  let addRole = $state<Record<string, string>>({});

  async function load() {
    clubs = (await api.clubs()).clubs;
  }
  load().catch((e) => (err = e.message));

  async function run(fn: () => Promise<unknown>, ok: string) {
    err = "";
    msg = "";
    try {
      await fn();
      msg = ok;
      await load();
      onchange();
    } catch (e) {
      err = (e as Error).message;
    }
  }
  function create(e: Event) {
    e.preventDefault();
    const call = newCall.trim().toUpperCase();
    run(() => api.createClub(call, newName.trim()), `${call} added. You can now list or claim gateways under it.`).then(() => {
      if (!err) { newCall = ""; newName = ""; }
    });
  }
  function add(c: Club, e: Event) {
    e.preventDefault();
    const call = (addCall[c.id] ?? "").trim().toUpperCase();
    run(() => api.addClubMember(c.id, call, addRole[c.id] ?? "member"), `${call} can now manage ${c.callsign}.`).then(() => (addCall[c.id] = ""));
  }
  function remove(c: Club, m: Club["members"][number]) {
    const leaving = m.userId === myUserId;
    if (!window.confirm(leaving ? `Leave ${c.callsign}?` : `Remove ${m.callsign} from ${c.callsign}?`)) return;
    run(() => api.removeClubMember(c.id, m.userId), leaving ? `You left ${c.callsign}.` : `${m.callsign} removed.`);
  }
  function del(c: Club) {
    if (!window.confirm(`Delete ${c.callsign}? Its listings are removed and its Winlink claims released.`)) return;
    run(() => api.deleteClub(c.id), `${c.callsign} deleted.`);
  }
  const canManage = (c: Club) => c.myRole === "owner" || c.myRole === "admin";
</script>

<Card.Root>
  <Card.Header>
    <Card.Title><h2 class="m-0">Clubs and other callsigns</h2></Card.Title>
    <Card.Description>
      Add a club, special-event or second callsign you're responsible for. Everyone you add can list and claim gateways under it
      and edit them. Owners manage the member list. A new callsign works right away and shows as unverified until a moderator
      confirms it (for a club call, that you're its trustee). Clubs belong to your openRMS account, so they work in every
      openRMS app; you can also manage them on your <a href={accountsPage("/clubs")}>account page</a>.
    </Card.Description>
  </Card.Header>
  <Card.Content>
    {#each clubs as c (c.id)}
      <div class="mb-3 rounded-lg border border-dashed p-3">
        <div class="flex flex-wrap items-center gap-3">
          <b class="font-mono">{c.callsign}</b>
          <span>{c.name !== c.callsign ? c.name : ""}</span>
          {#if c.verified}<Badge variant="open">verified</Badge>{:else}<Badge variant="outline">not yet verified</Badge>{/if}
          <Badge variant="outline">you: {c.myRole}</Badge>
        </div>
        <Table.Root>
          <Table.Header><Table.Row><Table.Head>Member</Table.Head><Table.Head>Role</Table.Head><Table.Head></Table.Head></Table.Row></Table.Header>
          <Table.Body>
            {#each c.members as m (m.userId)}
              <Table.Row>
                <Table.Cell><span class="font-mono">{m.callsign}</span> <span class="text-muted-foreground text-sm">{m.name}</span></Table.Cell>
                <Table.Cell>
                  {#if c.myRole === "owner" && m.userId !== myUserId}
                    <NativeSelect size="sm" value={m.role} onchange={(e) => run(() => api.setClubRole(c.id, m.userId, (e.target as HTMLSelectElement).value), "Role updated.")}>
                      <option value="member">member</option>
                      <option value="admin">admin</option>
                      <option value="owner">owner</option>
                    </NativeSelect>
                  {:else}
                    {m.role}
                  {/if}
                </Table.Cell>
                <Table.Cell class="text-right">
                  {#if m.userId === myUserId}
                    <Button variant="outline" size="sm" onclick={() => remove(c, m)}>Leave</Button>
                  {:else if c.myRole === "owner" || (c.myRole === "admin" && m.role === "member")}
                    <Button variant="destructive" size="sm" onclick={() => remove(c, m)}>Remove</Button>
                  {/if}
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
        {#if canManage(c)}
          <form class="mt-2 flex flex-wrap items-center gap-3" onsubmit={(e) => add(c, e)}>
            <Input class="max-w-[180px] font-mono" placeholder="Member's callsign" bind:value={addCall[c.id]} required />
            <NativeSelect class="max-w-[200px]" bind:value={addRole[c.id]}>
              <option value="member">member</option>
              <option value="admin">admin (can add members)</option>
            </NativeSelect>
            <Button type="submit" variant="outline">Add member</Button>
            <span class="text-muted-foreground text-sm">They need an openRMS account first.</span>
          </form>
        {/if}
        {#if c.myRole === "owner"}
          <Button class="mt-2" variant="destructive" size="sm" onclick={() => del(c)}>Delete {c.callsign}</Button>
        {/if}
      </div>
    {/each}

    <form class="mt-2 flex flex-wrap items-center gap-3" onsubmit={create}>
      <Input class="max-w-[180px] font-mono uppercase" placeholder="Callsign, e.g. W7ABC" bind:value={newCall} required />
      <Input class="max-w-[320px]" placeholder="Name (e.g. Palouse Amateur Radio Club)" bind:value={newName} />
      <Button type="submit">Add callsign</Button>
    </form>
    {#if msg}<p>{msg}</p>{/if}
    {#if err}<p class="text-destructive">{err}</p>{/if}
  </Card.Content>
</Card.Root>
