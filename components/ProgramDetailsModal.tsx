import React, { useEffect, useState, useContext } from 'react';
import { PitchSimulationTemplate, SimulationStepWithDetails, ZoneId } from '../types';
import { DataContext } from '../contexts/DataContext';
import { Modal } from './Modal';
import { Button } from './Button';

// Map zone IDs to human-readable names
const getZoneName = (zoneId: ZoneId): string => {
    const zoneNames: Record<ZoneId, string> = {
        'Z11': 'Inside High',
        'Z12': 'Middle High',
        'Z13': 'Outside High',
        'Z21': 'Inside Middle',
        'Z22': 'Middle Middle',
        'Z23': 'Outside Middle',
        'Z31': 'Inside Low',
        'Z32': 'Middle Low',
        'Z33': 'Outside Low',
        'EDGE_HIGH': 'High Edge',
        'EDGE_LOW': 'Low Edge',
        'EDGE_GLOVE': 'Glove Side Edge',
        'EDGE_ARM': 'Arm Side Edge'
    };
    return zoneNames[zoneId] || zoneId;
};

interface ProgramDetailsModalProps {
    program: PitchSimulationTemplate & { dueDate?: string; completionCount?: number; isRecurring?: boolean };
    isOpen: boolean;
    onClose: () => void;
    onStart: () => void;
}

export const ProgramDetailsModal: React.FC<ProgramDetailsModalProps> = ({
    program,
    isOpen,
    onClose,
    onStart
}) => {
    const { getSimulationSteps } = useContext(DataContext)!;
    const [steps, setSteps] = useState<SimulationStepWithDetails[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && program) {
            const fetchSteps = async () => {
                setLoading(true);
                try {
                    const data = await getSimulationSteps(program.id);
                    setSteps(data);
                } catch (error) {
                    console.error('Error fetching steps:', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchSteps();
        }
    }, [isOpen, program, getSimulationSteps]);

    // Aggregate steps by pitch type and zone
    const aggregatedSteps = steps.reduce((acc, step) => {
        const key = `${step.pitchTypeId}-${step.intendedZone}`;
        if (!acc[key]) {
            acc[key] = {
                pitchTypeName: step.pitchTypeName,
                pitchTypeCode: step.pitchTypeCode,
                pitchTypeColor: step.pitchTypeColor,
                intendedZone: step.intendedZone,
                count: 0
            };
        }
        acc[key].count += 1;
        return acc;
    }, {} as Record<string, {
        pitchTypeName: string;
        pitchTypeCode: string;
        pitchTypeColor: string;
        intendedZone: string;
        count: number;
    }>);

    const aggregatedList = Object.values(aggregatedSteps);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={program.name}
        >
            <div className="space-y-6">
                {/* Description */}
                <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-1">Description</h4>
                    <p className="text-foreground text-sm">
                        {program.description || 'No description provided.'}
                    </p>
                </div>

                {/* Due Date */}
                {program.dueDate && (
                    <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-1">Due Date</h4>
                        <p className="text-foreground text-sm font-medium">
                            {new Date(program.dueDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                )}

                {/* Stats */}
                <div className="flex gap-4">
                    <div className="bg-muted/30 p-3 rounded-lg flex-1 text-center border border-border">
                        <div className="text-2xl font-bold text-primary">{steps.length}</div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Pitches</div>
                    </div>
                </div>

                {/* Pitch List */}
                <div>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Pitch Breakdown</h4>

                    {loading ? (
                        <div className="space-y-2 animate-pulse">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-12 bg-muted rounded-lg"></div>
                            ))}
                        </div>
                    ) : aggregatedList.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {aggregatedList.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg text-sm">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <span className="font-bold" style={{ color: item.pitchTypeColor }}>
                                                {item.pitchTypeName}
                                            </span>
                                            <span className="text-muted-foreground mx-1">to</span>
                                            <span className="font-semibold text-foreground">
                                                {getZoneName(item.intendedZone as ZoneId)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">×</span>
                                        <span className="font-bold text-primary text-base">{item.count}</span>
                                        <span className="text-xs text-muted-foreground">reps</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                            No pitches defined in this program.
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-border">
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        className="flex-1"
                    >
                        Close
                    </Button>
                    <Button
                        onClick={() => {
                            console.log('=== Start Program button clicked ===');
                            console.log('Loading:', loading);
                            console.log('Steps length:', steps.length);
                            console.log('Button disabled:', loading || steps.length === 0);
                            onStart();
                        }}
                        variant="primary"
                        className="flex-1"
                        disabled={loading || steps.length === 0}
                    >
                        Start Program {loading ? '(Loading...)' : steps.length === 0 ? '(No pitches)' : ''}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
