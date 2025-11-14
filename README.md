<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1kSDVmSMccQC0sH5OedC3iKzjEviLfvLi

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Testing & QA

Before touching production data, run everything against the Firebase emulators so you can iterate on Firestore rules and Cloud Functions safely.

1. Install Firebase CLI tooling (one time): `npm install -g firebase-tools`.
2. Install root dependencies (already covered above) **and** the Cloud Functions deps: `cd functions && npm install`.
3. Start the emulators from the project root: `npx firebase emulators:start --only firestore,functions`.
4. In a second terminal, run the web app using emulator config: `VITE_USE_EMULATORS=true npm run dev`.

While the emulators are running, every auth’d action in the UI will talk to the local Firestore/Functions stack, letting you verify writes, reads, and newly-tuned security rules without touching production. When you’re ready for a deeper QA pass, use the detailed checklist in [`docs/testing-plan.md`](docs/testing-plan.md).
