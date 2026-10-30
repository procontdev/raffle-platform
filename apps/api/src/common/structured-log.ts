import { Logger } from '@nestjs/common';

const logger = new Logger('structured');

export function logEvent(event: string, context: Record<string, string | number | undefined> = {}) {
  logger.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', event, ...context }));
}
