import { readConfig } from "../lib/config.js";
import { THEMES, rgb, style } from "../ui/theme.js";

/**
 * Placeholder for the local install path.
 *
 * Remote, phone-driven installation is Phase 8 and the per-agent install
 * adapters are Phase 7. Rather than shell out to something unvalidated and
 * call it done, this command says plainly what is not built yet and points at
 * the upstream installer that genuinely works today.
 */
export async function installCommand(ref?: string): Promise<number> {
  const theme = THEMES[readConfig().theme];

  console.log();
  if (!ref) {
    console.error(`  ${style.red("✗")} Usage: lazy-skill install <owner/skill>\n`);
    return 1;
  }

  console.log(`  ${style.yellow("!")} Local install is not wired up yet.`);
  console.log();
  console.log(`  ${style.gray("Installing from your phone arrives with device install.")}`);
  console.log(`  ${style.gray("Until then, the upstream installer handles this today:")}`);
  console.log();
  console.log(`      ${rgb(theme.accent, `npx skills add ${ref}`)}`);
  console.log();
  return 1;
}
