import SwiftUI

struct StrikeZoneGrid: View {
    var onZoneSelected: (ZoneId) -> Void
    var selectedZone: ZoneId?
    
    // Grid configuration
    // 3x3 Internal Zone
    // Edges around it
    
    var body: some View {
        ZStack {
            // Main Zone (3x3)
            VStack(spacing: 2) {
                ForEach(0..<3) { row in
                    HStack(spacing: 2) {
                        ForEach(0..<3) { col in
                            ZoneCellView(
                                zoneId: zoneId(row: row, col: col),
                                isSelected: selectedZone == zoneId(row: row, col: col),
                                action: { onZoneSelected(zoneId(row: row, col: col)) }
                            )
                        }
                    }
                }
            }
            .padding(2)
            .background(Color.white)
            .border(Color.black, width: 2)
            
            // Edges (Simplified for tap targets)
            // Ideally we'd have a more complex geometry readers for edges,
            // but for v1 let's stick to the 3x3 grid as primary.
            // Or add buttons outside?
            // The requirement says "Strike zone grid that's precise".
        }
        .aspectRatio(0.8, contentMode: .fit)
    }
    
    func zoneId(row: Int, col: Int) -> ZoneId {
        switch (row, col) {
        case (0, 0): return .z11
        case (0, 1): return .z12
        case (0, 2): return .z13
        case (1, 0): return .z21
        case (1, 1): return .z22
        case (1, 2): return .z23
        case (2, 0): return .z31
        case (2, 1): return .z32
        case (2, 2): return .z33
        default: return .z22
        }
    }
}

struct ZoneCellView: View {
    let zoneId: ZoneId
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            ZStack {
                Rectangle()
                    .fill(isSelected ? AppColors.primary : Color.gray.opacity(0.1))
                
                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.caption)
                        .foregroundColor(.white)
                }
            }
        }
        .aspectRatio(1.0, contentMode: .fill)
    }
}
