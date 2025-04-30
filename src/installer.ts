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
} from './types.js';
import { formatError, createSuccessBox, createWarnBox } from './utils.js';
import { MCP_SERVER_ID_PREFIX } from './constants.js';

function formatServerConfig(
  serverDetails: ServerVerificationResponse,
  clientName?: ValidClient,
): ConfiguredServer | UrlBasedServer {
  if (clientName === 'claude') {
    // only claude desktop uses mcp-remote, as it doesn't support SSE yet.
    // ref: https://github.com/orgs/modelcontextprotocol/discussions/16
    // ref: https://developers.cloudflare.com/agents/guides/remote-mcp-server/#connect-your-remote-mcp-server-to-claude-and-other-mcp-clients-via-a-local-proxy
    const npxArgs = ['-y', 'mcp-remote', serverDetails.mcp_endpoint];

    return process.platform === 'win32'
      ? { command: 'cmd', args: ['/c', 'npx', ...npxArgs] }
      : { command: 'npx', args: npxArgs };
  }

  // all other clients use URL-based configuration
  return { url: serverDetails.mcp_endpoint };
}

async function checkExistingInstallation(client: ValidClient): Promise<void> {
  const config = readConfig(client);
  const existingServers = Object.keys(config.mcpServers)
    .filter((id) => id.startsWith(MCP_SERVER_ID_PREFIX))
    .map((id) => ({ id, displayName: id }));

  if (existingServers.length > 0) {
    console.log(
      createWarnBox(
        `Found existing Heurist MCP tool(s) in ${chalk.cyan(client)}:\n${existingServers
          .map(({ displayName }) => chalk.dim(`• ${displayName}`))
          .join(
            '\n',
          )}\n\nProceeding will ${chalk.yellow('remove existing')} Heurist MCP tool(s) and install the new one.`,
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
    await checkExistingInstallation(client);

    const clientSpinner = ora({
      text: `Installing on ${chalk.cyan(client)}...`,
      color: 'cyan',
    }).start();

    try {
      const config = readConfig(client);
      const serverConfig = formatServerConfig(serverDetails, client);

      let idToWrite = serverId; // default to dynamic id

      // use fixed id for vscode and vscode-insiders
      if (client.includes('vscode')) {
        idToWrite = 'heurist-mcp';
        // no need to explicitly delete for vscode, just overwrite
      } else {
        // for other clients, remove all existing heurist mcp server entries first
        Object.keys(config.mcpServers).forEach((key) => {
          if (key.startsWith(MCP_SERVER_ID_PREFIX)) {
            delete config.mcpServers[key];
          }
        });
      }

      config.mcpServers[idToWrite] = serverConfig;
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
    const finalServerName = detectedClients.some((c) => c.includes('vscode'))
      ? 'heurist-mcp'
      : serverId;

    const successMessage = `${chalk.bold('✨ Installation complete!')}\n
${chalk.dim('→')} Start or restart your client to use the tool
${chalk.dim('→')} Your tool will appear as ${chalk.cyan(finalServerName)}`;

    const specificInstructions: string[] = [];

    if (detectedClients.includes('claude')) {
      specificInstructions.push(
        `${chalk.yellow('Note for Claude Desktop users:')}\n
${chalk.dim('→')} Claude Desktop runs in the background
${chalk.dim('→')} Right-click the Claude icon in the system tray
${chalk.dim('→')} Select "Quit" and restart Claude Desktop
${chalk.dim('→')} The new tool will appear in your tools list`,
      );
    }

    if (detectedClients.includes('vscode')) {
      specificInstructions.push(
        `${chalk.yellow('Note for VS Code users:')}\n
${chalk.dim('→')} Enable Agent Mode for the tool to work:
  ${chalk.dim('1.')} Open Settings (${process.platform === 'darwin' ? '⌘,' : 'Ctrl+,'})
  ${chalk.dim('2.')} Search for ${chalk.cyan('"chat.agent.enabled"')}
  ${chalk.dim('3.')} Check the box to enable agent mode`,
      );
    }

    specificInstructions.push(
      `${chalk.yellow('Need help?')}\n${chalk.dim('→ Join our Discord for support:')} ${chalk.cyan('https://discord.gg/heuristai')}`,
    );

    const fullMessage = [successMessage, ...specificInstructions].join('\n\n');

    console.log(createSuccessBox(fullMessage, 'Success'));
  } else {
    throw new Error('Installation failed on all clients');
  }
}
