/**
 * The CLI's voice. Occasional and charming rather than constant (§9) — one
 * joke per stage, not one per line, and never in place of information the
 * user actually needs.
 */

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export const messages = {
  booting: () => [
    "initializing laziness.exe",
    "searching for human...",
  ],

  humanFound: () => pick([
    "human detected",
    "checking if you're lazy...",
    "found someone. good enough",
  ]),

  generating: () => "generating connection portal...",

  waiting: () => pick([
    "waiting for scan...",
    "still waiting...",
    "please scan before I fall asleep",
  ]),

  scanned: () => "PHONE DETECTED",

  authenticating: () => pick([
    "authenticating...",
    "pretending this is complicated...",
  ]),

  connected: () => "YOU'RE CONNECTED",

  signOff: () => pick([
    "Now go be lazy.",
    "Do less. Install more.",
    "Your computer was doing nothing anyway.",
  ]),

  expired: () => "That QR took too long. It's asleep now.",

  failed: () => "That didn't work. Even Lazy Skill gets tired sometimes.",
};
