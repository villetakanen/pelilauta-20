<script lang="ts">
import ProfileButton from "@cyan/components/ProfileButton.svelte";
import type { SessionProfile } from "../../stores/session";
import { profile, sessionState } from "../../stores/session";

interface Props {
  ssrProfile: SessionProfile | null;
}

let { ssrProfile }: Props = $props();

// Prefer the nanostore if it has been hydrated, otherwise fall back to the SSR seed.
// This prevents skeleton flashes before AuthHandler mounts.
let currentProfile = $derived($profile || ssrProfile);
let loading = $derived($sessionState === "loading");
</script>

<ProfileButton
  nick={currentProfile?.nick}
  photoURL={currentProfile?.avatarURL}
  {loading}
/>
