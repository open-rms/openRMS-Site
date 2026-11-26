<script lang="ts">
  import StatusDot from "#lib/StatusDot.svelte";
  import { Badge } from "#lib/components/ui/badge/index.ts";
</script>

<div class="max-w-[760px] [&_h2]:mt-6 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6">
  <h1>About the openRMS Directory</h1>
  <p>
    Radio email shouldn't depend on one organization deciding which modes count. The openRMS Directory lists
    gateways on <b>every</b> mode, including open ones like Mercury, Data2G, modem73, ION HF and ARDOP, next to the Winlink
    network's gateways. It records the <b>real waveform</b> a gateway runs, not only what its host software pretends to be.
  </p>
  <h2>Where listings come from</h2>
  <ul>
    <li><b>Sysop listings.</b> Anyone with an account and a callsign can list gateways under their own callsign. Listings show
      as unverified until the callsign is confirmed.</li>
    <li><b>The Winlink list.</b> Imported on a schedule and marked <Badge variant="outline">Winlink</Badge>. When a sysop lists the same
      callsign here, their own listing replaces the imported copy.</li>
  </ul>
  <h2>Open by design</h2>
  <ul>
    <li>Public read API, full downloadable dumps, and a Winlink-compatible feed so existing clients work today.</li>
    <li>Source code under AGPL-3.0; API spec under MPL-2.0. Run your own instance or mirror ours.</li>
    <li>Built to be shipped in community distributions such as 73 Linux and EmComm Tools.</li>
  </ul>
  <h2>Status meanings</h2>
  <ul>
    <li><StatusDot status="online" /><b>Online</b>: the gateway reported in within the last few hours.</li>
    <li><StatusDot status="listed" /><b>Listed</b>: the sysop confirmed it recently, and it has no automatic reporting.</li>
    <li><StatusDot status="stale" /><b>Stale</b>: it hasn't reported recently.</li>
    <li><StatusDot status="offline" /><b>Offline</b>: not heard from in over 48 hours.</li>
  </ul>
</div>
