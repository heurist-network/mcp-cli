import chalk from 'chalk';
import ora from 'ora';
import Enquirer from 'enquirer';
import {
  detectInstalledClients,
  readConfig,
  writeConfig,
} from './client-config.js';
import type {
  ConfiguredServer,
  ServerVerificationResponse,
  UrlBasedServer,
  ValidClient,
  UrlBasedClient,
} from './types.js';
import { formatError, createSuccessBox, createWarnBox } from './utils.js';
import { MCP_SERVER_ID_PREFIX } from './constants.js';

const URL_BASED_CLIENTS = ['cursor', 'windsurf'] as const;

function isUrlBasedClient(client?: string): client is UrlBasedClient {
  return URL_BASED_CLIENTS.includes(client as UrlBasedClient);
}

/**
 * Format the server configuration for the MCP runner
 * Creates the appropriate command and arguments based on platform and client
 */
function formatServerConfig(
  serverDetails: ServerVerificationResponse,
  apiKey: string,
  clientName?: ValidClient,
): ConfiguredServer | UrlBasedServer {
  if (clientName && isUrlBasedClient(clientName)) {
    return { url: serverDetails.mcp_endpoint };
  }

  // only claude desktop uses mcp-remote, as it doesn't support SSE yet.
  // ref: https://github.com/orgs/modelcontextprotocol/discussions/16
  // ref: https://developers.cloudflare.com/agents/guides/remote-mcp-server/#connect-your-remote-mcp-server-to-claude-and-other-mcp-clients-via-a-local-proxy
  const npxArgs = ['-y', 'mcp-remote', serverDetails.mcp_endpoint];

  return process.platform === 'win32'
    ? { command: 'cmd', args: ['/c', 'npx', ...npxArgs] }
    : { command: 'npx', args: npxArgs };
}

async function checkExistingInstallation(
  client: ValidClient,
  serverId: string,
): Promise<void> {
  const config = readConfig(client);
  const existingServers = Object.keys(config.mcpServers)
    .filter((id) => id.startsWith(MCP_SERVER_ID_PREFIX))
    .map((id) => ({ id, displayName: id }));

  if (existingServers.length > 0) {
    console.log(
      createWarnBox(
        `Found existing MCP tools in ${chalk.cyan(client)}:\n${existingServers
          .map(({ displayName }) => chalk.dim(`• ${displayName}`))
          .join(
            '\n',
          )}\n\nProceeding will ${chalk.yellow('update')} the configuration.`,
        'Existing Installation',
      ),
    );

    const response = await new Enquirer().prompt({
      type: 'confirm',
      name: 'continue',
      message: 'Do you want to continue?',
      initial: true,
    });

    if (!(response as { continue: boolean }).continue) {
      console.log(chalk.yellow('Installation cancelled'));
      process.exit(0);
    }
  }
}

/**
 * Install MCP tool on all detected clients
 * Displays interactive feedback during the process
 */
export async function install(
  serverDetails: ServerVerificationResponse,
  apiKey: string,
  serverId: string,
  targetClient?: ValidClient,
): Promise<void> {
  const spinner = ora({
    text: 'Detecting MCP clients...',
    color: 'cyan',
  }).start();

  const detectedClients = targetClient
    ? [targetClient]
    : detectInstalledClients();

  if (detectedClients.length === 0) {
    spinner.fail('No MCP-compatible clients detected.');
    return;
  }

  spinner.succeed(
    `Found ${detectedClients.length} compatible client${detectedClients.length > 1 ? 's' : ''}: ${detectedClients.map((c) => chalk.cyan(c)).join(', ')}`,
  );

  let installCount = 0;

  for (const client of detectedClients) {
    await checkExistingInstallation(client, serverId);

    const clientSpinner = ora({
      text: `Installing on ${chalk.cyan(client)}...`,
      color: 'cyan',
    }).start();

    try {
      const config = readConfig(client);
      const serverConfig = formatServerConfig(serverDetails, apiKey, client);
      config.mcpServers[serverId] = serverConfig;
      writeConfig(config, client);
      clientSpinner.succeed(`Installed on ${chalk.cyan(client)}`);
      installCount++;
    } catch (error) {
      clientSpinner.fail(
        `Failed to install on ${chalk.cyan(client)}: ${formatError(error)}`,
      );
    }
  }

  if (installCount > 0) {
    const successMessage = `${chalk.bold('✨ Installation complete!')}\n
${chalk.dim('→')} Start or restart your client to use the tool
${chalk.dim('→')} Your tool will appear as ${chalk.cyan(serverId)}`;

    const claudeSpecificInstructions = detectedClients.includes('claude')
      ? `\n\n${chalk.yellow('Note for Claude Desktop users:')}\n
${chalk.dim('→')} Claude Desktop runs in the background
${chalk.dim('→')} Right-click the Claude icon in the system tray
${chalk.dim('→')} Select "Quit" and restart Claude Desktop
${chalk.dim('→')} The new tool will appear in your tools list`
      : '';

    console.log(
      createSuccessBox(successMessage + claudeSpecificInstructions, 'Success'),
    );
  } else {
    throw new Error('Installation failed on all clients');
  }
}
