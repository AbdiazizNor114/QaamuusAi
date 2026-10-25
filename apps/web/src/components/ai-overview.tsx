import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Layers, ShieldCheck } from "lucide-react";

const phases = [
  {
    title: "Build the language and data foundation",
    goal: "A reliable contributor platform and reviewed text",
    steps:
      "Complete accounts, invitations, permissions and backups. Agree on dataset licences, consent, source records and independent review. Publish a small, versioned text collection with a documented schema.",
  },
  {
    title: "Collect speech with permission",
    goal: "Recordings paired with checked transcripts",
    steps:
      "Recruit speakers across dialects and backgrounds. Define recording quality, transcription and review standards. Record exactly which uses each participant permits, with separate choices for speech recognition and synthetic voice development.",
  },
  {
    title: "Evaluate and adapt speech models",
    goal: "Measured Somali recognition and speech generation baselines",
    steps:
      "Test suitable existing models before deciding what to train or adapt. Keep training and evaluation data separate, including speakers. Measure transcription errors, dialect coverage, pronunciation, intelligibility and cost with Somali reviewers.",
  },
  {
    title: "Release a developer toolkit",
    goal: "A reproducible, documented pilot developers can use",
    steps:
      "Publish eligible datasets, model versions, evaluation results, training examples and model cards. Provide SDKs or APIs where useful. Validate a small example application with developers, report limitations and improve through feedback.",
  },
];
const teams = [
  [
    "Language & editorial",
    "Linguists, Somali and grammar teachers, translators, writers and independent reviewers: establish meaning, usage, dialect context, transcription accuracy and publication quality.",
  ],
  [
    "Engineering & operations",
    "Frontend and backend developers, DevOps and security contributors: build accessible tools, reliable accounts, the API, backups and monitoring.",
  ],
  [
    "Design & research",
    "UI / UX designers, accessibility contributors and user researchers: make recording, annotation and developer tools accessible, and test example experiences with Somali speakers.",
  ],
  [
    "Data & AI",
    "Data scientists and machine learning engineers: prepare licensed text and audio datasets, develop speech recognition and speech generation models, publish training examples and evaluate quality across dialects.",
  ],
  [
    "Speakers & audio contributors",
    "Consenting Somali speakers, transcribers and audio specialists: contribute recordings, check transcripts and evaluate naturalness and pronunciation across dialects.",
  ],
  [
    "Community & stewardship",
    "A project lead, community coordinators and funding partners: support contributors, manage priorities and publish decisions and expenses.",
  ],
];

