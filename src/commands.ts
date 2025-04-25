import chalk from 'chalk';
import Enquirer from 'enquirer';
import {
  detectInstalledClients,
  readConfig,
  getConfigPath,
} from './client-config.js';
import { install } from './installer.js';
import { extractServerIdFromUrl, verifyServer } from './server-verify.js';
import { createInfoBox } from './utils.js';
import { VALID_CLIENTS, MCP_SERVER_ID_PREFIX } from './constants.js';
import type {
  ValidClient,
  CommandOptions,
  ServerVerificationResponse,
} from './types.js';

/**
 * List all detected clients and their configured MCP server counts
 * Displays results in a formatted info box
 */
export async function listCommand(): Promise<void> {
  const installedClients = detectInstalledClients();
  if (installedClients.length === 0) {
    console.log(chalk.yellow('No supported clients detected'));
    return;
  }

  console.log(
    createInfoBox(
      `${chalk.bold('Detected Clients')}\n
${installedClients
  .map((client) => {
    const config = readConfig(client);
    const configPath = getConfigPath(client);
    if (configPath.type === 'protocol') {
      return `${chalk.cyan(client)}: ${chalk.dim.italic('Configuration managed externally')}`;
    } else {
      const serverCount = Object.keys(config.mcpServers).length;
      return `${chalk.cyan(client)}: ${serverCount} MCP server${serverCount !== 1 ? 's' : ''} configured`;
    }
  })
  .join('\n')}`,
      'Clients',
    ),
  );
}

/**
 * Prompt user to select a client from available installed clients
 * Throws if no clients are detected
 */
async function selectClient(
  installedClients: ValidClient[],
): Promise<ValidClient> {
  if (installedClients.length === 0) {
    throw new Error('No supported clients detected on your system');
  }

  const response = await new Enquirer().prompt({
    type: 'select',
    name: 'client',
    message: 'Select a client to install to:',
    choices: installedClients,
  });

  return (response as { client: ValidClient }).client;
}

/**
 * Validate client from options or prompt user to select one
 * Checks if client is supported and installed
 */
async function validateAndGetClient(
  options: CommandOptions,
): Promise<ValidClient> {
  const installedClients = detectInstalledClients();
  if (installedClients.length === 0) {
    throw new Error(
      `No supported clients detected. Please install one of: ${VALID_CLIENTS.join(', ')}`,
    );
  }

  const client = options.client?.toLowerCase() as ValidClient | undefined;

  if (client && !VALID_CLIENTS.includes(client)) {
    throw new Error(
      `Invalid client: ${client}. Valid clients are: ${VALID_CLIENTS.join(', ')}`,
    );
  }

  if (!client) {
    console.log(
      chalk.dim(`\nDetected clients: ${installedClients.join(', ')}`),
    );
    return selectClient(installedClients);
  }

  if (!installedClients.includes(client)) {
    throw new Error(
      `${client} is not installed on your system. Detected clients: ${installedClients.join(', ')}`,
    );
  }

  return client;
}

/**
 * Validate and prepare data required for install/update operations
 * Verifies server details, client selection, and prompts for confirmation
 */
async function validateAndPrepare(options: CommandOptions): Promise<{
  serverDetails: ServerVerificationResponse;
  client: ValidClient;
  serverId: string;
}> {
  if (!options.url || !options.apiKey) {
    throw new Error('URL and API key are required');
  }

  new URL(options.url); // validate URL
  const serverDetails = await verifyServer(options.url, options.apiKey);
  const client = await validateAndGetClient(options);
  const serverId = `${MCP_SERVER_ID_PREFIX}${extractServerIdFromUrl(options.url)}`;

  console.log(
    createInfoBox(
      `${chalk.bold('SERVER DETAILS')}\n
${chalk.blue('Server ID:')} ${chalk.green(serverDetails.server_id)}
${chalk.blue('Type:')} ${chalk.green(serverDetails.server_type)}
${chalk.blue('Endpoint:')} ${chalk.green(serverDetails.endpoint)}\n
${chalk.bold('SUPPORTED AGENTS:')}
${serverDetails.supported_agents
  .map((agent) => `• ${chalk.green(agent)}`)
  .join('\n')}`,
      'Heurist MCP Tool',
    ),
  );

  const config = readConfig(client);
  const isUpdate = !!config.mcpServers[serverId];

  const response = await new Enquirer().prompt({
    type: 'confirm',
    name: 'confirmed',
    message: chalk.bold(
      `Ready to ${isUpdate ? 'update' : 'install'} on ${chalk.cyan(client)}?`,
    ),
    initial: true,
  });

  if (!(response as { confirmed: boolean }).confirmed) {
    console.log(chalk.yellow('Operation cancelled'));
    process.exit(0);
  }

  return { serverDetails, client, serverId };
}

/**
 * Install MCP tool for a given server to the selected client
 * Validates inputs and handles the installation process
 */
export async function installCommand(options: CommandOptions): Promise<void> {
  const { serverDetails, client, serverId } = await validateAndPrepare(options);

  // this check should logically never fail due to validateAndPrepare, but there for type safety
  if (!options.apiKey) {
    throw new Error('Internal error: API key missing after validation.');
  }

  await install(serverDetails, options.apiKey, serverId, client);
}
