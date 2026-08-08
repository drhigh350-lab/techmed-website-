/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SANITY_PROJECT_ID: string | undefined;
  readonly PUBLIC_SANITY_DATASET: string | undefined;
  readonly PUBLIC_SANITY_API_VERSION: string | undefined;
  readonly SANITY_API_TOKEN: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
