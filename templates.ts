import { BaseRunner, CountSituation, Drill, DrillType, GoalType, PitchType, TargetZone } from './types';

export interface DrillTemplate extends Omit<Drill, 'id' | 'teamId'> {
    templateId: string;
    focus: string;
}

export interface TeamGoalTemplate {
    templateId: string;
    headline: string;
    description: string;
    metric: GoalType;
    baseTarget: number;
    durationDays: number;
    bumpTargetBy?: number;
    drillType?: DrillType;
    targetZones?: TargetZone[];
    pitchTypes?: PitchType[];
}

const defaultBaseRunners: BaseRunner[] = [];

export const DRILL_TEMPLATES: DrillTemplate[] = [
    {
        templateId: 'line-drive-lab',
        focus: 'Consistency',
        name: 'Line Drive Lab',
        description: 'Front toss focus on sending firm line drives to the opposite-field gap.',
        drillType: 'Front Toss',
        targetZones: ['Outside Middle', 'Outside Low'],
        pitchTypes: ['Fastball'],
        countSituation: 'Even',
        baseRunners: defaultBaseRunners,
        outs: 0,
        goalType: 'Execution %',
        goalTargetValue: 85,
        repsPerSet: 12,
        sets: 4,
    },
    {
        templateId: 'velo-bridge',
        focus: 'Power',
        name: 'Velo Bridge',
        description: 'Machine work that stacks intent: tee, front toss, and firm machine fastballs.',
        drillType: 'Machine',
        targetZones: ['Middle High', 'Middle Middle'],
        pitchTypes: ['Fastball'],
        countSituation: 'Ahead',
        baseRunners: defaultBaseRunners,
        outs: 0,
        goalType: 'Hard Hit %',
        goalTargetValue: 55,
        repsPerSet: 10,
        sets: 5,
    },
    {
        templateId: 'two-strike-plan',
        focus: 'Approach',
        name: 'Two-Strike Plan',
        description: 'Execution circuit focused on battling with two strikes using mixed pitches.',
        drillType: 'Live BP',
        targetZones: ['Inside Middle', 'Outside Middle'],
        pitchTypes: ['Fastball', 'Slider', 'Changeup'],
        countSituation: 'Behind',
        baseRunners: ['1B'],
        outs: 1,
        goalType: 'No Strikeouts',
        goalTargetValue: 0,
        repsPerSet: 8,
        sets: 4,
    },
];

export const TEAM_GOAL_TEMPLATES: TeamGoalTemplate[] = [
    {
        templateId: 'raise-exec',
        headline: 'Raise Team Execution',
        description: 'Emphasize quality reps in every cage session.',
        metric: 'Execution %',
        baseTarget: 85,
        durationDays: 21,
        bumpTargetBy: 5,
        drillType: 'Front Toss',
    },
    {
        templateId: 'hard-hit-charge',
        headline: 'Boost Hard Hit %',
        description: 'Hold hitters accountable for barreled contact in machine rounds.',
        metric: 'Hard Hit %',
        baseTarget: 45,
        durationDays: 28,
        bumpTargetBy: 7,
        drillType: 'Machine',
        targetZones: ['Middle High', 'Middle Middle'],
    },
    {
        templateId: 'no-strikeout-week',
        headline: 'Win Two-Strike Counts',
        description: 'Compete with two strikes by shrinking the zone and battling.',
        metric: 'No Strikeouts',
        baseTarget: 0,
        durationDays: 14,
        bumpTargetBy: 2,
        drillType: 'Live BP',
        pitchTypes: ['Slider', 'Changeup'],
    },
    {
        templateId: 'total-reps-charge',
        headline: 'Volume Builder',
        description: 'Stack purposeful cage reps ahead of tournament play.',
        metric: 'Total Reps',
        baseTarget: 300,
        durationDays: 14,
    },
];

export default {
    DRILL_TEMPLATES,
    TEAM_GOAL_TEMPLATES,
};
