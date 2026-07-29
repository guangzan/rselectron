/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * Listening URL for the Renderer development server.
     * Set by Rselectron during `dev` sessions.
     */
    RSELECTRON_RENDERER_URL?: string;
  }
}

declare module '*?asset' {
  const src: string;
  export default src;
}

declare module '*?asset&asarUnpack' {
  const src: string;
  export default src;
}

declare module '*?modulePath' {
  const src: string;
  export default src;
}

declare module '*?nodeWorker' {
  import type { Worker, WorkerOptions } from 'node:worker_threads';
  const createWorker: (options?: WorkerOptions) => Worker;
  export default createWorker;
}

declare module '*.wasm?loader' {
  const loadWasm: (
    importObject?: WebAssembly.Imports,
  ) => Promise<WebAssembly.Instance>;
  export default loadWasm;
}

declare module '*.node' {
  const addon: unknown;
  export default addon;
}
