
export interface DailyTasks {
  study: boolean[]; // 7 segments
  water: number;    // 0 to 20
  zeroSugar: boolean;
  skin: boolean;
  posture: number;  // 0 to 3
  gym: boolean;
}

export interface AppStreaks {
  study: number;
  water: number;
  zeroSugar: number;
  skin: number;
  posture: number;
  gym: number;
}

export interface AppState {
  vault: number;      // Current day's earnings
  wallet: number;     // Total persistent balance (can be negative)
  startDate: string;  // ISO String
  lastAuditDate: string; // YYYY-MM-DD in IST
  dailyTasks: DailyTasks;
  streaks: AppStreaks;
}

export enum TaskType {
  STUDY = 'STUDY',
  WATER = 'WATER',
  SUGAR = 'SUGAR',
  SKIN = 'SKIN',
  POSTURE = 'POSTURE',
  GYM = 'GYM'
}
