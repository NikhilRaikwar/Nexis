/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CIVIC_AUTH_CLIENT_ID: string
  readonly VITE_BACKEND_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}