# Strike Zone Component - Usage Guide

## Overview

The `StrikeZoneClean` component is a precise, clean 3x3 strike zone grid designed for live pitch logging. It supports two-step interaction (intended target → actual pitch) and records exact coordinates for detailed analytics.

## Quick Start

```tsx
import { StrikeZoneClean } from './components/StrikeZoneClean';
import { ZoneId, PitchType } from './types';

// In your pitch logger component:
const [mode, setMode] = useState<'selectIntent' | 'selectActual'>('selectIntent');
const [intendedZone, setIntendedZone] = useState<ZoneId | null>(null);

<StrikeZoneClean
  mode={mode}
  pitchType="Fastball"
  intendedZone={intendedZone}
  onSelectIntent={(zone, x, y) => {
    setIntendedZone(zone);
    setMode('selectActual');
  }}
  onSelectActual={(zone, x, y) => {
    // Log the pitch
    savePitch({ actualZone: zone, actualX: x, actualY: y });
  }}
/>
```

## Component Props

### `StrikeZoneCleanProps`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `mode` | `'selectIntent' \| 'selectActual'` | ✅ | Interaction mode |
| `pitchType` | `PitchType` | ❌ | Pitch type for dot color |
| `pitchTypeColor` | `string` | ❌ | Custom hex color override |
| `batterSide` | `'R' \| 'L'` | ❌ | Batter handedness |
| `intendedZone` | `ZoneId \| null` | ❌ | Highlighted yellow zone |
| `actualLocation` | `PitchLocation \| null` | ❌ | Actual pitch dot |
| `isCalledStrike` | `boolean` | ❌ | Shows backwards K |
| `onSelectIntent` | `(zone, x, y) => void` | ❌ | Callback for intent |
| `onSelectActual` | `(zone, x, y) => void` | ❌ | Callback for actual |

## Zone IDs

