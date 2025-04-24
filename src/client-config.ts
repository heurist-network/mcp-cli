import fs from 'node:fs';
import path from 'node:path';
import { VALID_CLIENTS, DEFAULT_PATHS } from './constants.js';
import type {
  ValidClient,
  ClientCommandTarget,
  ClientConfig,
  ClientFileTarget,
  ClientInstallTarget,
  UrlBasedServer,
} from './types.js';

const clientPaths: Record<ValidClient, ClientInstallTarget> = {
  claude: { type: 'file', path: DEFAULT_PATHS.claude },
  windsurf: { type: 'file', path: DEFAULT_PATHS.windsurf },
  cursor: { type: 'file', path: DEFAULT_PATHS.cursor },
  vscode: {
    type: 'command',
    command: process.platform === 'win32' ? 'code.cmd' : 'code',
  },
  'vscode-insiders': {
    type: 'command',
    command:
      process.platform === 'win32' ? 'code-insiders.cmd' : 'code-insiders',
  },
};

function getConfigPath(client?: ValidClient): ClientInstallTarget {
  const normalizedClient = (client?.toLowerCase() || 'claude') as ValidClient;
  return (
    clientPaths[normalizedClient] || {
      type: 'file',
      path: path.join(
        path.dirname(DEFAULT_PATHS.claude),
        '..',
        normalizedClient,
        `${normalizedClient}_config.json`,
      ),
    }
  );
}

export function readConfig(client: ValidClient): ClientConfig {
  try {
    const configPath = getConfigPath(client);
    if (configPath.type === 'command' || !fs.existsSync(configPath.path)) {
      return { mcpServers: {} };
    }

    const rawConfig = JSON.parse(fs.readFileSync(configPath.path, 'utf8'));
    return {
      ...rawConfig,
      mcpServers: rawConfig.mcpServers || {},
    };
  } catch {
    return { mcpServers: {} };
  }
}

export function writeConfig(config: ClientConfig, client?: ValidClient): void {
  if (!config.mcpServers || typeof config.mcpServers !== 'object') {
    throw new Error('Invalid mcpServers structure');
  }

  const configPath = getConfigPath(client);
  if (configPath.type === 'command') {
    writeConfigCommand(config, configPath);
  } else {
    writeConfigFile(config, configPath, client);
  }
}

function writeConfigCommand(
  config: ClientConfig,
  target: ClientCommandTarget,
): void {
  const args = Object.entries(config.mcpServers).flatMap(([name, server]) => [
    '--add-mcp',
    JSON.stringify({
      name,
      type: 'sse',
      url: (server as UrlBasedServer).url,
    }),
  ]);

  try {
    const { execFileSync } = require('node:child_process');
    execFileSync(target.command, args);
  } catch (error) {
    if (error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Command '${target.command}' not found. Make sure ${target.command} is installed and on your PATH`,
      );
    }
    throw error;
  }
}

function writeConfigFile(
  config: ClientConfig,
  target: ClientFileTarget,
  client?: ValidClient,
): void {
  const configDir = path.dirname(target.path);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  let existingConfig: ClientConfig = { mcpServers: {} };
  try {
    if (fs.existsSync(target.path)) {
      existingConfig = JSON.parse(fs.readFileSync(target.path, 'utf8'));
    }
  } catch {}

  let finalConfig = { ...existingConfig, ...config };

  // TODO: This is a workaround to support Windsurf's config format.
  // Windsurf uses `serverUrl` instead of `url` for MCP servers.
  // Not sure if other clients use different keys, if they do I'll do a bigger refactor.
  if (client === 'windsurf' && finalConfig.mcpServers) {
    const transformedServers: Record<string, any> = {};
    for (const [name, server] of Object.entries(finalConfig.mcpServers)) {
      if (server && typeof server === 'object' && 'url' in server) {
        const { url, ...rest } = server as UrlBasedServer;
        transformedServers[name] = { ...rest, serverUrl: url };
      } else {
        transformedServers[name] = server;
      }
    }
    finalConfig = { ...finalConfig, mcpServers: transformedServers };
  }

  fs.writeFileSync(target.path, JSON.stringify(finalConfig, null, 2));
}

export function detectInstalledClients(): ValidClient[] {
  return VALID_CLIENTS.filter((client) => {
    try {
      const configPath = getConfigPath(client);
      if (configPath.type === 'file') {
        return fs.existsSync(configPath.path);
      }
      const { execSync } = require('node:child_process');
      execSync(`${configPath.command} --version`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  });
}
