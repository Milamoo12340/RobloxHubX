declare module 'node-cron' {
  export interface ScheduledTask {
    start: () => void;
    stop: () => void;
    nextDate: () => Date;
  }
  
  export function schedule(
    cronExpression: string,
    task: () => void,
    options?: { scheduled?: boolean; timezone?: string }
  ): ScheduledTask;
  
  export function validate(cronExpression: string): boolean;
}