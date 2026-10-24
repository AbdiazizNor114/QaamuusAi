import Link from "next/link";
import { BrandLogo } from "./brand-logo";
export function InformationPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="commons-site">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="commons-header">
        <Link href="/" aria-label="QaamuusAi">
          <BrandLogo />
        </Link>
        <Link href="/join">Request to contribute</Link>
      </header>
      <main id="main-content" className="commons-main">
        <article
          className="commons-page-heading"
          style={{ maxWidth: "760px", margin: "2rem auto", padding: "1rem" }}
        >
          <h1>{title}</h1>
          {children}
        </article>
      </main>
      <footer className="commons-footer">
        <Link href="/contributor-guide">Contributor guide</Link>
        <Link href="/privacy">Privacy notice</Link>
        <a href="mailto:hello@smidify.com">Contact the team</a>
      </footer>
    </div>
  );
}
