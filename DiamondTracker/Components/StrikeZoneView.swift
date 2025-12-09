import SwiftUI

struct StrikeZoneView: View {
    let zoneStats: [TargetZone: ZoneStat]
    let metric: ZoneMetric
    
    enum ZoneMetric {
        case reps
        case executionPct
        case hardHitPct
    }
    
    struct ZoneStat {
        var reps: Int
        var hardHits: Int
        var execution: Int
    }
    
    private let zones: [[TargetZone]] = [
        [.insideHigh, .middleHigh, .outsideHigh],
        [.insideMiddle, .middleMiddle, .outsideMiddle],
        [.insideLow, .middleLow, .outsideLow]
    ]
    
    var body: some View {
        VStack(spacing: 4) {
            ForEach(0..<3) { row in
                HStack(spacing: 4) {
                    ForEach(0..<3) { col in
                        let zone = zones[row][col]
                        let stat = zoneStats[zone] ?? ZoneStat(reps: 0, hardHits: 0, execution: 0)
                        ZoneCell(zone: zone, stat: stat, metric: metric)
                    }
                }
            }
        }
        .padding()
        .background(Color.cardBackground)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 2)
    }
}

struct ZoneCell: View {
    let zone: TargetZone
    let stat: StrikeZoneView.ZoneStat
    let metric: StrikeZoneView.ZoneMetric
    
    var body: some View {
        VStack(spacing: 4) {
            Text(getValue())
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(.white)
            Text(getLabel())
                .font(.caption2)
                .foregroundColor(.white.opacity(0.9))
        }
        .frame(maxWidth: .infinity)
        .frame(height: 80)
        .background(getBackgroundColor())
        .cornerRadius(8)
    }
    
    private func getValue() -> String {
        switch metric {
        case .reps:
            return "\(stat.reps)"
        case .executionPct:
            let pct = stat.reps > 0 ? Int(round(Double(stat.execution) / Double(stat.reps) * 100)) : 0
            return "\(pct)%"
        case .hardHitPct:
            let pct = stat.reps > 0 ? Int(round(Double(stat.hardHits) / Double(stat.reps) * 100)) : 0
            return "\(pct)%"
        }
    }
    
    private func getLabel() -> String {
        switch metric {
        case .reps:
            return "reps"
        case .executionPct:
            return "exec"
        case .hardHitPct:
            return "hard"
        }
    }
    
    private func getBackgroundColor() -> Color {
        switch metric {
        case .reps:
            let maxReps = 100 // Adjust based on your data range
            let intensity = min(Double(stat.reps) / Double(maxReps), 1.0)
            return Color.primaryBlue.opacity(0.3 + intensity * 0.7)
        case .executionPct, .hardHitPct:
            let pct = stat.reps > 0 ? Double(stat.execution) / Double(stat.reps) : 0.0
            // Green gradient: 0% = red, 50% = yellow, 100% = green
            if pct < 0.5 {
                return Color(red: 1.0, green: pct * 2, blue: 0)
            } else {
                return Color(red: 1.0 - (pct - 0.5) * 2, green: 1.0, blue: 0)
            }
        }
    }
}

