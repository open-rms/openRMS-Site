// Typed client for the openRMS Atlas API (openRMS-Spec/atlas/openapi.yaml) and the
// parts of openRMS-Accounts the Site uses (openRMS-Spec/accounts/identity.md).
import { ACCOUNTS_URL, ATLAS_AUDIENCE, ATLAS_URL } from "./config.ts";
export type Status = "online" | "listed" | "stale" | "offline";
export type Source = "openrms" | "winlink";

export interface Channel {
  id: string; frequencyHz: number; band: string | null; modem: string; modemLabel: string; variant: string | null;
  modemVersion: string | null;
  /** Public API: the service codes this channel is listed under that you may see (use this). */
  serviceCodes?: string[];
  /** Public API: deprecated, serviceCodes[0]. Owner API: the stored main code. */
  serviceCode: string;
  /** Owner API only: the other stored codes. */
  extraServiceCodes?: string[];
  /** Deprecated: serviceCodes[0]. */
  feedServiceCode?: string; operatingHours: string; antenna: string; radioRange: string;
  gridsquare: string | null; baud: string; notes: string; winlinkSupportedModes: string | null; compatSupportedModes: string | null;
}
export interface Emcomm {
  backupPower?: string[]; runtimeHours?: number | null; offGrid?: boolean; lastTested?: string | null;
  servedAgencies?: string; aresRaces?: boolean; activationContact?: string;
}
export interface Gateway {
  id: string; source: Source; callsign: string; baseCallsign: string; ownerVerified: boolean;
  club: { callsign: string; name: string; verified: boolean } | null;
  latitude: number | null; longitude: number | null; gridsquare: string | null; locationPrecision: string;
  comments: string; ownerComments: string; claimed: boolean; claimedAt: string | null;
  software: string | null; winlinkListed: boolean; alsoListedBy: Source[]; unverifiedConflict?: boolean; emcomm: Emcomm;
  live: { currentFrequencyHz?: number | null; currentModem?: string | null; busy?: boolean | null };
  status: Status; lastHeartbeatAt: string | null; confirmedAt: string | null; lastSeenAt: string | null;
  createdAt: string; updatedAt: string; distanceKm?: number; hidden?: boolean; channels: Channel[];
  heardOnAir: HeardOnAir | null;
}
export interface Modem {
  id: string; label: string; variants: string[]; defaultVariant?: string; band: string; homepage?: string;
  winlinkNative: boolean; compat: { supportedModes: string; mode: number; serviceCode: string | null } | null;
}
export interface Stats {
  gateways: number; channels: number; byModem: Record<string, number>; bySource: Record<string, number>;
  byStatus: Record<string, number>; byBand: Record<string, number>;
  /** Gateways per service code, as the Winlink-compatible feed publishes it. */
  byServiceCode?: Record<string, number>;
}

export interface ManagedCallsign {
  callsign: string; clubId: string | null; clubName: string | null; role: "self" | "owner" | "admin" | "member"; verified: boolean;
}
export interface Club {
  id: string; name: string; callsign: string; verified: boolean; myRole: "owner" | "admin" | "member";
  members: { userId: string; callsign: string; name: string; role: "owner" | "admin" | "member" }[];
}