export function AIOverview() {
  return (
    <article className="ai-overview">
      <header className="ai-hero">
        <div>
          <span className="commons-eyebrow">OUR AI VISION · PROJECT OVERVIEW</span>
          <h1>
            Build the foundation
            <br />
            for Somali speech AI.
          </h1>
          <p>
            Give developers the Somali datasets, speech models, evaluation tools and documentation
            they need to build AI that understands and speaks Somali naturally. QaamuusAI provides
            the foundation; developers build the applications.
          </p>
          <div className="ai-actions">
            <Link className="ai-primary" href="/join">
              Help build the foundation <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="#ai-roadmap">
              Explore the plan <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <aside className="ai-status" aria-label="Project stage">
          <span className="ai-stage">FOUNDATION STAGE</span>
          <BookOpen size={34} aria-hidden="true" />
          <h2>From shared resources to useful tools.</h2>
          <p>
            Our starting point is a contributor platform and 1,000 English technology starter terms.
            Speech datasets, trained models and developer toolkits are planned milestones, not
            available releases.
          </p>
          <Link href="/technology">
            Explore the starter collection <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </aside>
      </header>

      <section className="ai-section ai-summary" aria-labelledby="ai-purpose">
        <span className="ai-section-number">01 / THE PURPOSE</span>
        <div>
          <h2 id="ai-purpose">A shared foundation for language and technology.</h2>
          <p>
            QaamuusAI is building a shared foundation for Somali language technology: reviewed text,
            consented speech recordings, accurate transcripts, models and developer tools.
            Developers could use these resources to train or adapt models and build voice
            assistants, learning tools, translation services and accessible applications. Our
            long-term ambition is natural Somali voice interaction, with dialect coverage and
            quality tested by Somali speakers.
          </p>
        </div>
      </section>

      <section className="ai-section" aria-labelledby="ai-explained">
        <span className="ai-section-number">02 / HOW AI WORKS</span>
        <div>
          <h2 id="ai-explained">Three capabilities developers can connect.</h2>
          <p>
            A spoken conversation combines different models. Developers can choose and connect these
            capabilities to suit their own applications.
          </p>
          <div className="ai-flow">
            <div>
              <Layers size={22} aria-hidden="true" />
              <h3>Understand speech</h3>
              <p>
                Speech recognition turns recorded or live Somali speech into text. Checked
                recordings and transcripts support training and evaluation.
              </p>
            </div>
            <div>
              <BookOpen size={22} aria-hidden="true" />
              <h3>Work with language</h3>
              <p>
                Language models generate text from learned patterns, one token at a time. Reviewed
                Somali text and terminology can support adaptation and evaluation.
              </p>
            </div>
            <div>
              <ShieldCheck size={22} aria-hidden="true" />
              <h3>Generate speech</h3>
              <p>
                Speech generation turns text into spoken Somali. Voice development needs suitable
                recordings and explicit permission for the intended synthetic voice use.
              </p>
            </div>
          </div>
          <p className="ai-evidence">
            The ambition is clear, natural Somali speech. Accuracy, naturalness and dialect coverage
            must be measured; fluent output alone does not establish quality.{" "}
            <a href="https://huggingface.co/learn/agents-course/en/unit1/what-are-llms">
              Learn how language models work
            </a>
          </p>
          <div className="ai-deliverables">
            <h3>What we aim to give developers</h3>
            <ul>
              <li>
                <strong>Language datasets:</strong> reviewed text, terminology, grammar, sources and
                licences.
              </li>
              <li>
                <strong>Speech datasets:</strong> consented audio, checked transcripts and dialect
                metadata.
              </li>
              <li>
                <strong>Models:</strong> evaluated speech recognition, speech generation and
                language model releases.
              </li>
              <li>
                <strong>Training tools:</strong> reproducible examples for training and adapting
                models.
              </li>
              <li>
                <strong>Benchmarks:</strong> separate evaluation sets, documented metrics and known
                limitations.
              </li>
              <li>
                <strong>Integration tools:</strong> APIs, SDKs and practical documentation where
                useful.
              </li>
            </ul>
          </div>
        </div>
      </section>
      <figure className="ai-application-concept">
        <Image
          src="/images/somali-voice-application-concept.png"
          alt="Concept illustration of a woman speaking Somali to an application on her phone and receiving a written and spoken response."
          width={1536}
          height={1024}
          sizes="(max-width: 800px) 100vw, 1200px"
        />
        <figcaption>
          <strong>An application someone could build using QaamuusAI.</strong> This illustration
          shows the long-term possibilities of Somali speech tools. It is an application concept,
          not a live QaamuusAI assistant or an available model.
        </figcaption>
      </figure>

      <section id="ai-roadmap" className="ai-section" aria-labelledby="ai-steps">
        <span className="ai-section-number">03 / THE ROADMAP</span>
        <div>
          <h2 id="ai-steps">Four steps toward tools developers can use.</h2>
          <p>
            These are proposed milestones. Dates and commitments will be agreed once the team,
            access and budget are confirmed.
          </p>
          <ol className="ai-roadmap">
            {phases.map((phase, index) => (
              <li key={phase.title}>
                <span className="ai-step">{index + 1}</span>
                <div>
                  <h3>{phase.title}</h3>
                  <strong>{phase.goal}</strong>
                  <p>{phase.steps}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ai-section" aria-labelledby="ai-team">
        <span className="ai-section-number">04 / THE TEAM WE NEED</span>
        <div>
          <h2 id="ai-team">Different expertise. One shared purpose.</h2>
          <p>
            These are contribution areas we need to bring together, not a list of filled positions.
            A small founding team can cover several areas.
          </p>
          <div className="ai-team">
            {teams.map(([title, description]) => (
              <div key={title}>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ai-section" aria-labelledby="ai-governance">
        <span className="ai-section-number">05 / TRUST & SUPPORT</span>
        <div>
          <h2 id="ai-governance">Community authority, clear responsibilities.</h2>
          <p>
            Language reviewers decide linguistic quality; technical administrators operate the
            service. AI suggestions would remain labelled drafts until independently reviewed.
            Funding would support agreed work and would not buy approval of terminology.
          </p>
          <p>
            Our proposed governance starts with named owners, recorded decisions, an appeal route
            and transparent spending. Lightweight ITIL-inspired practices would guide access
            requests, incidents, releases and ongoing improvement. Only appropriately licensed or
            consented material would enter the datasets. Recognition and synthetic voice uses need
            distinct permissions. Recording access, retention and participant requests need clear
            policies; account and application details would stay out of released language datasets.
          </p>
          <div className="ai-callout">
            <div>
              <h3>Help us prove the idea.</h3>
              <p>
                Contribute your expertise or discuss supporting a defined pilot milestone. Funding
                priorities are dependable hosting, invitation emails, consented audio collection,
                transcription, independent language review and measured model evaluation.
              </p>
            </div>
            <Link className="ai-primary" href="/join">
              Join the founding community <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
