import { UserRole, Player, Coach, Team, Drill, Session, DrillAssignment, PersonalGoal, TeamGoal } from '../types';

export const MOCK_COACH: Coach = {
  id: 'coach-1',
  name: 'Coach Miller',
  role: UserRole.Coach,
  teamIds: ['team-1'],
};

export const MOCK_PLAYERS: Player[] = [
  {
    id: 'player-1',
    name: 'Alex Johnson',
    role: UserRole.Player,
    teamIds: ['team-1'],
    profile: { gradYear: 2025, throws: 'R', bats: 'R', position: 'SS' },
  },
  {
    id: 'player-2',
    name: 'Ben Carter',
    role: UserRole.Player,
    teamIds: ['team-1'],
    profile: { gradYear: 2026, throws: 'L', bats: 'L', position: 'OF' },
  },
  {
    id: 'player-3',
    name: 'Chris Davis',
    role: UserRole.Player,
    teamIds: ['team-1'],
    profile: { gradYear: 2025, throws: 'R', bats: 'S', position: 'C' },
  },
];

export const MOCK_TEAM: Team = {
  id: 'team-1',
  name: 'SCN Eagles',
  seasonYear: 2024,
  coachId: 'coach-1',
  primaryColor: '#1d4ed8',
};

export const MOCK_DRILLS: Drill[] = [
  {
    id: 'drill-1',
    teamId: 'team-1',
    name: 'High Tee Power',
    description: 'Focus on driving the ball in the air from an inside high tee position.',
    targetZones: ['Inside High'],
    pitchTypes: [],
    drillType: 'Tee Work',
    countSituation: 'Ahead',
    baseRunners: [],
    outs: 0,
    goalType: 'Hard Hit %',
    goalTargetValue: 60,
    repsPerSet: 10,
    sets: 3,
  },
  {
    id: 'drill-2',
    teamId: 'team-1',
    name: 'Outside Fastball BP',
    description: 'Live BP session focusing on driving outside fastballs to the opposite field.',
    targetZones: ['Outside Middle', 'Outside High'],
    pitchTypes: ['Fastball'],
    drillType: 'Live BP',
    countSituation: 'Even',
    baseRunners: [],
    outs: 1,
    goalType: 'Execution %',
    goalTargetValue: 75,
    repsPerSet: 8,
    sets: 4,
  },
  {
    id: 'drill-3',
    teamId: 'team-1',
    name: 'Curveball Recognition',
    description: 'Machine work to improve recognizing and hitting curveballs in the zone.',
    targetZones: [],
    pitchTypes: ['Curveball'],
    drillType: 'Machine',
    countSituation: 'Behind',
    baseRunners: ['1B'],
    outs: 2,
    goalType: 'No Strikeouts',
    goalTargetValue: 0,
    repsPerSet: 12,
    sets: 3,
  }
];

// Function to generate sessions for the last 14 days
const generateSessions = (): Session[] => {
  const sessions: Session[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    // Each player does 1-2 sessions on a given day
    MOCK_PLAYERS.forEach(player => {
        if (Math.random() > 0.4) { // 60% chance of a session
            const drill = MOCK_DRILLS[Math.floor(Math.random() * MOCK_DRILLS.length)];
            const sets = Array.from({ length: drill.sets }, (_, setIndex) => {
                const repsExecuted = Math.floor(Math.random() * (drill.repsPerSet + 1));
                const hardHits = Math.floor(Math.random() * (repsExecuted + 1));
                const strikeouts = drill.repsPerSet - repsExecuted > 2 ? Math.floor(Math.random() * 3) : 0;
                return {
                    setNumber: setIndex + 1,
                    repsAttempted: drill.repsPerSet,
                    repsExecuted,
                    hardHits,
                    strikeouts,
                    grade: Math.floor(Math.random() * 5) + 5,
                    // Add situational context to some sets
                    ...(Math.random() > 0.5 && { targetZones: [drill.targetZones[0] || 'Middle Middle'] }),
                    ...(Math.random() > 0.5 && { pitchTypes: [drill.pitchTypes[0] || 'Fastball'] }),
                    ...(Math.random() > 0.5 && { countSituation: drill.countSituation }),
                };
            });

            sessions.push({
                id: `session-${player.id}-${i}`,
                playerId: player.id,
                drillId: drill.id,
                name: drill.name,
                teamId: 'team-1',
                date: date.toISOString(),
                sets: sets,
            });
        }
    });
  }
  return sessions;
};

export const MOCK_SESSIONS = generateSessions();

export const MOCK_ASSIGNMENTS: DrillAssignment[] = [
    {
        id: 'assign-1',
        drillId: 'drill-2',
        teamId: 'team-1',
        playerIds: ['player-1', 'player-3'],
        isRecurring: true,
        recurringDays: ['Tue', 'Thu'],
        assignedDate: new Date().toISOString(),
    }
];

export const MOCK_GOALS: PersonalGoal[] = [
    {
        id: 'goal-1',
        playerId: 'player-1',
        teamId: 'team-1',
        metric: 'Execution %',
        targetValue: 80,
        startDate: new Date(Date.now() - 10 * 86400000).toISOString(),
        targetDate: new Date(Date.now() + 20 * 86400000).toISOString(),
        status: 'Active',
        drillType: 'Live BP',
    },
    {
        id: 'goal-2',
        playerId: 'player-1',
        teamId: 'team-1',
        metric: 'Hard Hit %',
        targetValue: 50,
        startDate: new Date().toISOString(),
        targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        status: 'Active',
        targetZones: ['Inside High', 'Inside Middle'],
    }
];

export const MOCK_TEAM_GOALS: TeamGoal[] = [
    {
        id: 'team-goal-1',
        teamId: 'team-1',
        description: 'Master Outside Pitches this Month',
        metric: 'Execution %',
        targetValue: 65,
        startDate: new Date().toISOString(),
        targetDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        status: 'Active',
        targetZones: ['Outside High', 'Outside Middle', 'Outside Low'],
    },
    {
        id: 'team-goal-2',
        teamId: 'team-1',
        description: '1,000 Team Reps vs. Curveballs',
        metric: 'Total Reps',
        targetValue: 1000,
        startDate: new Date(Date.now() - 15 * 86400000).toISOString(),
        targetDate: new Date(Date.now() + 15 * 86400000).toISOString(),
        status: 'Active',
        pitchTypes: ['Curveball'],
    }
];
