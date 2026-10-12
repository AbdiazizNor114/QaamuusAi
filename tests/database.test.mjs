import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

test("migrations, RLS and editorial transactions", async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  const author = "10000000-0000-4000-8000-000000000001";
  const reviewer = "10000000-0000-4000-8000-000000000002";
  const editor = "10000000-0000-4000-8000-000000000003";
  const admin = "10000000-0000-4000-8000-000000000004";
  const unrelated = "10000000-0000-4000-8000-000000000005";
  let revision;
  try {
    // Reproduce Supabase's database roles and auth identity contract locally.
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;
      alter default privileges in schema public grant all on tables to anon,authenticated;
    `);
    for (const migration of ["202610120001_foundation.sql", "202610120002_revision_history.sql"]) {
      await db.exec(
        await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), "utf8"),
      );
    }
    for (const [id, role] of [
      [author, "contributor"],
      [reviewer, "reviewer"],
      [editor, "editor"],
      [admin, "technical_admin"],
      [unrelated, "contributor"],
    ]) {
      await db.query("insert into auth.users(id) values($1)", [id]);
      await db.query("insert into profiles(id,display_name) values($1,$2)", [
        id,
        `Synthetic ${role}`,
      ]);
      await db.query("insert into user_roles(user_id,role) values($1,$2)", [id, role]);
    }
    async function identity(id, role = "authenticated") {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? ""]);
      await db.exec(`set role ${role}`);
    }
    const content = {
      category: "vocabulary",
      term: "tijaabo",
      translation: "test",
      notes: "Synthetic test",
      source: "Authored test fixture",
      license: "CC0-1.0",
      dialect: "Unspecified",
    };

    await t.test("own drafts are private and editable with snapshots", async () => {
      await identity(author);
      revision = (
        await db.query(
          `insert into dataset_entry_revisions(author_id,category,term,translation,source,license,dialect)
        values($1,'vocabulary','tijaabo','test','Authored test fixture','CC0-1.0','Unspecified') returning id`,
          [author],
        )
      ).rows[0].id;
      await db.query("select save_revision($1,$2)", [
        revision,
        { ...content, notes: "Updated draft" },
      ]);
      const history = await db.query("select * from audit_logs where record_id=$1", [revision]);
      assert.equal(history.rows.length, 2);
      await identity(unrelated);
      assert.equal((await db.query("select * from dataset_entry_revisions")).rows.length, 0);
      await assert.rejects(db.query("select save_revision($1,$2)", [revision, content]));
      await identity(null, "anon");
      assert.equal((await db.query("select * from dataset_entry_revisions")).rows.length, 0);
      await assert.rejects(db.query("select submit_revision($1)", [revision]));
    });
    await t.test("no self-review, self-elevation or administrator override", async () => {
      await identity(author);
      await assert.rejects(
        db.query("insert into user_roles(user_id,role) values($1,'editor')", [author]),
      );
      await db.query("select submit_revision($1)", [revision]);
      await assert.rejects(
        db.query("select review_revision($1,'under_review','Self review')", [revision]),
      );
      await identity(admin);
      await assert.rejects(
        db.query("select review_revision($1,'approved','Admin override')", [revision]),
      );
      assert.equal((await db.query("select * from dataset_entry_revisions")).rows.length, 0);
    });
    await t.test(
      "reviewer claims queue, editor publishes and public sees only accepted data",
      async () => {
        await identity(reviewer);
        assert.equal((await db.query("select * from dataset_entry_revisions")).rows.length, 1);
        await db.query("select review_revision($1,'under_review','Independent review begins')", [
          revision,
        ]);
        await assert.rejects(db.query("select review_revision($1,'approved','')", [revision]));
        await db.query("select review_revision($1,'approved','Synthetic evidence reviewed')", [
          revision,
        ]);
        await assert.rejects(
          db.query("select review_revision($1,'published','Reviewer publication')", [revision]),
        );
        await identity(editor);
        await db.query("select review_revision($1,'published','License checked')", [revision]);
        await identity(null, "anon");
        assert.equal((await db.query("select * from dataset_entries")).rows.length, 1);
        assert.equal((await db.query("select * from review_decisions")).rows.length, 0);
        assert.equal(
          (await db.query("update dataset_entries set term='tampered' returning id")).rows.length,
          0,
        );
      },
    );
    await t.test("corrections preserve accepted records and dispute evidence", async () => {
      await identity(author);
      const accepted = (await db.query("select * from dataset_entries")).rows[0];
      const correction = (
        await db.query("select propose_correction($1,$2) as id", [
          accepted.id,
          { ...content, translation: "corrected test" },
        ])
      ).rows[0].id;
      await db.query("select submit_revision($1)", [correction]);
      await identity(reviewer);
      await db.query("select review_revision($1,'under_review','Review correction')", [correction]);
      await db.query("select review_revision($1,'disputed','Variant needs evidence')", [
        correction,
      ]);
      const dispute = (
        await db.query("select id from linguistic_disputes where revision_id=$1", [correction])
      ).rows[0].id;
      await db.query(
        "insert into dispute_evidence(dispute_id,author_id,position,source) values($1,$2,'Variant position','Synthetic source')",
        [dispute, reviewer],
      );
      await assert.rejects(db.query("select resolve_dispute($1,'Reviewer resolution')", [dispute]));
      await identity(editor);
      await db.query("select resolve_dispute($1,'Accept separately reviewed variant')", [dispute]);
      await db.query("select review_revision($1,'approved','Variant supported')", [correction]);
      await db.query("select review_revision($1,'published','Redistribution confirmed')", [
        correction,
      ]);
      const records = (await db.query("select * from dataset_entries order by version")).rows;
      assert.equal(records.length, 2);
      assert.equal(records[0].translation, "test");
      assert.equal(records[1].version, 2);
      assert.equal((await db.query("select * from dispute_evidence")).rows.length, 1);
      assert.equal(
        (await db.query("select resolution from linguistic_disputes")).rows[0].resolution,
        "Accept separately reviewed variant",
      );
    });
    await t.test("permission-pending proposals cannot publish", async () => {
      await identity(author);
      const pending = (
        await db.query(
          `insert into dataset_entry_revisions(author_id,category,term,translation,source,license,dialect)
        values($1,'translation','synthetic','test','Authored','Permission pending','Unspecified') returning id`,
          [author],
        )
      ).rows[0].id;
      await db.query("select submit_revision($1)", [pending]);
      await identity(reviewer);
      await db.query("select review_revision($1,'under_review','Review')", [pending]);
      await db.query("select review_revision($1,'approved','Meaning checked')", [pending]);
      await identity(editor);
      await assert.rejects(
        db.query("select review_revision($1,'published','No rights')", [pending]),
      );
      assert.equal(
        (await db.query("select status from dataset_entry_revisions where id=$1", [pending]))
          .rows[0].status,
        "approved",
      );
    });
  } finally {
    await db.close();
  }
});
