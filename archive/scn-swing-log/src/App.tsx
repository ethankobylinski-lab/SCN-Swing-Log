// src/App.tsx
import { useAuth } from "./contexts/AuthContext";
import SignIn from "./components/SignIn";
import TeamDemo from "./components/TeamDemo";

export default function App() {
  const { user, loading, signOutNow } = useAuth();
  if (loading) return <p style={{padding:24}}>loading…</p>;
  return (
    <div>
      <header style={{display:"flex", justifyContent:"space-between", padding:16, borderBottom:"1px solid #eee"}}>
        <strong>SCN Swing Log</strong>
        {user && <button onClick={signOutNow}>Sign out</button>}
      </header>
      {!user ? <SignIn /> : <TeamDemo />}
    </div>
  );
}
