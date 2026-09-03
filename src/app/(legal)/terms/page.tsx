import type { Metadata } from "next";
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/legal";
import { DocTitle, Section } from "../legal-ui";

export const metadata: Metadata = {
  title: "Terms",
  description: "The deal: what Lazy Skill does, and what you are responsible for.",
};

export default function TermsPage() {
  return (
    <article>
      <DocTitle title="TERMS" updated={LEGAL_UPDATED} />

      <Section heading="WHAT THIS IS">
        <p>
          Lazy Skill helps you find skills for AI coding agents and install them
          onto your own computer. You browse on your phone, a tool you run on
          your computer picks the job up, and the skill lands where your agent
          expects it. It is free.
        </p>
      </Section>

      <Section heading="THE PART THAT MATTERS MOST">
        <p>
          Skills are written by other people and published to a public registry.
          Lazy Skill does not write them, review them, test them or vouch for
          them. Installing one puts somebody else&apos;s instructions where your
          AI agent will read and act on them.
        </p>
        <p>
          Treat a skill the way you would treat any code you are about to run:
          look at who published it before you install it. You decide what goes
          onto your machine, and you are responsible for that decision.
        </p>
      </Section>

      <Section heading="YOUR ACCOUNT">
        <p>
          Keep it to yourself. Anything done through your account is treated as
          done by you, and anyone holding a computer you have connected can
          install skills onto that computer. If one goes missing, disconnect it
          from the Devices screen straight away.
        </p>
      </Section>

      <Section heading="FAIR USE">
        <p>
          Do not attack the service, hammer it automatically, try to reach other
          people&apos;s accounts or data, or use it to distribute anything
          harmful. Accounts doing any of that get closed.
        </p>
      </Section>

      <Section heading="NO PROMISES">
        <p>
          This is a free service provided as it is. It may be unavailable, it
          may lose data, it may change, and it may stop. The registry it reads
          from belongs to somebody else and can change or go away independently.
          None of that comes with a guarantee, and Lazy Skill is not liable for
          what a skill does once it is on your computer.
        </p>
      </Section>

      <Section heading="ENDING IT">
        <p>
          Stop whenever you like. Ask at{" "}
          <a className="text-accent underline-offset-2 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>{" "}
          and the account and everything attached to it is deleted. Skills
          already installed stay on your computer; removing those is between you
          and your agent.
        </p>
      </Section>

      <Section heading="CHANGES">
        <p>
          If these terms change in a way that matters, the date at the top
          changes with them.
        </p>
      </Section>
    </article>
  );
}
