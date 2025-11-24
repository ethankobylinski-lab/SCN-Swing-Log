export type BatterHand = 'RH' | 'LH';

export type PitchType = string;

export type PitchResult = 'ACCURATE' | 'NEAR_TARGET' | 'STRIKE' | 'BALL';

export interface GameContext {
    balls: number;
    strikes: number;
    outs: number;
    runners: [boolean, boolean, boolean]; // [on1B, on2B, on3B]
}

export interface Pitch {
    id: number;
    x: number;  // 0–100 percentage of stage width
    y: number;  // 0–100 percentage of stage height
    result: PitchResult;
    pitchType: PitchType;
    context?: GameContext;  // snapshot of count and base state when the pitch was thrown
    swung?: boolean;  // whether the batter swung at the pitch
}