The grid uses the following zone mapping (catcher's view):

```
Z11  Z12  Z13   (top row - high pitches)
Z21  Z22  Z23   (middle row)
Z31  Z32  Z33   (bottom row - low pitches)
```

- **Z11**: Top-left (up and in to RHB)
- **Z13**: Top-right (up and away to RHB)
- **Z22**: Middle-middle (heart of the zone)
- **Z31**: Bottom-left (down and in to RHB)
- **Z33**: Bottom-right (down and away to RHB)

## Coordinates

All coordinates are **normalized** between 0 and 1:

- **X**: 0 = left edge, 1 = right edge (catcher's view)
- **Y**: 0 = bottom edge, 1 = top edge

This ensures consistency across different screen sizes and allows for precise analytics calculations.

## Pitch Type Colors

Default colors for each pitch type:

- **Fastball**: Blue (`#2196F3`)
- **Changeup**: Green (`#4CAF50`)
- **Curveball**: Orange (`#FF9800`)
- **Slider**: Purple (`#9C27B0`)
- **Sinker**: Red (`#F44336`)

You can override with `pitchTypeColor` prop.

## Helper Functions

Import from `utils/strikeZoneHelpers.ts`:

### Zone Mapping

```ts
// Convert zone ID to row/col
const { row, col } = zoneIdToRowCol('Z22'); // { row: 1, col: 1 }

// Convert row/col to zone ID
const zone = rowColToZoneId(0, 2); // 'Z13'

// Get zone center coordinates
const center = getZoneCenter('Z22'); // { x: 0.5, y: 0.5 }
```

### Coordinate Conversion

```ts
// Click to normalized coords (done automatically in component)
const { x, y } = pixelToNormalized(clientX, clientY, rect);

// Coords to zone
const zone = coordsToZone(0.5, 0.5); // 'Z22'
```

### Distance Calculations

```ts
// Distance between two points
const dist = distance(x1, y1, x2, y2);

// Distance to intended target
const targetDist = distanceToTarget(actualX, actualY, intendedX, intendedY);

// Proximity score (0-1, 1 = perfect)
const proximity = proximityScore(actualX, actualY, intendedX, intendedY);

// Check if in strike zone
const isStrike = isInStrikeZone(x, y);

// Distance to strike zone edge
const edgeDist = distanceToStrikeZone(x, y);
```

## Data Model for Logging

When logging each pitch, store at minimum:

```ts
interface PitchData {
  pitchId: string;
  sessionId: string;
  
  // Pitch info
  pitchType: PitchType;
  batterSide: 'R' | 'L';
  
  // Intended target
  intendedZone: ZoneId;
  intendedX: number;
  intendedY: number;
  
  // Actual location
  actualZone: ZoneId;
  actualX: number;
  actualY: number;
  
  // Result
  isStrike: boolean;
  isCalledStrike: boolean;
  
  // Optional
  isSwing?: boolean;
  isContact?: boolean;
  isWhiff?: boolean;
}
```

### Derived Metrics

Calculate these for analytics:

```ts
// Distance from intended target
const targetDistance = distanceToTarget(
  pitch.actualX, 
  pitch.actualY, 
  pitch.intendedX, 
  pitch.intendedY
);

// Proximity score
const proximity = proximityScore(
  pitch.actualX, 
  pitch.actualY, 
  pitch.intendedX, 
  pitch.intendedY
);

// Was it in the strike zone?
const inZone = isInStrikeZone(pitch.actualX, pitch.actualY);

// How far from strike zone edge?
const edgeDistance = distanceToStrikeZone(pitch.actualX, pitch.actualY);
```

## Two-Step Workflow

### Step 1: Select Intended Target

```ts
const [mode, setMode] = useState<'selectIntent' | 'selectActual'>('selectIntent');
const [intendedZone, setIntendedZone] = useState<ZoneId | null>(null);
const [intendedX, setIntendedX] = useState<number>(0.5);
const [intendedY, setIntendedY] = useState<number>(0.5);

const handleSelectIntent = (zone: ZoneId, x: number, y: number) => {
  setIntendedZone(zone);
  setIntendedX(x);
  setIntendedY(y);
  // Auto-switch to actual pitch mode
  setMode('selectActual');
};
```

### Step 2: Log Actual Pitch

```ts
const handleSelectActual = async (zone: ZoneId, x: number, y: number) => {
  const pitch = {
    pitchId: generateId(),
    sessionId: currentSessionId,
    pitchType: selectedPitchType,
    batterSide: currentBatterSide,
    intendedZone,
    intendedX,
    intendedY,
    actualZone: zone,
    actualX: x,
    actualY: y,
    isStrike: isInStrikeZone(x, y),
    isCalledStrike: currentIsCalledStrike
  };
  
  await savePitch(pitch);
  
  // Reset for next pitch
  setMode('selectIntent');
  setIntendedZone(null);
};
```

## Styling

The component uses inline styles to match your existing card design:

- **Grid cells**: Very light gray (`#F9FAFB`)
- **Borders**: Light gray (`#E5E7EB`), thin (`0.5px`)
- **Intended zone**: Yellow (`#FBBF24`) with 70% opacity
- **Pitch dots**: 3px radius, colored by pitch type, white stroke
- **Backwards K**: White, bold, mirrored

All styles are minimal and clean as shown in your screenshot.

## Example Component

See `components/StrikeZoneExample.tsx` for a complete working example with:

- Pitch type selector
- Batter side toggle
- Called strike checkbox
- Two-step interaction flow
- Pitch log display
- Reset functionality

Run the example in your app to test the component.

## Integration with Existing PitchTracker

To integrate with your current `PitchTracker` component:

1. Import `StrikeZoneClean` instead of the old `StrikeZone`
2. Add `mode` state: `const [mode, setMode] = useState<'selectIntent' | 'selectActual'>('selectIntent')`
3. Update handlers to use `onSelectIntent` and `onSelectActual`
4. Pass `intendedZone` prop to highlight the yellow zone
5. Use helper functions for analytics calculations

## Analytics

With the precise coordinate data, you can now calculate:

### Accuracy Metrics

- **Hit Rate**: % of pitches where `actualZone === intendedZone`
- **Proximity Average**: Average `proximityScore()` across all pitches
- **Miss Distance**: Average `distanceToTarget()` for missed pitches

### Miss Patterns

- **Direction**: Categorize misses as up/down/arm-side/glove-side
- **Magnitude**: How far off target on average
- **Consistency**: Standard deviation of miss distances

### Zone-Specific

- **Heat Maps**: Count pitches by `actualZone`
- **Intent vs Result**: Compare `intendedZone` distribution vs `actualZone`
- **Edge Work**: % of pitches near zone boundaries

### Command Score

Composite metric combining:
- Strike rate
- Accuracy (hit rate + proximity)
- Miss pattern consistency
- Situational performance

All calculations are now possible with precise `(x, y)` coordinates!
