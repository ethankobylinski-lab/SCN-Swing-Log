// FIX: Defined UserRole enum and removed circular self-import.
export enum UserRole {
  Coach = 'Coach',
  Player = 'Player',
}

// MembershipRole represents per-team roles (HeadCoach, AssistantCoach, Player)
export type MembershipRole = 'Player' | 'HeadCoach' | 'AssistantCoach';

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
  orientationCompleted?: boolean; // Whether user has completed the orientation tour
  orientationProgress?: OrientationProgress; // Detailed orientation progress tracking
}

export interface UserPreferences {
  defaultTeamId?: string;
  showAdvancedAnalytics?: boolean;
  darkMode?: boolean;
}

export interface OrientationProgress {
  welcomeTourCompleted?: boolean;
  firstHittingSessionLogged?: boolean;
  firstPitchingSessionLogged?: boolean;
  firstGoalSet?: boolean;
  dashboardTooltipSeen?: boolean;
  historyTooltipSeen?: boolean;
  analyticsTooltipSeen?: boolean;
  goalsTooltipSeen?: boolean;
  logSessionTooltipSeen?: boolean;
}

export interface Team {
  id: string;
  name: string;
  seasonYear: number;
  coachId: string; // The head coach ID
  primaryColor?: string;
  createdAt?: string;
  createdBy?: string;
}

// JoinCode represents permanent invite codes stored in the join_codes table
export interface JoinCode {
  code: string; // The 6-character uppercase code
  teamId: string;
  role: 'player' | 'coach';
  createdBy?: string;
  createdAt?: string;
  expiresAt?: string;
}

// TeamMember represents normalized membership in the team_members table
export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: MembershipRole;
  status: 'active' | 'invited' | 'removed';
  addedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// SessionFeedback represents coach reactions/notes on player sessions
export interface SessionFeedback {
  id: string;
  sessionId: string;
  teamId: string;
  coachId: string;
  reaction?: string; // e.g., 'thumbs_up', 'fire'
  note?: string;
  createdAt?: string;
  updatedAt?: string;
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
export type GoalType = 'Execution %' | 'Hard Hit %' | 'No Strikeouts' | 'Total Reps' | 'Strike %' | 'Velocity' | 'Command';
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

export type SessionType = 'hitting' | 'pitching';

export interface Session {
  id: string;
  playerId: string;
  drillId?: string; // Optional for ad-hoc sessions
  name: string; // Used for drill name or ad-hoc session type
  teamId?: string;
  date: string; // ISO string
  type?: SessionType;
  sets: SetResult[];
  feedback?: string;
  reflection?: string;
  coachFeedback?: string;
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
  createdByUserId?: string;
  createdByRole?: UserRole;
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

// --- Pitching Session Types ---

export interface TeamSettings {
  teamId: string;
  restRequirementPerPitch: number; // hours per pitch; default 1.0
}

export interface PitchTypeModel {
  id: string;
  pitcherId: string;
  name: string;
  code: string;
  colorHex: string;
  isActive: boolean;
}

export interface PitchGoal {
  pitchTypeId: string;
  repsGoal?: number;
  strikeGoalPct?: number;
}

export type PitchSessionType = 'command' | 'velo' | 'mix' | 'recovery' | 'flat' | 'live';

export interface PitchSession {
  id: string;
  pitcherId: string;
  teamId: string;
  catcherId?: string;
  date: string; // ISO date string
  sessionName: string;
  sessionType: PitchSessionType;
  status: 'in_progress' | 'completed' | 'emergency_review' | 'discarded';
  gameSituationEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  pitchGoals: PitchGoal[];
  totalPitches: number;
  sessionStartTime: string;
  sessionEndTime?: string;
  restHoursRequired?: number;
  restEndTime?: string;
  // Analytics metrics (computed and stored on session finalization)
  analytics?: PitchSessionAnalytics;
  // Detailed pitch records for this session
  pitchRecords?: PitchRecord[];
}

export type ZoneId =
  | 'Z11' | 'Z12' | 'Z13'
  | 'Z21' | 'Z22' | 'Z23'
  | 'Z31' | 'Z32' | 'Z33'
  | 'EDGE_HIGH' | 'EDGE_LOW' | 'EDGE_GLOVE' | 'EDGE_ARM';

export type PitchOutcome =
  | 'ball'
  | 'called_strike'
  | 'swinging_strike'
  | 'foul'
  | 'in_play'
  | 'hbp';

export interface ZoneCell {
  row: number;
  col: number;
}

export interface PitchRecord {
  id: string;
  sessionId: string;
  index: number;
  batterSide: 'L' | 'R';
  ballsBefore: number;
  strikesBefore: number;
  runnersOn: {
    on1b: boolean;
    on2b: boolean;
    on3b: boolean;
  };
  outs: 0 | 1 | 2;
  pitchTypeId: string;
  targetZone: ZoneId;
  targetXNorm?: number;
  targetYNorm?: number;
  actualZone: ZoneId;
  actualXNorm?: number;
  actualYNorm?: number;
  velocityMph?: number;
  outcome: PitchOutcome;
  inPlayQuality?: 'weak' | 'medium' | 'hard';
  missDistanceInches?: number;
  createdAt: string;
}

export interface PitchEligibility {
  status: 'green' | 'yellow' | 'red';
  timeLeftHours: number;
  restEndTime?: string;
}

// --- Pitching Analytics Types ---

export interface MissPattern {
  missUpPct: number;
  missDownPct: number;
  missArmSidePct: number;
  missGloveSidePct: number;
  avgMissDistance: number;
}

export interface SituationalMetrics {
  firstPitchStrikePct: number;
  behindInCountStrikePct: number;
  behindInCountAccuracy: number;
}

export interface TrendMetrics {
  earlyAccuracy: number; // first 10 pitches
  lateAccuracy: number; // last 10 pitches
}

export interface PitchTypeMetrics {
  pitchTypeId: string;
  pitchTypeName: string;
  count: number;
  strikePct: number;
  accuracyHitRate: number; // % perfect hits (actualZone == intendedZone)
  accuracyProximityAvg: number; // average proximity score 0-1
  accuracyInchesAvg?: number; // average miss distance in inches
  accuracyInchesMedian?: number; // median miss distance in inches
  accuracyInchesMax?: number; // max miss distance in inches
}

// ... (rest of file)




export interface PitchSessionAnalytics {
  // Core command metrics
  strikePct: number;
  accuracyHitRate: number; // % of pitches that hit intended zone exactly
  accuracyProximityAvg: number; // average proximity score (0-1)

