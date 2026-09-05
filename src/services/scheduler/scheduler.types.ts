export interface SchedulerConfig {
  checkIntervalMs: number;      
  maxRetries: number;           
  initialRetryDelayMs: number;  
  maxRetryDelayMs: number;      
}

export interface ScheduledJob {
  variantId: string;
  slotId: string;
  scheduledFor: Date;
  platform: string;
  content: string;
  retryCount: number;
  lastAttempt?: Date;
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  checkIntervalMs: 10000,       
  maxRetries: 3,                
  initialRetryDelayMs: 5000,    
  maxRetryDelayMs: 60000,       
};
