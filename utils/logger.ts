import { File, Paths } from 'expo-file-system';

const logFile = new File(Paths.document, 'debug.log');

// Print the path once so Claude can find the file
console.log('[logger] log file:', logFile.uri.replace('file://', ''));

async function append(line: string) {
  const entry = `${new Date().toISOString()} ${line}\n`;
  const existing = logFile.exists ? await logFile.text() : '';
  logFile.write(existing + entry);
}

export const logger = {
  log: (message: string, ...args: unknown[]) => {
    console.log(message, ...args);
    append([message, ...args.map(a => JSON.stringify(a))].join(' ')).catch(() => {});
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(message, ...args);
    append(`ERROR ${[message, ...args.map(a => JSON.stringify(a))].join(' ')}`).catch(() => {});
  },
};
