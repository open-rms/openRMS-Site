<script lang="ts">
  import { ACCOUNTS_URL, ACCOUNTS_UI_URL, ATLAS_AUDIENCE } from "#lib/config.ts";
  const scopesUrl = `${ATLAS_AUDIENCE.replace(/\/+$/, "")}/.well-known/oauth-protected-resource`;
  const origin = typeof location !== "undefined" ? location.origin : "https://atlas.example";
</script>

<div class="max-w-[820px] [&_h2]:mt-8 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6">
  <h1>API, Pat, and integrations</h1>
  <p>
    Everything on this site comes from a public API, with no private back end. Read endpoints need no key.
    Mirror it, build on it, ship it in your distribution.
  </p>
  <ul>
    <li><a href="/docs">Interactive API docs (Swagger)</a> · <a href="/api/v1/openapi.yaml">OpenAPI 3.1 spec</a> · <a href="{ACCOUNTS_URL}/api/auth/reference">Accounts (sign-in) API reference</a></li>
    <li>Full dumps: <a href="/api/v1/dumps/latest.json">JSON</a> · <a href="/api/v1/dumps/latest.geojson">GeoJSON</a> · <a href="/api/v1/dumps/latest.csv">CSV</a> (ETag, poll freely)</li>
  </ul>

  <h2 id="compat">Winlink-compatible feed</h2>
  <p>
    <code>{origin}/gateway/status.json</code> returns exactly the shape of <code>api.winlink.org/gateway/status.json</code>:
    same keys, same parameters (<code>Mode</code>, <code>HistoryHours</code>, <code>ServiceCodes</code>; <code>key</code> is accepted and ignored),
    GET or form POST. Anything that reads Winlink's list reads ours.
  </p>
  <pre>curl -s '{origin}/gateway/status.json?ServiceCodes=PUBLIC&ServiceCodes=MERCURY' | jq '.Gateways | length'</pre>
  <p>
    Gateways on open modes appear in the feed only where a client can actually dial them. Mercury, XARA and Data2G speak the
    VARA host protocol, so they appear as <code>VARA</code> under service codes <code>MERCURY</code>, <code>XARA</code> and
    <code>DATA2G</code>, the same convention their sysops use on Winlink.
    Clients asking only for <code>PUBLIC</code> never get a gateway their VARA modem can't reach.
    Add <code>extensions=1</code> to get the real modem on every channel.
  </p>
  <p>
    Sysops can also list channels under their own group codes. A new code is <b>unlisted</b>: it never appears in filters,
    stats, downloads or <code>/api/v1/service-codes</code>, and the feed serves it only when <code>ServiceCodes</code> names it
    exactly. Unlisted is not secret: anyone who guesses a code sees those listings, and lookups of codes that aren't public
    are rate-limited per IP. In the JSON API, read a channel's <code>serviceCodes</code> array; <code>serviceCode</code> is
    deprecated.
  </p>

  <h2 id="pat">Pat, EmComm Tools, 73 Linux</h2>
  <p>
    Pat downloads its list from a fixed address, but it reads its cached copy first. Put our feed in that cache and
    <code>pat rmslist</code>, Pat's web UI and EmComm Tools' <code>et-winlink-data</code> (re-run it after syncing) use it:
  </p>
  <pre>curl -fsSL {origin}/export/pat/rmslist.json -o ~/.local/share/pat/rmslist.json
pat rmslist --mode varahf</pre>
  <p>
    If your Pat config has <code>"service_codes": ["PUBLIC", "MERCURY"]</code>, Pat looks for
    <code>rmslist-PUBLIC-MERCURY.json</code> instead. The <code>pat-rmslist-sync.sh</code> script in the openRMS-Atlas repository
    reads Pat's config, names the file correctly, checks the download, and is safe to run from cron:
  </p>
  <pre>OPENRMS_ATLAS_URL={origin} pat-rmslist-sync.sh
# crontab: 17 */6 * * * OPENRMS_ATLAS_URL={origin} /usr/local/bin/pat-rmslist-sync.sh</pre>
  <p class="text-muted-foreground text-sm">
    <code>pat rmslist --force-download</code> replaces the file with Winlink's list again; the next sync restores it.
    That is also why 73 Linux's PatMenu doesn't show openRMS gateways yet: its list refresh forces a download.
    A Pat option to choose the list address is the clean long-term fix, and we plan to propose it upstream.
  </p>

  <h2 id="heartbeat">Gateway heartbeat</h2>
  <p>
    Make a key for Atlas with the <b>heartbeats</b> scope at <a href={`${ACCOUNTS_UI_URL}/keys`}>openRMS Accounts</a>
    (your <a href="/dashboard">dashboard</a> links there), then have the gateway report every few minutes:
  </p>
  <pre>curl -s -X POST {origin}/api/v1/gateways/GATEWAY_ID/heartbeat \
  -H "Authorization: Bearer ormk_…" -H "Content-Type: application/json" \
  -d '&#123;"currentFrequencyHz": 7101500, "currentModem": "mercury", "busy": false, "software": "LinBPQ 6.0.24"&#125;'</pre>

  <h2>Query examples</h2>
  <pre>GET /api/v1/gateways?modem=mercury,data2g&status=online,listed
GET /api/v1/gateways?grid=DN16&radiusKm=500&band=40m
GET /api/v1/gateways/W1AW-10
GET /api/v1/modems</pre>

  <h2 id="keys">API keys</h2>
  <p>
    Keys (<code>ormk_…</code>) are made at openRMS Accounts for one service and carry only the scopes you tick.
    Atlas's scopes: <code>heartbeat</code>, <code>watch:ingest</code>, <code>gateways:read</code> (your own listings)
    and <code>gateways:write</code> (create, edit and delete them). The list is published at
    <a href={scopesUrl}><code>/.well-known/oauth-protected-resource</code></a>.
    Keys never grant moderator or admin powers. A key expires (90 days by default, at most a year); Accounts
    emails you before it does.
  </p>
</div>
