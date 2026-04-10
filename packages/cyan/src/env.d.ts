declare module "*.svelte" {
  const component: unknown;
  export default component;
}

declare module "*.astro" {
  const component: unknown;
  export default component;
}

declare module "*.svg?raw" {
  const content: string;
  export default content;
}
