import { useState } from "react";
import { auth, ensureRecaptcha } from "../firebaseConfig";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPhoneNumber } from "firebase/auth";

export default function SignIn() {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState("");
  const [phone, setPhone] = useState(""); const [otp, setOtp] = useState("");
  const [confirm, setConfirm] = useState<any>(null); const [err, setErr] = useState<string>("");

  const signInEmail = async () => {
    setErr("");
    try { await signInWithEmailAndPassword(auth, email, pw); }
    catch { await createUserWithEmailAndPassword(auth, email, pw); }
  };

  const sendOtp = async () => {
    setErr("");
    try {
      const verifier = ensureRecaptcha();
      const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
      setConfirm(confirmation);
    } catch (e:any) { setErr(e.message); }
  };

  const verifyOtp = async () => {
    setErr("");
    try { await confirm.confirm(otp); } catch (e:any) { setErr(e.message); }
  };

  return (
    <div style={{maxWidth:420, margin:"40px auto", display:"grid", gap:12}}>
      <h2>Sign In</h2>
      <div>
        <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" placeholder="password" value={pw} onChange={e=>setPw(e.target.value)} />
        <button onClick={signInEmail}>Sign In / Create</button>
      </div>

      <div style={{borderTop:"1px solid #eee", paddingTop:12}}>
        <input placeholder="+1 555 555 5555" value={phone} onChange={e=>setPhone(e.target.value)} />
        <button onClick={sendOtp}>Send Code</button>
        {confirm && (<>
          <input placeholder="SMS code" value={otp} onChange={e=>setOtp(e.target.value)} />
          <button onClick={verifyOtp}>Verify</button>
        </>)}
        <div id="recaptcha-container" />
      </div>

      {err && <p style={{color:"crimson"}}>{err}</p>}
    </div>
  );
}
