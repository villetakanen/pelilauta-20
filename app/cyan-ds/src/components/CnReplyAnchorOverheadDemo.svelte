<script lang="ts">
import CnChatBar from "@cyan/components/CnChatBar.svelte";
import CnReplyAnchor from "@cyan/components/CnReplyAnchor.svelte";
import CnReplyContext from "@cyan/components/CnReplyContext.svelte";

interface Props {
  user?: string;
  snippet?: string;
  placeholder?: string;
}

let {
  user = "tapa",
  snippet = "Let's start the game already!",
  placeholder = "Write a reply…",
}: Props = $props();
</script>

<CnReplyAnchor>
  {#snippet overhead()}
    <CnReplyContext {user} text={snippet} />
  {/snippet}
  <CnChatBar {placeholder} />
</CnReplyAnchor>