export type StaffRole = "user" | "moderator" | "admin" | "superadmin";
export type Permissions = Record<string, string[]>;
export const RANK: Record<StaffRole, number> = { user: 0, moderator: 1, admin: 2, superadmin: 3 };
export const hasPerm = (p: Permissions | undefined, res: string, action: string) => !!p?.[res]?.includes(action);
export interface StaffUser {
  id: string; name: string; email: string; callsign: string; callsignVerified: boolean | null; callsignVerifiedMethod: string | null;
  role: string | null; banned: boolean | null; createdAt: string;
}
export interface StaffClub { id: string; name: string; callsign: string; callsignVerified: boolean | null; callsignVerifiedMethod: string | null; members: string | null }
export interface StaffReport { id: number; gateway_id: string; callsign: string; reason: string; created_at: string }
export interface ServiceCode { code: string; description: string; gateways: number }
export interface StaffServiceCode extends ServiceCode {
  visibility: "public" | "unlisted"; channels: number; updatedAt: string; updatedBy: string | null;
  /** Distinct sysops (accounts or clubs) listing under it. */
  owners: number; lastUsedAt: string | null;
  /** Searcher-days in the demand window (see codeSearches). */
  searchers: number;
}
export interface CodeSearch { code: string; searchers: number; searches: number; lastDay: string; visibility: "unlisted" | null }
/** Shown wherever a sysop or a group picks a code. */
export const UNLISTED_NOTE =
  "A new code starts unlisted: it is never shown in filters, stats or downloads, and only someone who types the exact code finds your listing. Unlisted is not secret, though: anyone who guesses the code sees it.";
export interface StaffImport { id: number; source: string; started_at: string; finished_at: string | null; ok: boolean | null; gateways: number | null; channels: number | null; message: string | null }
export interface StaffAudit { id: number; actor_callsign: string | null; action: string; target: string; detail: string | null; created_at: string }

export interface Watcher {
  id: string; name: string; gridsquare: string | null; locationPrecision: "grid4" | "grid6" | "hidden"; public: boolean;
  disabled: boolean; disabledReason: string | null; hasKey: boolean; lastSeenAt: string | null;
  lastStatus: { software?: string; sdr?: string; decoders?: number; calibrated?: boolean } | null; createdAt: string;
}
export interface StaffWatcher {
  id: string; name: string; gridsquare: string | null; public: boolean; disabled: boolean; disabledReason: string | null;
  lastSeenAt: string | null; callsign: string; ownerVerified: boolean; events: number; lastStatus: { software?: string } | null;
}

export interface HeardOnAir { lastHeard: string; dialHz: number; watchers: number; confidence: "single" | "confirmed"; sightings: number }
export interface Candidate { callsign: string; gatewayId: string }
export interface Sighting {
  id: string; crc: string; dialHz: number; band: string | null; heard: boolean; firstHeard: string; lastHeard: string; frames: number;
  watchers: number; verifiedWatchers: number; confidence: "single" | "confirmed" | "called"; bestSnrDb: number | null; clients: number;
  resolution: "unique" | "ambiguous" | "unknown"; gatewayId: string | null; callsign: string | null; candidates: Candidate[];
}
export interface Contributor {
  callsign: string; ownerVerified: boolean; watcher: string; gridsquare: string | null; bands: string[]; listeningHours: number;
  frames: number; firstContribution: string; lastSeen: string | null; live: boolean;
}
export interface WatchEvent {
  id: number; type: string; kind: string | null; ts: string; end: string | null; modem: string | null; dialHz: number | null;
  band: string | null; snrDb: number | null; client: string | null; watcher: { name: string; gridsquare: string | null };
  station: { crc: string; resolution: string; callsign: string | null; gatewayId: string | null; candidates: Candidate[] } | null;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public issues?: { path: (string | number)[]; message: string }[]) {
    super(message);
  }
}

// ── Atlas calls carry a short-lived Accounts token (identity.md §3a) ───────────────
let cached: { token: string | null; until: number } | null = null;

/** Clear the cached Atlas token (sign-out, account switch). */
export function clearAtlasToken() {
  cached = null;
}

async function atlasToken(): Promise<string | null> {
  if (cached && cached.until > Date.now()) return cached.token;
  try {
    const r = await fetch(`${ACCOUNTS_URL}/api/v1/token?aud=${encodeURIComponent(ATLAS_AUDIENCE)}`, { credentials: "include" });
    if (!r.ok) {
      cached = { token: null, until: Date.now() + 30_000 }; // signed out: don't ask again for a while
      return null;
    }
    const j = (await r.json()) as { token: string; expires_in?: number; expires_at?: string | number };
    const exp = j.expires_at ? new Date(typeof j.expires_at === "number" ? j.expires_at * 1000 : j.expires_at).getTime() : Date.now() + (j.expires_in ?? 900) * 1000;
    cached = { token: j.token, until: exp - 60_000 };
    return j.token;
  } catch {
    return null;
  }
}

