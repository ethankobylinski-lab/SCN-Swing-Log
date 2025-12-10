import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";


type Ctx = { user: User | null; loading: boolean; signOutNow: () => Promise<void>; };
const AuthCtx = createContext<Ctx>({ user: null, loading: true, signOutNow: async () => {} });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User|null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setLoading(false); }), []);
  return <AuthCtx.Provider value={{ user, loading, signOutNow: () => signOut(auth) }}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);
