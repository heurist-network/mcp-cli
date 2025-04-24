import chalk from 'chalk';
import ora from 'ora';
import { MCP_VERIFICATION_ENDPOINT } from './constants.js';
import type { ServerVerificationResponse } from './types.js';

/**
 * Extract server ID from a tool URL
 * Example URLs:
 * - https://sequencer-v2.heurist.xyz/tool0f1234de/sse
 * - https://sequencer-v2.heurist.xyz/tool0f1234de
 */
export function extractServerIdFromUrl(url: string): string {
  const matches = url.match(/\/tool([a-f0-9]+)(?:\/|$)/);
  if (!matches || !matches[1]) {
    throw new Error(
      'Could not extract server ID from URL. Expected format: */tool{id} or */tool{id}/sse',
    );
  }
  return matches[1];
}

/**
 * Verify a server by making an API call to the verification endpoint
 * Shows a spinner during the process and updates the user on progress
 */
export async function verifyServer(
  url: string,
  apiKey: string,
): Promise<ServerVerificationResponse> {
  const spinner = ora('Verifying server...').start();

  const serverId = extractServerIdFromUrl(url);
  spinner.text = `Verifying server ${chalk.cyan(serverId)}...\n`;

  const response = await fetch(`${MCP_VERIFICATION_ENDPOINT}/${serverId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Server verification failed: Invalid tool ID or URL.');
    }
    throw new Error(`Server verification failed: ${response.statusText}`);
  }

  const serverDetails = (await response.json()) as ServerVerificationResponse;
  // whitespace after the checkmark
  spinner.succeed(' Server verified');
  return serverDetails;
}
