<script lang="ts">
/**
 * FrontpageFabs — Floating Action Buttons for the front page.
 *
 * Spec: specs/cyan-ds/layouts/app-shell/fab-tray.md
 * Spec: specs/pelilauta/session/frozen.md §Svelte 5 FAB components hide themselves
 *       if the user's frozen status is true
 *
 * Mounted only on the authenticated branch of the host composition (index.astro).
 * Not anonymous-reachable: anonymous viewers receive a static SSR login CTA instead.
 * See specs/pelilauta/session/frozen.md §Anonymous viewer sees login CTA in FAB tray.
 * Value imports of @pelilauta/auth/client are legitimate here because this island
 * is never mounted on anonymous renders.
 */
import CnIcon from "@cyan/components/CnIcon.svelte";
import type { SessionProfile } from "@pelilauta/auth/client";
import { profile, uid } from "@pelilauta/auth/client";
import { onMount } from "svelte";

interface Props {
  label: string;
}

const { label }: Props = $props();

let liveUid = $state<string | null>(null);
let liveProfile = $state<SessionProfile | null>(null);

onMount(() => {
  const unsubUid = uid.subscribe((v) => {
    liveUid = v;
  });
  const unsubProfile = profile.subscribe((v) => {
    liveProfile = v;
  });
  return () => {
    unsubUid();
    unsubProfile();
  };
});
</script>

{#if liveUid !== null && liveProfile !== null && liveProfile.frozen !== true}
  <a class="button fab" href="/create/thread">
    <CnIcon noun="send" />
    <span>{label}</span>
  </a>
{/if}