  // Per pitch type metrics
  pitchTypeMetrics: PitchTypeMetrics[];

  // Miss patterns
  missPattern: MissPattern;

  // Situational metrics
  situational: SituationalMetrics;

  // Trend metrics
  trend: TrendMetrics;

  // Composite score (0-100)
  commandScore: number;

  // Auto-generated insights
  insights: string[];
}

export interface ZoneHeatmapData {
  zone: ZoneId;
  intendedCount: number;
  actualCount: number;
  proximityAvg: number;
}

export interface SessionAnalyticsFilter {
  dateRange?: { start: string; end: string };
  pitchTypeIds?: string[];
  sessionTypes?: PitchSessionType[];
}

// --- Pitch Simulation Types ---

export interface PitchSimulationTemplate {
  id: string;
  teamId: string;
  createdBy: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PitchSimulationStep {
  id: string;
  templateId: string;
  orderIndex: number;
  pitchTypeId: string;
  intendedZone: ZoneId;
  createdAt: string;
}

export interface PitchSimulationAssignment {
  id: string;
  templateId: string;
  pitcherId?: string; // undefined = team-wide
  teamId: string;
  isRecurring: boolean;
  recurringDays?: DayOfWeek[];
  dueDate?: string; // ISO date string
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PitchSimulationRun {
  id: string;
  templateId: string;
  pitcherId: string;
  teamId: string;
  startedAt: string;
  completedAt?: string;
  currentStepIndex: number;
  totalSteps: number;
  createdAt: string;
}

export interface PitchSimulationRunPitch {
  id: string;
  runId: string;
  stepId: string;
  pitchRecordId: string;
  isStrike: boolean;
  hitIntendedZone: boolean;
  createdAt: string;
}

// Helper types for UI
export interface SimulationStepWithDetails extends PitchSimulationStep {
  pitchTypeName: string;
  pitchTypeCode: string;
  pitchTypeColor: string;
}

export interface SimulationRunSummary {
  totalPitches: number;
  strikes: number;
  balls: number;
  strikePct: number;
  accuracyPct: number;
  pitchTypeBreakdown: {
    pitchTypeName: string;
    pitchTypeCode: string;
    count: number;
    strikePct: number;
    accuracyPct: number;
  }[];
}
export interface StatusMessage {
  type: 'success' | 'error';
  message: string;
}
