export type UserRole = "coach" | "player" | "parent";

export interface AppUser {
  uid: string;
  displayName?: string;
  email?: string;
  phoneNumber?: string;
  teams: string[]; // teamIds the user belongs to
  roleByTeam?: Record<string, UserRole>;
  createdAt: number;
}

export interface Team {
  id: string;
  name: string;
  org?: string;
  createdBy: string; // uid
  members: string[]; // uids
  createdAt: number;
}

export interface JoinCode {
  code: string;        // e.g. 6 chars
  teamId: string;
  role: UserRole;
  createdBy: string;   // uid
  createdAt: number;
  expiresAt: number;   // ms since epoch
  claimedBy?: string;  // uid
  claimedAt?: number;
}
