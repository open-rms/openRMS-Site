<script lang="ts">
  import "leaflet/dist/leaflet.css";
  import type { Gateway } from "./api.ts";
  import { onMount } from "svelte";

  // linkQuery: appended to gateway links (e.g. "?serviceCode=X" so unlisted channels still show).
  let { gateways, height = "420px", center, linkQuery = "" }: { gateways: Gateway[]; height?: string; center?: [number, number]; linkQuery?: string } = $props();
  let el: HTMLDivElement;
  let map: any;
  let layer: any;
  let L: any;

  const OPEN = new Set(["mercury", "xara", "data2g", "modem73", "ion-hf", "freedata", "other"]);
  const color = (g: Gateway) =>
    g.channels.some((c) => OPEN.has(c.modem)) ? "#d9480f" : g.source === "openrms" ? "#0f5132" : "#2f6fb0";

  onMount(() => {
    let disposed = false;
    import("leaflet").then((mod) => {
      if (disposed) return;
      L = mod.default ?? mod;
      map = L.map(el, { worldCopyJump: true, preferCanvas: true }).setView(center ?? [30, -40], center ? 7 : 2);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      draw();
    });
    return () => {
      disposed = true;
      map?.remove();
    };
  });

  function esc(s: string) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  }

  function draw() {
    if (!map || !L) return;
    layer?.remove();
    layer = L.layerGroup();
    for (const g of gateways) {
      if (g.latitude == null || g.longitude == null) continue;
      const modes = [...new Set(g.channels.map((c) => c.modemLabel))].join(", ");
      L.circleMarker([g.latitude, g.longitude], {
        radius: g.status === "online" ? 6 : 4.5,
        color: color(g),
        weight: 1.5,
        fillOpacity: g.status === "offline" ? 0.25 : 0.75,
      })
        .bindPopup(`<b><a href="/gateway/${encodeURIComponent(g.id)}${esc(linkQuery)}">${esc(g.callsign)}</a></b><br>${esc(modes)}<br><small>${esc(g.status)} · ${esc(g.source)}</small>`)
        .addTo(layer);
    }
    layer.addTo(map);
  }

  $effect(() => {
    gateways;
    draw();
  });
</script>

<div class="z-0 rounded-lg border" bind:this={el} style:height></div>
<div class="text-muted-foreground mt-1.5 flex flex-wrap gap-4 text-sm [&_i]:mr-1.5 [&_i]:inline-block [&_i]:size-2.5 [&_i]:rounded-full">
  <span><i style="background:#d9480f"></i>open mode (Mercury, Data2G…)</span>
  <span><i style="background:#0f5132"></i>listed by sysop</span>
  <span><i style="background:#2f6fb0"></i>from Winlink list</span>
</div>
