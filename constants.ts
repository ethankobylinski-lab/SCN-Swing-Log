import { TargetZone, PitchType, CountSituation, BaseRunner, GoalType, DrillType } from './types';

export const TARGET_ZONES: TargetZone[] = [
  'Inside High', 'Inside Middle', 'Inside Low',
  'Middle High', 'Middle Middle', 'Middle Low',
  'Outside High', 'Outside Middle', 'Outside Low',
];

export const PITCH_TYPES: PitchType[] = ['Fastball', 'Curveball', 'Slider', 'Changeup', 'Sinker'];

export const COUNT_SITUATIONS: CountSituation[] = ['Ahead', 'Even', 'Behind'];

export const BASE_RUNNERS: BaseRunner[] = ['1B', '2B', '3B'];

export const GOAL_TYPES: GoalType[] = ['Execution %', 'Hard Hit %', 'No Strikeouts'];

export const OUTS_OPTIONS: (0 | 1 | 2)[] = [0, 1, 2];

export const DRILL_TYPES: DrillType[] = ['Tee Work', 'Soft Toss', 'Front Toss', 'Throwing', 'Live BP', 'Machine'];