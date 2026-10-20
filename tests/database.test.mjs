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
    for (const migration of [
      "202610120001_foundation.sql",
      "202610120002_revision_history.sql",
      "202610130001_community_workflows.sql",
      "202610140001_reviewer_assignment.sql",
      "202610170001_terminology_claims.sql",
    ]) {
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
    await t.test("editor assigns only independent qualified reviewers with an audit", async () => {
      await identity(admin);
      await assert.rejects(db.query("select assign_dataset_reviewer($1,$2,'Admin override')", [revision, reviewer]));
      await identity(editor);
      for (const target of [author, unrelated, null])
        await assert.rejects(db.query("select assign_dataset_reviewer($1,$2,'Assignment')", [revision, target]));
      await assert.rejects(db.query("select assign_dataset_reviewer($1,$2,' ')", [revision, reviewer]));
      await db.query("select assign_dataset_reviewer($1,$2,'Independent grammar review')", [revision, reviewer]);
      await assert.rejects(db.query("select assign_dataset_reviewer($1,$2,'Duplicate')", [revision, reviewer]));
      assert.equal((await db.query("select assigned_reviewer_id from dataset_entry_revisions where id=$1", [revision])).rows[0].assigned_reviewer_id, reviewer);
      await db.exec("reset role");
      assert.equal((await db.query("select * from audit_logs where action='reviewer_assigned' and record_id=$1", [revision])).rows.length, 1);
      await identity(null, "anon");
      await assert.rejects(db.query("select assign_dataset_reviewer($1,$2,'Anonymous')", [revision, reviewer]));
    });
    await t.test(
      "reviewer claims queue, editor publishes and public sees only accepted data",
      async () => {
        await identity(reviewer);
        assert.equal((await db.query("select * from dataset_entry_revisions")).rows.length, 1);
        await db.query("select review_revision($1,'under_review','Independent review begins')", [
          revision,
        ]);
        await identity(editor);
        await assert.rejects(db.query("select assign_dataset_reviewer($1,$2,'Late reassignment')", [revision, editor]));
        await identity(reviewer);
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
    await t.test(
      "scholar decisions require independent editorial authority and audit role grants",
      async () => {
        await identity(author);
        const application = (
          await db.query(
            "select apply_scholar('Synthetic grammar expertise','Synthetic application') as id",
          )
        ).rows[0].id;
        await assert.rejects(db.query("select apply_scholar('Duplicate','Duplicate')"));
        await assert.rejects(
          db.query("select decide_scholar($1,true,'Self approval')", [application]),
        );
        await identity(admin);
        await assert.rejects(
          db.query("select decide_scholar($1,true,'Operational override')", [application]),
        );
        await identity(unrelated);
        assert.equal((await db.query("select * from scholar_applications")).rows.length, 0);
        await identity(editor);
        await db.query("select decide_scholar($1,true,'Independent credentials checked')", [
          application,
        ]);
        assert.equal(
          (await db.query("select status from scholar_applications where id=$1", [application]))
            .rows[0].status,
          "accepted",
        );
        assert.ok(
          (await db.query("select * from audit_logs where action='role_granted'")).rows.length,
        );
        await assert.rejects(
          db.query("select decide_scholar($1,true,'Already decided')", [application]),
        );
        await identity(author);
        assert.equal(
          (await db.query("select has_role('reviewer') as allowed")).rows[0].allowed,
          true,
        );
      },
    );
    await t.test(
      "role administration denies self-elevation and separates operational authority",
      async () => {
        await identity(admin);
        await assert.rejects(
          db.query("select change_member_role($1,'editor',false,'Override')", [unrelated]),
        );
        await assert.rejects(
          db.query("select change_member_role($1,'technical_admin',false,'Self grant')", [admin]),
        );
        await identity(editor);
        await assert.rejects(
          db.query("select change_member_role($1,'technical_admin',false,'Editorial override')", [
            unrelated,
          ]),
        );
        await assert.rejects(
          db.query("select change_member_role($1,'editor',false,'Self grant')", [editor]),
        );
        await db.query("select change_member_role($1,'reviewer',false,'Independent appointment')", [
          unrelated,
        ]);
        await db.query("select change_member_role($1,'reviewer',true,'Appointment ended')", [
          unrelated,
        ]);
        await assert.rejects(
          db.query("select change_member_role($1,'editor',true,'Remove last editor')", [editor]),
        );
        await identity(unrelated);
        assert.equal((await db.query("select * from community_members()")).rows.length, 0);
      },
    );
    await t.test(
      "articles are private, independently reviewed, immutable and corrected separately",
      async () => {
        const article = {
          title: "Synthetic article",
          summary: "Authored summary",
          body: "Synthetic text",
          source: "Authored fixture",
          license: "CC-BY-4.0",
        };
        await identity(author);
        const id = (await db.query("select save_article_proposal($1) as id", [article])).rows[0].id;
        await identity(unrelated);
        assert.equal((await db.query("select * from article_revisions")).rows.length, 0);
        await assert.rejects(db.query("select save_article_proposal($1,$2)", [article, id]));
        await identity(author);
        await db.query("select transition_article($1,'submitted','Ready')", [id]);
        await assert.rejects(
          db.query("select transition_article($1,'under_review','Self review')", [id]),
        );
        await identity(admin);
        await assert.rejects(
          db.query("select transition_article($1,'under_review','Operational override')", [id]),
        );
        await identity(reviewer);
        await db.query("select transition_article($1,'under_review','Independent review')", [id]);
        await db.query("select transition_article($1,'approved','Sources verified')", [id]);
        await assert.rejects(
          db.query("select transition_article($1,'published','Reviewer publication')", [id]),
        );
        await identity(editor);
        const published = (
          await db.query(
            "select transition_article($1,'published','Editorial publication') as id",
            [id],
          )
        ).rows[0].id;
        await identity(null, "anon");
        assert.equal((await db.query("select * from articles")).rows.length, 1);
        assert.equal((await db.query("select * from article_revisions")).rows.length, 0);
        await assert.rejects(db.query("select save_article_proposal($1)", [article]));
        await identity(author);
        await assert.rejects(db.query("select save_article_proposal($1,$2)", [article, id]));
        const corrected = (
          await db.query("select save_article_proposal($1,null,$2) as id", [
            { ...article, body: "Corrected synthetic text" },
            published,
          ])
        ).rows[0].id;
        assert.equal(
          (await db.query("select version from article_revisions where id=$1", [corrected])).rows[0]
            .version,
          2,
        );
        assert.equal(
          (await db.query("select body from articles where id=$1", [published])).rows[0].body,
          "Synthetic text",
        );
        assert.ok(
          (await db.query("select * from audit_logs where record_id=$1", [id])).rows.length >= 4,
        );
      },
    );
    await t.test(
      "article disputes require editor resolution and pending licenses cannot publish",
      async () => {
        await identity(author);
        const article = {
          title: "Pending rights",
          summary: "Summary",
          body: "Test",
          source: "Authored",
          license: "Permission pending",
        };
        const id = (await db.query("select save_article_proposal($1) as id", [article])).rows[0].id;
        await db.query("select transition_article($1,'submitted','Submit')", [id]);
        await identity(reviewer);
        await db.query("select transition_article($1,'under_review','Review')", [id]);
        await db.query("select transition_article($1,'disputed','Distinct position')", [id]);
        await assert.rejects(
          db.query("select transition_article($1,'under_review','Reviewer resolves')", [id]),
        );
        await identity(editor);
        await db.query("select transition_article($1,'under_review','Editor resolution')", [id]);
        await db.query("select transition_article($1,'approved','Meaning verified')", [id]);
        await assert.rejects(
          db.query("select transition_article($1,'published','Rights missing')", [id]),
        );
      },
    );
    await t.test("releases freeze licensed published records with unique versions", async () => {
      await identity(editor);
      const ids = (await db.query("select id from dataset_entries order by version")).rows.map(
        (row) => row.id,
      );
      const release = (
        await db.query(
          "select publish_dataset_release('0.1.0',$1,'Reviewed synthetic release') as id",
          [ids],
        )
      ).rows[0].id;
      await assert.rejects(
        db.query("select publish_dataset_release('0.1.0',$1,'Duplicate version')", [ids]),
      );
      await assert.rejects(
        db.query("select publish_dataset_release('0.2.0',$1,'Duplicate entries')", [
          [ids[0], ids[0]],
        ]),
      );
      await assert.rejects(
        db.query("select publish_dataset_release('bad',$1,'Bad version')", [ids]),
      );
      await identity(author);
      await assert.rejects(
        db.query("select publish_dataset_release('0.2.0',$1,'Contributor publication')", [ids]),
      );
      await identity(null, "anon");
      const frozen = (
        await db.query("select snapshot,license_manifest from dataset_releases where id=$1", [
          release,
        ])
      ).rows[0];
      assert.equal(frozen.snapshot.length, 2);
      assert.equal(frozen.snapshot[0].status, "published");
      assert.equal(frozen.license_manifest.length, 2);
      assert.equal(
        (await db.query("update dataset_releases set notes='Tampered' returning id")).rows.length,
        0,
      );
    });
    await t.test("term claims enforce scholar roles, exclusive ownership, stale-release safety and audits", async () => {
      await db.exec("reset role");
      await db.query("insert into user_roles(user_id,role) values($1,'reviewer'),($2,'editor') on conflict do nothing", [reviewer,editor]);
      await identity(null, "anon");
      await assert.rejects(db.query("select * from list_terminology_claims()"));
      await identity(unrelated);
      await assert.rejects(db.query("select claim_terminology_term('tech-navigation-home')"));
      await identity(reviewer);
      await assert.rejects(db.query("select claim_terminology_term('unknown-seed')"));
      const claim = (await db.query("select claim_terminology_term('tech-navigation-home') as id")).rows[0].id;
      await assert.rejects(db.query("insert into terminology_claims(seed_id,owner_id) values('tech-navigation-dashboard',$1)", [reviewer]));
      await identity(editor);
      await assert.rejects(db.query("select claim_terminology_term('tech-navigation-home')"));
      await assert.rejects(db.query("select release_terminology_claim('tech-navigation-home',$1)", [claim]));
      const listed = (await db.query("select * from list_terminology_claims()")).rows;
      assert.equal(listed.length,1); assert.equal(listed[0].owner_id,reviewer);
      assert.ok(listed[0].display_name); assert.equal('email' in listed[0],false);
      await identity(reviewer);
      await db.query("select release_terminology_claim('tech-navigation-home',$1)", [claim]);
      const renewed = (await db.query("select claim_terminology_term('tech-navigation-home') as id")).rows[0].id;
      assert.notEqual(renewed,claim);
      await assert.rejects(db.query("select release_terminology_claim('tech-navigation-home',$1)", [claim]));
      await db.query("select release_terminology_claim('tech-navigation-home',$1)", [renewed]);
      await db.exec("reset role");
      assert.equal((await db.query("select count(*)::int as count from audit_logs where action in ('terminology_claimed','terminology_released')")).rows[0].count,4);
      assert.equal((await db.query("select count(*)::int as count from terminology_seed_catalog")).rows[0].count,1000);
    });
  } finally {
    await db.close();
  }
});
