// Stub declarations - satisfies TypeScript compiler
// This file is replaced with real generated bindings during deployment

export type backendInterface = Record<string, unknown> & {
  _initializeAccessControlWithSecret: (token: string) => Promise<undefined>;
  getCallerUserRole: () => Promise<
    { admin: null } | { user: null } | { guest: null }
  >;
  assignCallerUserRole: (user: unknown, role: unknown) => Promise<undefined>;
  isCallerAdmin: () => Promise<boolean>;
};

import type { Identity } from "@dfinity/agent";

export type AgentOptions = {
  host?: string;
  identity?: Identity | Promise<Identity>;
  fetch?: typeof globalThis.fetch;
  fetchOptions?: Record<string, unknown>;
  callOptions?: Record<string, unknown>;
  verifyQuerySignatures?: boolean;
  retryTimes?: number;
};

export type CreateActorOptions = {
  agentOptions?: AgentOptions;
  actorOptions?: Record<string, unknown>;
};

export class ExternalBlob {
  contentType?: string;

  static fromURL(_url: string): ExternalBlob {
    return new ExternalBlob();
  }

  async getBytes(): Promise<Uint8Array> {
    return new Uint8Array();
  }

  onProgress?: (progress: number) => void;
}

export const idlFactory = () => ({});
export const canisterId = "";

export function createActor(
  _canisterId: string,
  _uploadFile?: unknown,
  _downloadFile?: unknown,
  _options?: CreateActorOptions,
): backendInterface {
  return {} as backendInterface;
}
