// FIX: Defined UserRole enum and removed circular self-import.
export enum UserRole {
  Coach = 'Coach',
  Player = 'Player',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  teamIds: string[];
}

export interface Team {
  id:string;
  name: string;
  code: string;
  logoUrl?: string;
  seasonYear: number;
  coachId: string;
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
}

export type TargetZone = 'Inside High' | 'Inside Middle' | 'Inside Low' | 'Middle High' | 'Middle Middle' | 'Middle Low' | 'Outside High' | 'Outside Middle' | 'Outside Low';
export type PitchType = 'Fastball' | 'Curveball' | 'Slider' | 'Changeup' | 'Sinker';
export type CountSituation = 'Ahead' | 'Even' | 'Behind';
export type BaseRunner = '1B' | '2B' | '3B';
export type GoalType = 'Execution %' | 'Hard Hit %' | 'No Strikeouts';
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