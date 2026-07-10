import { Injectable } from '@nestjs/common';

export type HealthStatus = {
  status: 'ok';
  name: string;
  docs: string;
  timestamp: string;
};

@Injectable()
export class AppService {
  health(): HealthStatus {
    return {
      status: 'ok',
      name: 'Task List API',
      docs: '/docs',
      timestamp: new Date().toISOString(),
    };
  }
}
