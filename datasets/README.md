# Dataset Resources

No sample language dataset is shipped with the application. Published datasets come from the reviewed Supabase records and frozen editor-created releases. Validator tests generate temporary synthetic fixtures; those fixtures are not public language data.

## Proposed speech data contract

The [speech standard](../docs/data/speech-standard.md) and [JSON Schema](schemas/speech-record-v0.1.schema.json) define a draft private working-record format. The [synthetic metadata example](examples/speech-record.synthetic.json) contains no real speaker, transcript or audio and is not publishable. No audio ingestion service or release validator is implemented by adding this contract.
