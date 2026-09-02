/**
 * Rewrites `<Link ...><Button ...>text</Button></Link>` into a single
 * `<ButtonLink href=... ...>text</ButtonLink>`.
 *
 * One-off codemod. Kept in the repo so the change is reviewable rather than
 * appearing as twenty hand-edits.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const files = execSync("grep -rl '<Link' src --include=*.tsx", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

// <Link {linkAttrs}> whitespace <Button {btnAttrs}> body </Button> whitespace </Link>
const PATTERN =
  /<Link\s+([^>]*?)>\s*<Button\s*([^>]*?)>([\s\S]*?)<\/Button>\s*<\/Link>/g;

let total = 0;
const touched = [];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  let count = 0;

  const out = src.replace(PATTERN, (_match, linkAttrs, btnAttrs, body) => {
    count++;
    // The Link's className positions the control; the Button's styles it.
    // Both have to survive, so they are merged rather than one winning.
    const linkClass = /className=\{?["`]([^"`]*)["`]\}?/.exec(linkAttrs)?.[1] ?? "";
    const btnClass = /className=\{?["`]([^"`]*)["`]\}?/.exec(btnAttrs)?.[1] ?? "";

    const linkRest = linkAttrs.replace(/className=\{?["`][^"`]*["`]\}?/, "").trim();
    const btnRest = btnAttrs.replace(/className=\{?["`][^"`]*["`]\}?/, "").trim();

    const merged = [linkClass, btnClass].filter(Boolean).join(" ");
    const classAttr = merged ? ` className="${merged}"` : "";
    const attrs = [linkRest, btnRest].filter(Boolean).join(" ");

    return `<ButtonLink ${attrs}${classAttr}>${body}</ButtonLink>`;
  });

  if (count > 0) {
    let next = out;

    // Import ButtonLink, and drop Button if nothing else uses it.
    const stillUsesButton = /<Button[\s/>]/.test(next);
    if (/from "@\/components\/ui\/button"/.test(next)) {
      next = next.replace(
        /import \{([^}]*)\} from "@\/components\/ui\/button";/,
        (_m, names) => {
          const set = new Set(
            names
              .split(",")
              .map((n) => n.trim())
              .filter(Boolean)
          );
          set.add("ButtonLink");
          if (!stillUsesButton) set.delete("Button");
          return `import { ${[...set].join(", ")} } from "@/components/ui/button";`;
        }
      );
    } else {
      next = `import { ButtonLink } from "@/components/ui/button";\n${next}`;
    }

    // Drop the Link import if it is now unused.
    if (!/<Link[\s/>]/.test(next)) {
      next = next.replace(/import Link from "next\/link";\n/, "");
    }

    writeFileSync(file, next);
    touched.push(`${file} (${count})`);
    total += count;
  }
}

console.log(`rewrote ${total} nested buttons across ${touched.length} files`);
for (const t of touched) console.log("  " + t);
