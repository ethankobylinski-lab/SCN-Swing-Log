import { useState } from "react";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string>("");

  const signInEmail = async () => {
    setErr("");
    try {
      await signInWithEmailAndPassword(auth, email, pw);
    } catch (e: any) {
      setErr(e.message ?? "Unable to sign in with those credentials.");
    }
  };

  const createAccount = async () => {
    setErr("");
    try {
      await createUserWithEmailAndPassword(auth, email, pw);
    } catch (e: any) {
      setErr(e.message ?? "Unable to create an account with those credentials.");
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", display: "grid", gap: 12 }}>
      <h2>Sign In</h2>
      <div>
        <input
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 8, padding: 8 }}
        />
        <input
          type="password"
          placeholder="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 8 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={signInEmail}>Sign In</button>
          <button onClick={createAccount}>Create Account</button>
        </div>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}
    </div>
  );
}
