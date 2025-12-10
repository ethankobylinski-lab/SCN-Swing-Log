import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebaseConfig";

export default function TeamDemo() {
  const [teamName, setTeamName] = useState("");
  const [code, setCode] = useState("");
  const [genCode, setGenCode] = useState<string>("");

  const createTeam = async () => {
    const fn = httpsCallable(functions, "createTeam");
    const res: any = await fn({ name: teamName });
    alert(`Team created: ${res.data.teamId}`);
  };

  const makeJoinCode = async () => {
    const fn = httpsCallable(functions, "createJoinCode");
    const res: any = await fn({ teamId: "__SELF_LAST__", role: "player", ttlMinutes: 60 });
    setGenCode(res.data.code);
  };

  const claim = async () => {
    const fn = httpsCallable(functions, "claimJoinCode");
    const res: any = await fn({ code });
    alert(`Joined team ${res.data.teamId} as ${res.data.role}`);
  };

  return (
    <div style={{maxWidth:560, margin:"24px auto", display:"grid", gap:12}}>
      <h3>Team & Join Code Demo</h3>
      <input placeholder="new team name" value={teamName} onChange={e=>setTeamName(e.target.value)} />
      <div style={{display:"flex", gap:8}}>
        <button onClick={createTeam}>Create Team</button>
        <button onClick={makeJoinCode}>Generate Join Code</button>
      </div>
      {genCode && <p>Join Code: <b>{genCode}</b></p>}
      <div>
        <input placeholder="enter join code" value={code} onChange={e=>setCode(e.target.value)} />
        <button onClick={claim}>Join Team</button>
      </div>
    </div>
  );
}
