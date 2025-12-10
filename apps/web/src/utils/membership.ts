import { supabase } from '../supabaseClient';
import { Team } from '../types';

export type JoinRole = 'player' | 'coach';

export const resolveTeamFromJoinCode = async (rawCode: string, role: JoinRole): Promise<Team> => {
  const normalized = rawCode.trim().toUpperCase();
  if (!normalized) {
    throw new Error('Enter a valid team code.');
  }

  const { data, error } = await supabase.rpc('resolve_join_code', {
    join_role: role,
    join_code: normalized,
  });

  if (error) {
    throw new Error(error.message || 'Unable to verify this team code.');
  }

  if (!data) {
    throw new Error('No team found for that code. Confirm the code with your coach.');
  }

  return mapTeamRow(data);
};

type TeamRow = {
  id: string;
  name: string;
  season_year: number;
  coach_id: string;
  primary_color?: string | null;
  created_at?: string | null;
  created_by?: string | null;
};

const mapTeamRow = (row: TeamRow): Team => ({
  id: row.id,
  name: row.name,
  seasonYear: row.season_year,
  coachId: row.coach_id,
  primaryColor: row.primary_color ?? undefined,
  createdAt: row.created_at ?? undefined,
  createdBy: row.created_by ?? undefined,
});
