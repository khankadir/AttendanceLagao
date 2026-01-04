
export interface PunchEntry {
  id: string;
  type: 'IN' | 'OUT';
  timestamp: number;
}

export interface WorkDay {
  date: string; // YYYY-MM-DD
  punches: PunchEntry[];
  totalHours: number;
}

export interface UserProfile {
  name: string;
  email: string;
  joinedAt: number;
}

export interface DashboardStats {
  totalHoursThisWeek: number;
  averageDailyHours: number;
  lastPunch: PunchEntry | null;
  status: 'PUNCHED_IN' | 'PUNCHED_OUT';
}

export interface AIInsight {
  summary: string;
  recommendations: string[];
  productivityScore: number;
}
