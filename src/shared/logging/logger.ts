interface LogDetails {
  [key: string]: unknown;
}

function write(level: 'info' | 'warn' | 'error', message: string, details: LogDetails = {}): void {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...details,
  });

  if (level === 'error') console.error(record);
  else if (level === 'warn') console.warn(record);
  else console.log(record);
}

export const logger = {
  info(message: string, details?: LogDetails): void { write('info', message, details); },
  warn(message: string, details?: LogDetails): void { write('warn', message, details); },
  error(message: string, details?: LogDetails): void { write('error', message, details); },
};
