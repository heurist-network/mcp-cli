import boxen from 'boxen';

const boxStyles = {
  base: {
    padding: 1,
    margin: 1,
    borderStyle: 'round' as const,
    titleAlignment: 'center' as const,
  },
  info: {
    borderColor: 'blue',
    title: 'Info',
  },
  success: {
    borderColor: 'green',
    title: 'Success',
  },
  error: {
    borderColor: 'red',
    title: 'Error',
  },
  welcome: {
    borderColor: 'cyan',
    title: 'Welcome',
  },
  warning: {
    borderColor: 'yellow',
    title: 'Warning',
  },
};

// Format error messages consistently
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('ENOENT')) {
      return 'Client executable not found. Please ensure it is installed and in your PATH.';
    }
    if (error.message.includes('Invalid URL')) {
      return 'Invalid tool URL. Please check the URL format.';
    }
    if (error.message.includes('fetch')) {
      return 'Failed to verify server. Please check your internet connection and API key.';
    }
    if (error.message.includes('not found in')) {
      return `${error.message}\nUse the standard install command to add a new server.`;
    }
    return error.message;
  }
  return String(error);
}

// Create styled messages
export function createInfoBox(message: string, title = 'Info'): string {
  return boxen(message, {
    ...boxStyles.base,
    ...boxStyles.info,
    title,
  });
}

export function createSuccessBox(message: string, title = 'Success'): string {
  return boxen(message, {
    ...boxStyles.base,
    ...boxStyles.success,
    title,
  });
}

export function createErrorBox(message: string, title = 'Error'): string {
  return boxen(message, {
    ...boxStyles.base,
    ...boxStyles.error,
    title,
  });
}

export function createWelcomeBox(message: string, title = 'Welcome'): string {
  return boxen(message, {
    ...boxStyles.base,
    ...boxStyles.welcome,
    title,
  });
}

export function createWarnBox(message: string, title = 'Warning'): string {
  return boxen(message, {
    ...boxStyles.base,
    ...boxStyles.warning,
    title,
  });
}
