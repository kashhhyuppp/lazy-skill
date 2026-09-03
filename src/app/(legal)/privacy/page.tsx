import type { Metadata } from "next";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal";
import { DocTitle, Rows, Section } from "../legal-ui";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Lazy Skill stores about you, and what it does not.",
};

export default function PrivacyPage() {
  return (
    <article>
      <DocTitle title="PRIVACY" updated={LEGAL_UPDATED} />

      <Section heading="THE SHORT VERSION">
        <p>
          Lazy Skill keeps the least it can get away with: who you are, what you
          saved, which computers you connected, and what you installed. There is
          no advertising, nothing is sold, and there are no third-party trackers
          on this site.
        </p>
      </Section>

      <Section heading="WHAT IS STORED">
        <Rows
          items={[
            ["Your account", "An email address. If you sign in with GitHub or Google, also the name and avatar they hand over. There is no password, because there is nothing to sign in with except a link or those providers."],
            ["What you saved", "The skills you favorite and the collections you build, by their public identifier and name."],
            ["Your computers", "For each one you connect: the name shown in the app, the operating system and version, which AI coding tools were found installed, your chosen colour theme, and when it last checked in."],
            ["What you installed", "Which skill, to which tool, whether it worked, and any error. Kept as your history, so it survives disconnecting the computer it came from."],
            ["Points and streaks", "XP, level, daily streak, quest progress and badges."],
          ]}
        />
      </Section>

      <Section heading="WHAT IS NOT STORED">
        <Rows
          items={[
            ["Your device key", "Only a one-way hash of it. The key itself lives on your computer and is never written to the database, so a database leak yields nothing that can be replayed."],
            ["Passwords", "There are none to store."],
            ["Anything from your files", "Lazy Skill never reads your code, your projects or your folders. The only thing it learns about your machine is which AI coding tools are present, and it learns that from your own computer telling it."],
            ["Payment details", "Lazy Skill is free and takes no payments."],
          ]}
        />
      </Section>

      <Section heading="WHAT RUNS ON YOUR COMPUTER">
        <p>
          The command-line tool asks this site whether you have queued an
          install. If you have, it runs the public{" "}
          <code className="font-mono text-[13px] text-ink">skills</code> installer
          for the skill you picked, and reports back whether it worked.
        </p>
        <p>
          It can only do a fixed set of things. There is no way for this site to
          send your computer an arbitrary command, and the skill name is checked
          against a strict pattern before it is ever passed to the installer.
        </p>
      </Section>

      <Section heading="WHO ELSE SEES ANY OF IT">
        <Rows
          items={[
            ["Supabase", "Stores the database and runs sign-in."],
            ["Vercel", "Hosts and serves the site."],
            ["skills.sh", "Receives what you type into search, because that is where the results come from."],
            ["GitHub or Google", "Only if you choose to sign in with one, and only to confirm it is you."],
            ["An email provider", "Delivers your sign-in link, if you sign in by email."],
          ]}
        />
        <p>
          That is the whole list. No analytics service, no advertising network,
          no data broker.
        </p>
      </Section>

      <Section heading="COOKIES">
        <p>
          One cookie, holding your sign-in session, so you stay signed in
          between visits. Nothing tracks you across other sites. The app also
          remembers small preferences, like your theme, in your own browser
          where they never leave your device.
        </p>
      </Section>

      <Section heading="DELETING YOUR ACCOUNT">
        <p>
          Write to{" "}
          <a className="text-accent underline-offset-2 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>{" "}
          and everything above is deleted: the account, the favorites, the
          collections, the connected computers and the history. Skills already
          installed on your computer stay there, because they are files on your
          machine and none of our business.
        </p>
        <p>
          You can disconnect any computer at any time from the Devices screen,
          which immediately stops it being able to install anything.
        </p>
      </Section>

      <Section heading="CHANGES">
        <p>
          If this document changes in a way that matters, the date at the top
          changes with it.
        </p>
      </Section>
    </article>
  );
}
