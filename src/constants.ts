import os from 'node:os';
import path from 'node:path';
import type {
  SupportedPlatform,
  ValidClient,
  ClientInstallTarget,
} from './types.js';

export const VALID_CLIENTS = [
  'claude',
  'windsurf',
  'cursor',
  'vscode',
  'vscode-insiders',
] as const;

// cursor has a 60 character limit on the server id, or i'd prefer to use `heurist-mcp-`
export const MCP_SERVER_ID_PREFIX = 'heu-';
export const MCP_VERIFICATION_ENDPOINT =
  'https://sequencer-v2.heurist.xyz/provision/servers/details';

const homeDir = os.homedir();

const PLATFORM_PATHS = {
  win32: {
    baseDir: process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'),
  },
  darwin: {
    baseDir: path.join(homeDir, 'Library', 'Application Support'),
  },
  linux: {
    baseDir: process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config'),
  },
} as const;

const BASE_DIR = PLATFORM_PATHS[process.platform as SupportedPlatform].baseDir;

// default paths for file-based clients only
// vscode and vscode-insiders use command-line installation
export const DEFAULT_PATHS = {
  claude: path.join(BASE_DIR, 'Claude', 'claude_desktop_config.json'),
  windsurf: path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json'),
  cursor: path.join(homeDir, '.cursor', 'mcp.json'),
} as const;

export const CLIENT_PATHS: Record<ValidClient, ClientInstallTarget> = {
  claude: { type: 'file', path: DEFAULT_PATHS.claude },
  windsurf: { type: 'file', path: DEFAULT_PATHS.windsurf },
  cursor: { type: 'file', path: DEFAULT_PATHS.cursor },
  vscode: {
    type: 'protocol',
    protocol: 'vscode',
    path: 'mcp/install',
    isInsiders: false,
  },
  'vscode-insiders': {
    type: 'protocol',
    protocol: 'vscode-insiders',
    path: 'mcp/install',
    isInsiders: true,
  },
};

// Special case for Windsurf and Cursor: check if just the config folder exists
// as Windsurf and Cursor don't create one automatically
export const FALLBACK_DIR_CLIENTS: Set<ValidClient> = new Set([
  'windsurf',
  'cursor',
]);
