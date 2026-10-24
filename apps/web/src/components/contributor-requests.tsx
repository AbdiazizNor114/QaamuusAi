"use client";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Mail,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { contributorRoles, contributorRoleLabel } from "@/lib/contributor-application";
import { useEffect, useState } from "react";
export function ContributorRequestForm() {
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [sent, setSent] = useState(false);
  return (
    <section className="contributor-application">
      <div className="application-intro">
        <span className="application-eyebrow">JOIN THE COMMUNITY</span>
        <h2>
          Bring your expertise.
          <br />
          Help Somali thrive.
        </h2>
        <p>
          Build, research, teach or write. Share your background and help us create thoughtful,
          reliable Somali language resources.
        </p>
        <div className="application-process">
          <span>
            <ClipboardList size={16} aria-hidden="true" />
            Apply
          </span>
          <span>
            <UserCheck size={16} aria-hidden="true" />
            Community review
          </span>
          <span>
            <Mail size={16} aria-hidden="true" />
            Email invitation
          </span>
        </div>
      </div>
      {sent ? (
        <div className="application-success" role="status">
          <CheckCircle2 size={32} aria-hidden="true" />
          <h3>Your request has been received.</h3>
          <p>
            Thank you for offering your expertise. We’ll review your application and, if approved,
            email you a link to set your password and join the workspace.
          </p>
        </div>
      ) : (
        <form
          className="editor-form application-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            setBusy(true);
            setNotice("");
            try {
              const response = await fetch("/api/contributor-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: fields.get("name"),
                  email: fields.get("email"),
                  study: fields.get("study"),
                  professional_role: fields.get("professional_role"),
                }),
              });
              const result = await response.json();
              if (!response.ok) throw new Error(result.error);
              setSent(true);
            } catch (error) {
              setNotice(error instanceof Error ? error.message : "Could not send request.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="application-section-heading">
            <span>01</span>
            <div>
              <h3>Your details</h3>
              <p>Let us know who you are and where to reach you.</p>
            </div>
          </div>
          <div className="application-fields">
            <label>
              Full name
              <input
                name="name"
                autoComplete="name"
                placeholder="Your full name"
                maxLength={120}
                required
              />
            </label>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                maxLength={254}
                aria-describedby="application-email-help"
                required
              />
            </label>
          </div>
          <p id="application-email-help" className="application-help">
            Your invitation will be sent to this address. You’ll use it to sign in.
          </p>
          <div className="application-section-heading">
            <span>02</span>
            <div>
              <h3>Your background</h3>
              <p>Every perspective adds something valuable to the commons.</p>
            </div>
          </div>
          <label>
            What do you study or what have you studied?
            <input
              name="study"
              placeholder="e.g. Computer science, Somali linguistics or education"
              maxLength={200}
              aria-describedby="application-study-help"
              required
            />
          </label>
          <p id="application-study-help" className="application-help">
            A field of study, training or independent learning. A degree is not required.
          </p>
          <label>
            Professional role or area of expertise
            <select name="professional_role" defaultValue="" required>
              <option value="" disabled>
                Select your role
              </option>
              {["Technology", "Language & education", "Other backgrounds"].map((group) => (
                <optgroup key={group} label={group}>
                  {contributorRoles
                    .filter((role) => role.group === group)
                    .map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <p className="application-help">
            Choose the role that best describes how you’d like to contribute.
          </p>
          <div className="application-submit">
            <p>
              <ShieldCheck size={17} aria-hidden="true" />
              Your application is visible only to project administrators.
            </p>
            <button className="primary" disabled={busy}>
              {busy ? "Submitting…" : "Submit application"}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          <p className="application-help">
            By submitting, you acknowledge our <Link href="/privacy">privacy notice</Link>. Read the{" "}
            <Link href="/contributor-guide">contributor guide</Link> before joining.
          </p>
          {notice && (
            <p className="application-error" role="alert">
              {notice}
            </p>
          )}
        </form>
      )}
      <p className="application-signin">
        Already part of the community?{" "}
        <Link href="/login">
          Sign in to your account <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </p>
    </section>
  );
}
type Application = {
  id: string;
  name: string;
  email: string;
  study?: string | null;
  professional_role?: string | null;
  status: string;
  created_at: string;
};
export function ContributorRequests() {
  const [requests, setRequests] = useState<Application[]>([]),
    [notice, setNotice] = useState("Loading requests…"),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const response = await fetch("/api/contributor-requests");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRequests(data.requests);
      setNotice(data.requests.length ? "" : "No contributor requests yet.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load requests.");
    }
  }
  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, []);
  return (
    <section>
      <h2>Contributor requests</h2>
      <p>Approve a request to email an account invitation to the applicant.</p>
      <p role="status">{notice}</p>
      <button disabled={busy} onClick={() => void load()}>
        Refresh requests
      </button>
      {requests.map((application) => (
        <section className="record-band" key={application.id}>
          <h3>{application.name}</h3>
          <p>{application.email}</p>
          <dl className="application-background">
            <div>
              <dt>Education / field of study</dt>
              <dd>{application.study || "Not provided"}</dd>
            </div>
            <div>
              <dt>Professional role</dt>
              <dd>
                {application.professional_role
                  ? contributorRoleLabel(application.professional_role)
                  : "Not provided"}
              </dd>
            </div>
          </dl>
          <p>Status: {application.status}</p>
          {["pending", "failed", "invited"].includes(application.status) && (
            <div className="commons-home-actions">
              {(application.status === "invited"
                ? (["resend"] as const)
                : (["approve", "decline"] as const)
              ).map((decision) => (
                <button
                  key={decision}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setNotice("");
                    try {
                      const response = await fetch(`/api/contributor-requests/${application.id}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ decision }),
                      });
                      const result = await response.json();
                      if (!response.ok) throw new Error(result.error);
                      await load();
                      setNotice(
                        decision !== "decline"
                          ? "Invitation emailed to the applicant."
                          : "Request declined.",
                      );
                    } catch (error) {
                      setNotice(
                        error instanceof Error ? error.message : "Could not review request.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {decision === "resend"
                    ? "Resend invitation"
                    : decision === "approve"
                      ? application.status === "failed"
                        ? "Retry invitation"
                        : "Approve and email invitation"
                      : "Decline"}
                </button>
              ))}
            </div>
          )}
        </section>
      ))}
    </section>
  );
}
