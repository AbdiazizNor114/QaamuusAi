import { readTerminology } from "@/lib/terminology";
export function ProposalNotes({ notes }: { notes: string }) {
  const details = readTerminology(notes);
  if (!details) return <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{notes}</p>;
  return (
    <dl className="terminology-details">
      {[
        ["Definition", details.definition],
        ["Example sentence", details.example],
        ["Alternative terms", details.alternatives],
        ["Permission evidence", details.permission_evidence],
        ["Notes", details.notes],
      ]
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}
