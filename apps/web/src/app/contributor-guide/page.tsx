import Link from "next/link";
import { InformationPage } from "@/components/information-page";
export const metadata = { title: "Contributor guide | QaamuusAi" };
export default function ContributorGuide() {
  return (
    <InformationPage title="Contributor guide">
      <h2>Join and sign in</h2>
      <p>
        Apply at <Link href="/join">Request to contribute</Link>. An administrator reviews your
        background and emails an invitation if approved. Open the newest invitation, choose a
        password, then sign in. Check spam if an email is missing. Expired invitations can be resent
        by an administrator; contact <a href="mailto:hello@smidify.com">hello@smidify.com</a>.
        Existing members should sign in or use Forgot password.
      </p>
      <h2>Your first contribution</h2>
      <ol>
        <li>Open My submissions and start a draft.</li>
        <li>
          Provide the term, Somali wording, definition or explanation, dialect and a concrete
          source.
        </li>
        <li>
          Choose a license only when you have permission to share the work. Mark uncertain rights as
          permission pending.
        </li>
        <li>Save and check the draft before submitting it for independent review.</li>
        <li>
          Respond to reviewer feedback. An editor publishes only after the required review and
          licensing checks.
        </li>
      </ol>
      <p>
        Technology starter terms are prompts for research, not approved translations. Explain your
        proposed wording and alternatives. Do not present generated or uncertain content as
        established Somali usage.
      </p>
      <h2>Respect and permissions</h2>
      <p>
        Discuss evidence and wording respectfully. Credit sources and other contributors. Do not
        upload private personal information, copied material without permission, or content you
        cannot license. Disclose conflicts of interest and do not review your own work. Contributor
        access does not include reviewer, editor or administrator powers.
      </p>
      <h2>Corrections and support</h2>
      <p>
        Propose corrections to published work through the workspace so the previous wording and
        review remain traceable. Use disputes for unresolved evidence or licensing concerns. Report
        access problems or inappropriate content to{" "}
        <a href="mailto:hello@smidify.com">hello@smidify.com</a>. Never send passwords,
        authentication links or secret keys.
      </p>
      <p>
        Read our <Link href="/privacy">privacy notice</Link> for how application and contribution
        information is used.
      </p>
    </InformationPage>
  );
}
