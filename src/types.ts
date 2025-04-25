export interface ClientFileTarget {
  type: 'file';
  path: string;
}

export interface ClientProtocolTarget {
  type: 'protocol';
  protocol: string;
  path: string;
  isInsiders?: boolean;
}

export type ClientInstallTarget = ClientFileTarget | ClientProtocolTarget;

export interface ClientConfig {
  mcpServers: Record<string, ConfiguredServer | UrlBasedServer>;
  [key: string]: unknown;
}

export interface ConfiguredServer {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface UrlBasedServer {
  url: string;
}

export interface ServerVerificationResponse {
  server_id: string;
  endpoint: string;
  mcp_endpoint: string;
  server_type: string;
  supported_agents: string[];
}

export interface CommandOptions {
  url?: string;
  apiKey?: string;
  client?: string;
}

export type ValidClient =
  | 'claude'
  | 'windsurf'
  | 'cursor'
  | 'vscode'
  | 'vscode-insiders';
export type SupportedPlatform = 'win32' | 'darwin' | 'linux';