async function send<T>(url: string, init: RequestInit, auth: "atlas" | "accounts"): Promise<T> {
  const headers: Record<string, string> = { ...(init.body ? { "Content-Type": "application/json" } : {}), ...((init.headers as Record<string, string>) ?? {}) };
  if (auth === "atlas") {
    const t = await atlasToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(url, { ...init, headers, credentials: auth === "accounts" ? "include" : "omit" });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error ?? body.message ?? res.statusText, body.issues);
  return body as T;
}

/** Atlas API (gateways, watchers, keys, Atlas staff tools). */
const call = <T>(path: string, init: RequestInit = {}) => send<T>(`${ATLAS_URL}${path}`, init, "atlas");
/** openRMS-Accounts API (profile, clubs, users and roles). */
const acct = <T>(path: string, init: RequestInit = {}) => send<T>(`${ACCOUNTS_URL}${path}`, init, "accounts");

export const api = {
  gateways: (params: Record<string, string>) =>
    call<{ total: number; gateways: Gateway[] }>(`/api/v1/gateways?${new URLSearchParams(params)}`),
  gateway: (id: string, serviceCode?: string) =>
    call<Gateway>(`/api/v1/gateways/${encodeURIComponent(id)}${serviceCode ? `?${new URLSearchParams({ serviceCode })}` : ""}`),
  serviceCodes: () => call<{ serviceCodes: ServiceCode[] }>("/api/v1/service-codes"),
  modems: () => call<Modem[]>("/api/v1/modems"),
  stats: () => call<Stats>("/api/v1/stats"),
  myGateways: () => call<{ gateways: Gateway[] }>("/api/v1/me/gateways"),
  createGateway: (g: unknown) => call<{ id: string }>("/api/v1/me/gateways", { method: "POST", body: JSON.stringify(g) }),
  updateGateway: (id: string, g: unknown) => call<{ id: string }>(`/api/v1/me/gateways/${id}`, { method: "PUT", body: JSON.stringify(g) }),
  deleteGateway: (id: string) => call<void>(`/api/v1/me/gateways/${id}`, { method: "DELETE" }),
  confirmGateway: (id: string) => call<{ ok: true }>(`/api/v1/me/gateways/${id}/confirm`, { method: "POST" }),
  me: () =>
    call<{ user: { id: string; callsign: string; role: StaffRole } | null; callsigns?: ManagedCallsign[]; permissions?: Permissions }>("/api/v1/me")
      .catch(() => ({ user: null, callsigns: [] as ManagedCallsign[], permissions: {} as Permissions })),
  staff: {
    users: (q: string) => acct<{ users: StaffUser[] }>(`/api/v1/admin/users?${new URLSearchParams({ q })}`),
    setRole: (id: string, role: StaffRole) => acct<{ ok: true }>(`/api/v1/admin/users/${id}/role`, { method: "POST", body: JSON.stringify({ role }) }),
    verifyUser: (id: string, verified: boolean, method: string) =>
      acct<{ ok: true }>(`/api/v1/admin/users/${id}/verify-callsign`, { method: "POST", body: JSON.stringify({ verified, method }) }),
    ban: (userId: string, banReason: string) => acct<unknown>("/api/auth/admin/ban-user", { method: "POST", body: JSON.stringify({ userId, banReason }) }),
    unban: (userId: string) => acct<unknown>("/api/auth/admin/unban-user", { method: "POST", body: JSON.stringify({ userId }) }),
    clubs: () => acct<{ clubs: StaffClub[] }>("/api/v1/admin/clubs"),
    verifyClub: (id: string, verified: boolean, method: string) =>
      acct<{ ok: true }>(`/api/v1/admin/clubs/${id}/verify-callsign`, { method: "POST", body: JSON.stringify({ verified, method }) }),
    reports: () => call<{ reports: StaffReport[] }>("/api/v1/admin/reports"),
    resolve: (id: number) => call<{ ok: true }>(`/api/v1/admin/reports/${id}/resolve`, { method: "POST" }),
    hide: (gatewayId: string, hidden: boolean, reason: string) =>
      call<{ ok: true }>(`/api/v1/admin/gateways/${gatewayId}/hide`, { method: "POST", body: JSON.stringify({ hidden, reason }) }),
    imports: () => call<{ imports: StaffImport[] }>("/api/v1/admin/imports"),
    serviceCodes: () => call<{ serviceCodes: StaffServiceCode[] }>("/api/v1/admin/service-codes"),
    codeSearches: () => call<{ days: number; minSearchers: number; searches: CodeSearch[] }>("/api/v1/admin/service-codes/searches"),
    setServiceCode: (code: string, patch: { visibility?: "public" | "unlisted"; description?: string }) =>
      call<StaffServiceCode>(`/api/v1/admin/service-codes/${encodeURIComponent(code)}`, { method: "PATCH", body: JSON.stringify(patch) }),
    runImport: () => call<{ gateways: number; channels: number }>("/api/v1/admin/imports/winlink", { method: "POST" }),
    audit: () => call<{ entries: StaffAudit[] }>("/api/v1/admin/audit"),
    accountAudit: () => acct<{ entries: StaffAudit[] }>("/api/v1/admin/audit"),
    watchers: () => call<{ watchers: StaffWatcher[] }>("/api/v1/admin/watchers"),
    disableWatcher: (id: string, disabled: boolean, reason: string) =>
      call<{ ok: true }>(`/api/v1/admin/watchers/${id}/disable`, { method: "POST", body: JSON.stringify({ disabled, reason }) }),
    purgeWatcher: (id: string) => call<{ deleted: number }>(`/api/v1/admin/watchers/${id}/purge`, { method: "POST" }),
    settings: () => call<{ settings: { key: string; value: unknown; updatedAt: string }[] }>("/api/v1/admin/settings"),
    setSetting: (key: string, value: unknown) => call<{ ok: true }>(`/api/v1/admin/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) }),
    optouts: () => call<{ optouts: { callsign: string; reason: string | null; createdAt: string }[] }>("/api/v1/admin/optouts"),
    addOptout: (callsign: string, reason: string) => call<{ ok: true }>("/api/v1/admin/optouts", { method: "POST", body: JSON.stringify({ callsign, reason }) }),
    removeOptout: (callsign: string) => call<void>(`/api/v1/admin/optouts/${encodeURIComponent(callsign)}`, { method: "DELETE" }),
  },
  clubs: () => acct<{ clubs: Club[] }>("/api/v1/me/clubs"),
  createClub: (callsign: string, name: string) => acct<{ id: string }>("/api/v1/me/clubs", { method: "POST", body: JSON.stringify({ callsign, name }) }),
  addClubMember: (id: string, callsign: string, role: string) =>
    acct<{ ok: true }>(`/api/v1/me/clubs/${id}/members`, { method: "POST", body: JSON.stringify({ callsign, role }) }),
  setClubRole: (id: string, userId: string, role: string) =>
    acct<{ ok: true }>(`/api/v1/me/clubs/${id}/members/${userId}`, { method: "PUT", body: JSON.stringify({ role }) }),
  removeClubMember: (id: string, userId: string) => acct<void>(`/api/v1/me/clubs/${id}/members/${userId}`, { method: "DELETE" }),
  deleteClub: (id: string) => acct<void>(`/api/v1/me/clubs/${id}`, { method: "DELETE" }),
  watchers: () => call<{ watchers: Watcher[] }>("/api/v1/me/watchers"),
  createWatcher: (w: { name: string; gridsquare: string | null; locationPrecision: string; public: boolean }) =>
    call<Watcher>("/api/v1/me/watchers", { method: "POST", body: JSON.stringify(w) }),
  updateWatcher: (id: string, w: Partial<{ name: string; gridsquare: string | null; locationPrecision: string; public: boolean }>) =>
    call<Watcher>(`/api/v1/me/watchers/${id}`, { method: "PATCH", body: JSON.stringify(w) }),
  deleteWatcher: (id: string) => call<void>(`/api/v1/me/watchers/${id}`, { method: "DELETE" }),
  mintWatcherKey: (id: string) => call<{ key: string }>(`/api/v1/me/watchers/${id}/key`, { method: "POST" }),
  revokeWatcherKey: (id: string) => call<void>(`/api/v1/me/watchers/${id}/key`, { method: "DELETE" }),
  sightings: (params: Record<string, string> = {}) =>
    call<{ total: number; sightings: Sighting[] }>(`/api/v1/watch/sightings?${new URLSearchParams(params)}`),
  contributors: (days: number) =>
    call<{ days: number; totals: { watchers: number; live: number; listeningHours: number; frames: number; anonymous: number }; contributors: Contributor[] }>(
      `/api/v1/watch/contributors?days=${days}`,
    ),
  events: (params: Record<string, string> = {}) => call<{ events: WatchEvent[] }>(`/api/v1/watch/events?${new URLSearchParams(params)}`),
  /** Device linking (RFC 8628): claim the code while signed in, then approve it. */
  approveDevice: async (userCode: string) => {
    await acct<unknown>(`/api/auth/device?user_code=${encodeURIComponent(userCode)}`);
    return acct<unknown>("/api/auth/device/approve", { method: "POST", body: JSON.stringify({ userCode }) });
  },
  accountsMe: () => acct<{ user: { id: string; callsign: string; role: StaffRole } | null; permissions: Permissions }>("/api/v1/me")
    .catch(() => ({ user: null, permissions: {} as Permissions })),
  gatewayKeys: () => call<{ keys: { id: string; name: string | null; start: string | null; gatewayIds: string[] | null; createdAt: string }[] }>("/api/v1/me/keys"),
  createGatewayKey: (name: string, gatewayIds: string[] | null) =>
    call<{ id: string; key: string }>("/api/v1/me/keys", { method: "POST", body: JSON.stringify({ name, gatewayIds }) }),
  revokeGatewayKey: (id: string) => call<void>(`/api/v1/me/keys/${id}`, { method: "DELETE" }),
  claimable: () => call<{ gateways: (Gateway & { claimedByMe: boolean; claimedByOther: boolean })[] }>("/api/v1/me/claimable"),
  claim: (id: string) => call<{ ok: true }>(`/api/v1/me/gateways/${id}/claim`, { method: "POST" }),
  saveDetails: (id: string, d: { comments: string; software: string | null; emcomm: Emcomm }) =>
    call<{ ok: true }>(`/api/v1/me/gateways/${id}/details`, { method: "PUT", body: JSON.stringify(d) }),
  release: (id: string) => call<{ ok: true }>(`/api/v1/me/gateways/${id}/release`, { method: "POST" }),
  report: (id: string, reason: string) => call<{ ok: true }>(`/api/v1/gateways/${id}/report`, { method: "POST", body: JSON.stringify({ reason }) }),
};

export function fmtFreq(hz: number): string {
  return `${(hz / 1000).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kHz`;
}

export function ago(iso: string | null): string {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 90) return "just now";
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 172800) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} days ago`;
}

export const STATUS_LABEL: Record<Status, string> = {
  online: "Online",
  listed: "Listed",
  stale: "Stale",
  offline: "Offline",
};

export const STATUS_HELP: Record<Status, string> = {
  online: "Reported in within the last few hours",
  listed: "Listed by its sysop and confirmed recently, no automatic reporting",
  stale: "Has not reported recently",
  offline: "Not heard from in over 48 hours",
};
