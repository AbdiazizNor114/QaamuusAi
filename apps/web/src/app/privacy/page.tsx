import { InformationPage } from "@/components/information-page";
export const metadata = { title: "Privacy notice | QaamuusAi" };
export default function PrivacyPage() {
  return (
    <InformationPage title="Privacy notice">
      <p>
        Last updated: 27 October 2026. QaamuusAi is a community project operated by Abdiaziz
        Abdullahi. Contact <a href="mailto:hello@smidify.com">hello@smidify.com</a> about your
        information or account.
      </p>
      <h2>Information we use</h2>
      <p>
        Applications contain your name, email, study or training, professional background, review
        status and decision dates. Technical administrators can review applications. Your chosen
        professional title does not grant editorial permissions.
      </p>
      <p>
        Accounts contain an email, profile name and assigned roles. We store your contributions,
        sources, licensing evidence, discussions and review history. Published resources and their
        attribution are public. Workspace members see information permitted by their roles.
      </p>
      <h2>Why we use it</h2>
      <p>
        We use this information to review applications, deliver invitations, authenticate members,
        coordinate contributions and preserve an accountable review process. Application and account
        processing supports your request to join and use the service. Security and audit processing
        supports our legitimate interest in protecting the community and published resources.
      </p>
      <h2>Service providers and security</h2>
      <p>
        Vercel hosts the app, Supabase provides authentication and the database, and Simply.com
        sends authentication email. These providers may process technical logs and network
        addresses. International processing may occur under their service terms and applicable
        transfer safeguards. Passwords are handled by Supabase Auth; administrators do not need your
        password.
      </p>
      <p>
        Application abuse limits store a keyed hash of the source address, not the raw address, in
        our database. Expired budget records are removed on subsequent applications after one day.
        Hosting providers may separately keep access and security logs.
      </p>
      <h2>Optional AI chat and local project guide</h2>
      <p>
        When you choose Free AI chat and send a message, we send that question, a bounded recent
        conversation and public project context to OpenRouter and its selected model provider. This
        service can process data internationally under provider policies; zero retention is not
        guaranteed. NVIDIA records free-endpoint use for security and to improve its products and
        services. Each user must acknowledge this disclosure before Send. Do not submit confidential
        information or personal data, including voices or faces. The app does not store
        conversations in its database or browser storage: they remain in page memory until Clear
        chat or reload. Hosting and provider technical logs follow their own retention settings.
        Avoid secrets, sensitive personal data and participant recordings. An in-memory abuse
        backstop temporarily counts requests and uses a hashed network identifier on trusted Vercel
        hosting; elsewhere it uses a shared bucket. Project guide matches local notes and does not
        send questions to an external model. AI output is not an approved language resource.
      </p>
      <h2>Cookies and browser storage</h2>
      <p>
        Authentication cookies keep your session signed in. Browser storage remembers your language
        preference. Signing out clears the current authentication session.
      </p>
      <h2>Retention and your choices</h2>
      <p>
        We keep applications while review and account administration require them, and contribution
        history while it supports attribution and independent review. Security logs and provider
        backups follow the providers’ retention settings. Contact us to request access, correction,
        deletion, restriction or an export, or to object to processing based on legitimate
        interests. Some audit records and published attribution may need to remain to protect
        others’ work and comply with legal obligations. Deletions from backups follow the backup
        retention cycle.
      </p>
      <p>
        You may raise a concern with your local data protection authority; in Sweden this is IMY.
        Please avoid submitting sensitive personal information in applications or contributions.
      </p>
    </InformationPage>
  );
}
