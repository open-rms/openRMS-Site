<script lang="ts">
  import { cn } from "./utils.ts";
  // Full class strings so Tailwind can see them; the status comes from the API at runtime.
  const COLOR: Record<string, string> = {
    online: "bg-online",
    listed: "bg-listed",
    stale: "bg-stale",
    offline: "bg-offline",
  };
  let { status, class: className = "" }: { status: string; class?: string } = $props();
</script>

<span class={cn("mr-1.5 inline-block size-2.5 rounded-full", COLOR[status], className)}></span>
