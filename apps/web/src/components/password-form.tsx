"use client";
import { useState } from "react";
import { useLocale } from "@/lib/locale";
export function PasswordForm({
  email,
  onNotice,
  onSaved,
}: {
  email?: string;
  onNotice: (message: string) => void;
  onSaved?: () => Promise<void>;
}) {
  const { tr } = useLocale();
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="editor-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const fields = new FormData(form);
        const password = String(fields.get("password") ?? ""),
          confirmation = String(fields.get("confirmation") ?? "");
        if (password !== confirmation) {
          onNotice("Passwords do not match.");
          return;
        }
        setBusy(true);
        try {
          const response = await fetch("/api/password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password, confirmation }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          form.reset();
          onNotice("Password saved. You can now sign in with your email and password.");
          await onSaved?.();
        } catch (error) {
          onNotice(error instanceof Error ? error.message : "Could not update password.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{tr("Set password")}</h2>
      {email && <p>{email}</p>}
      <label>
        {tr("New password")}
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </label>
      <label>
        {tr("Confirm password")}
        <input
          type="password"
          name="confirmation"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </label>
      <button className="primary" disabled={busy}>
        {tr("Save password")}
      </button>
    </form>
  );
}
