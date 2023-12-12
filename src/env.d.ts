/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly CLIENT_ID: string;
  readonly CLIENT_SECRET: string;
  readonly CURRENT_ACCESS_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
