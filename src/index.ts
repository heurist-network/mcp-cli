#!/usr/bin/env node
/**
 * Heurist MCP Installer
 *
 * A CLI tool to install Heurist MCP tools in compatible clients.
 * It verifies the server using an API key, and installs the tool
 * on all detected clients with visual feedback.
 */
import chalk from 'chalk';
import { Command } from 'commander';
import { createErrorBox, createWelcomeBox, createInfoBox } from './utils.js';
import { VALID_CLIENTS } from './constants.js';
import { listCommand, installCommand } from './commands.js';
import packageJson from '../package.json';

console.log(
  createWelcomeBox(
    `${chalk.bold('Heurist MCP Tool Installer')}\n
This tool will install a Heurist MCP server tool in your compatible clients.
${chalk.dim(`Supported clients: ${VALID_CLIENTS.join(', ')}`)}`,
    'Welcome',
  ),
);

const program = new Command();

// suppress commander's error output
program.configureOutput({
  writeErr: () => {},
  outputError: () => {},
});

// override exit behavior to show help box on argument errors
program.exitOverride();

// ref: https://github.com/tj/commander.js/issues/2346
program
  .name(packageJson.name)
  .description(packageJson.description)
  .version(packageJson.version);

program
  .command('install', { isDefault: true })
  .description('Install or update MCP tool')
  .argument('<url>', 'tool url')
  .argument('<api_key>', 'api key')
  .argument('[client]', 'specific client to install to')
  .action(async (urlInput, apiKey, client) => {
    try {
      let url = urlInput;
      // check if the url looks like a short tool id (e.g., '0f1234de')
      if (!urlInput.startsWith('http') && /^[a-f0-9]+$/i.test(urlInput)) {
        url = `https://sequencer-v2.heurist.xyz/tool${urlInput}/sse`;
      }
      await installCommand({ url, apiKey, client });
    } catch (error) {
      console.error(
        createErrorBox(
          `${chalk.bold('Installation failed')}\n
${chalk.red(error instanceof Error ? error.message : String(error))}`,
          'Error',
        ),
      );
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List detected clients')
  .action(async () => {
    try {
      await listCommand();
    } catch (error) {
      console.error(
        createErrorBox(
          `${chalk.bold('List failed')}\n
${chalk.red(error instanceof Error ? error.message : String(error))}`,
          'Error',
        ),
      );
      process.exit(1);
    }
  });

(async () => {
  try {
    await program.parseAsync();
  } catch (err) {
    // show help box on argument errors
    console.log(
      createInfoBox(
        `${chalk.bold('Usage')}\n
${chalk.dim('→')} Install a tool:
  ${chalk.green('heurist-mcp-cli')} ${chalk.yellow('<tool-url>')} ${chalk.yellow('<api-key>')} ${chalk.dim('[client]')}\n
${chalk.dim('→')} List detected clients:
  ${chalk.green('heurist-mcp-cli list')}\n
${chalk.dim('Example:')}
  ${chalk.green('heurist-mcp-cli')} ${chalk.dim('https://sequencer-v2.heurist.xyz/tool0f1234de/sse api_key cursor')}`,
        'Help',
      ),
    );
    process.exit(1);
  }
})();
