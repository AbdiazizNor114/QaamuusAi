import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { areas, areaLabels } from "@/lib/project-workspace";
const docs = "https://github.com/AbdiazizNor114/QaamuusAi/blob/master/";
export function WorkspaceStart({ hasProfile }: { hasProfile: boolean }) {
  return (
    <div className="start-workspace">
      <section className="start-welcome">
        <span className="commons-eyebrow">YOUR FIRST CONTRIBUTION</span>
        <h2>Find your place. Build something useful.</h2>
        <p>
          We are building language data, speech models and tools for developers building Somali
          AI. Your first task can be a small improvement to code, design, language quality or
          project documentation.
        </p>
        <Link className="ai-primary" href="/dashboard/tasks">
          Explore the task board <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
      <section aria-label="Getting started checklist">
        <h2>Before you begin</h2>
        <ol className="start-checklist">
          <li>
            <span className="start-step" aria-hidden="true">1</span>
            <div>
              <h3>Set up your profile</h3>
              <p>
                {hasProfile
                  ? "Your profile is ready. Keep your public name up to date."
                  : "Add a display name before claiming work."}
              </p>
              <Link href="/dashboard/profile">Open profile</Link>
            </div>
          </li>
          <li>
            <span className="start-step" aria-hidden="true">2</span>
            <div>
              <h3>Read the contribution guide</h3>
              <p>
                Learn the review process, setup requirements and how we handle sources and
                permissions.
              </p>
              <Link href="/contributor-guide">Contributor guide</Link> ·{" "}
              <a href={docs + "docs/contributors/start-here.md"}>
                Technical setup and contribution paths
              </a>
            </div>
          </li>
          <li>
            <span className="start-step" aria-hidden="true">3</span>
            <div>
              <h3>Choose one manageable task</h3>
              <p>
                Claim available work, explain your approach, then attach a pull request, design or
                report for independent review. Your contribution area is a preference, not a
                permission grant.
              </p>
              <Link href="/dashboard/tasks">Choose a task</Link>
            </div>
          </li>
        </ol>
      </section>
      <section>
        <h2>Choose how you can help</h2>
        <div className="start-paths">
          {areas.map((area) => (
            <Link key={area} href={"/dashboard/tasks?area=" + area}>
              <h3>{areaLabels[area]}</h3>
              <span>
                Find relevant work <ArrowRight size={15} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="start-note">
        <h2>Prepare first. Collect speech later.</h2>
        <p>
          Real recordings need approved consent, private storage and independent review. Completing
          a preparation task does not authorize audio collection or change your account permissions.
        </p>
        <a href={docs + "docs/contributors/README.md"}>Read the six-part preparation pack</a>
      </section>
    </div>
  );
}
