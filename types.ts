// FIX: Defined UserRole enum and removed circular self-import.
export enum UserRole {
  Coach = 'Coach',
  Player = 'Player',
}

export interface User {
  id: string;
  email?: string; // Email is now optional
  phoneNumber?: string | null;
  name: string;
  role: UserRole;
  teamIds: string[]; // Teams the user is currently a member of (players)
  coachTeamIds?: string[]; // Teams the user coaches (coaches only)
  isNew?: boolean; // Flag for new users needing onboarding
  preferences?: UserPreferences;
}

export interface UserPreferences {
  defaultTeamId?: string;
  showAdvancedAnalytics?: boolean;
  darkMode?: boolean;
}

export interface Team {
  id:string;
  name: string;
  logoUrl?: string;
  seasonYear: number;
  coachId: string;
  primaryColor?: string;
  joinCodePlayer?: string;
  joinCodeCoach?: string;
}

// Added JoinCode interface to manage team invitations
export interface JoinCode {
  id: string; // The code itself
  teamId: string;
}

export interface PlayerProfile {
  gradYear: number;
  throws: 'R' | 'L';
  bats: 'R' | 'L' | 'S';
  position?: string;
}

export interface Player extends User {
  role: UserRole.Player;
  profile: PlayerProfile;
}

export interface Coach extends User {
  role: UserRole.Coach;
  coachTeamIds: string[];
}

export type TargetZone = 'Inside High' | 'Inside Middle' | 'Inside Low' | 'Middle High' | 'Middle Middle' | 'Middle Low' | 'Outside High' | 'Outside Middle' | 'Outside Low';
export type PitchType = 'Fastball' | 'Curveball' | 'Slider' | 'Changeup' | 'Sinker';
export type CountSituation = 'Ahead' | 'Even' | 'Behind';
export type BaseRunner = '1B' | '2B' | '3B';
export type GoalType = 'Execution %' | 'Hard Hit %' | 'No Strikeouts' | 'Total Reps';
export type DrillType = 'Tee Work' | 'Soft Toss' | 'Front Toss' | 'Throwing' | 'Live BP' | 'Machine';

export interface Drill {
  id: string;
  teamId: string;
  name: string;
  description: string;
  targetZones: TargetZone[];
  pitchTypes: PitchType[];
  countSituation: CountSituation;
  baseRunners: BaseRunner[];
  outs: 0 | 1 | 2;
  goalType: GoalType;
  goalTargetValue: number;
  repsPerSet: number;
  sets: number;
  drillType?: DrillType;
}

export interface SetResult {
  setNumber: number;
  repsAttempted: number;
  repsExecuted: number;
  hardHits: number;
  strikeouts: number;
  drillLabel?: string; // Free-text focus for this set (e.g., "Low Tee")
  drillType?: DrillType; // Structured drill category for analytics
  notes?: string;
  // New fields for game situation context
  outs?: 0 | 1 | 2;
  countSituation?: CountSituation;
  baseRunners?: BaseRunner[];
  grade?: number; // Subjective grade from 1-10
  pitchTypes?: PitchType[];
  // FIX: Added missing targetZones property to allow logging it in a session set.
  targetZones?: TargetZone[];
}

export interface Session {
  id: string;
  playerId: string;
  drillId?: string; // Optional for ad-hoc sessions
  name: string; // Used for drill name or ad-hoc session type
  teamId: string;
  date: string; // ISO string
  sets: SetResult[];
  feedback?: string;
  reflection?: string;
  createdAt?: string; // ISO timestamp of when the log was recorded
  updatedAt?: string; // ISO timestamp of the most recent edit
  lastEditedBy?: string;
}

export type DayOfWeek = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export interface DrillAssignment {
  id: string;
  drillId: string;
  teamId: string;
  playerIds: string[]; // List of assigned player IDs. Can use a special value like 'all' for the whole team.
  isRecurring: boolean;
  recurringDays?: DayOfWeek[];
  dueDate?: string; // For one-time assignments
  assignedDate: string;
}

export interface PersonalGoal {
  id: string;
  playerId: string;
  teamId: string;
  metric: GoalType;
  targetValue: number;
  startDate: string;
  targetDate: string;
  status: 'Active' | 'Completed' | 'Archived';
  drillType?: DrillType;
  targetZones?: TargetZone[];
  pitchTypes?: PitchType[];
  reflection?: string;
  minReps?: number;
}

export interface TeamGoal {
  id: string;
  teamId: string;
  description: string;
  metric: GoalType;
  targetValue: number;
  startDate: string;
  targetDate: string;
  status: 'Active' | 'Completed' | 'Archived';
  drillType?: DrillType;
  targetZones?: TargetZone[];
  pitchTypes?: PitchType[];
}
