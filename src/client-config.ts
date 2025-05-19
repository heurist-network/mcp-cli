import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { VALID_CLIENTS, DEFAULT_PATHS, CLIENT_PATHS } from './constants.js';
import type {
  ValidClient,
  ClientConfig,
  ClientFileTarget,
  ClientInstallTarget,
  ClientProtocolTarget,
  UrlBasedServer,
} from './types.js';
import open from 'open';

export function getConfigPath(client?: ValidClient): ClientInstallTarget {
  const normalizedClient = (client?.toLowerCase() || 'claude') as ValidClient;
  return (
    CLIENT_PATHS[normalizedClient] || {
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
    if (!fs.existsSync(configPath.path)) {
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
  if (configPath.type === 'protocol') {
    writeConfigProtocol(config, configPath);
  } else {
    writeConfigFile(config, configPath, client);
  }
}

function writeConfigProtocol(
  config: ClientConfig,
  target: ClientProtocolTarget,
): void {
  const serverConfig: Record<string, any> = {};

  Object.entries(config.mcpServers).forEach(([name, server]) => {
    serverConfig.name = name;
    serverConfig.type = 'sse';
    serverConfig.url = (server as UrlBasedServer).url;
  });

  const protocolPrefix = target.isInsiders ? 'vscode-insiders' : 'vscode';
  const protocolUrl = `${protocolPrefix}:${target.path}?${encodeURIComponent(JSON.stringify(serverConfig))}`;

  open(protocolUrl).catch((error: Error) => {
    throw new Error(
      `Failed to open ${protocolPrefix} protocol URL: ${error.message}. Please copy and paste this URL manually into your browser: ${protocolUrl}`,
    );
  });
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

function isVSCodeInstalled(target: ClientProtocolTarget): boolean {
  const vsCommand = target.isInsiders
    ? process.platform === 'win32'
      ? 'code-insiders.cmd'
      : 'code-insiders'
    : process.platform === 'win32'
      ? 'code.cmd'
      : 'code';

  try {
    execSync(`${vsCommand} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function detectInstalledClients(): ValidClient[] {
  return VALID_CLIENTS.filter((client) => {
    try {
      const configPath = getConfigPath(client);
      if (configPath.type === 'file') {
        const existsFile = fs.existsSync(configPath.path);
        const dirExists = fs.existsSync(path.dirname(configPath.path));
        return existsFile || dirExists;
      }
      return isVSCodeInstalled(configPath);
    } catch {
      return false;
    }
  });
}
