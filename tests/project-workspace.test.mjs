import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
test("project tasks enforce ownership, dependencies, independent review and private preferences", async () => {
 const db=new PGlite({extensions:{pgcrypto}});
 const ids=["10000000-0000-4000-8000-000000000001","10000000-0000-4000-8000-000000000002","10000000-0000-4000-8000-000000000003"];
 try {
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated; alter default privileges in schema public grant all on tables to anon,authenticated;`);
 for(const file of ["202610120001_foundation.sql","202610250001_project_workspace.sql"]) await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 for(let i=0;i<ids.length;i++){await db.query('insert into auth.users values($1)',[ids[i]]);await db.query('insert into profiles(id,display_name) values($1,$2)',[ids[i],'Synthetic '+i]);}
 await db.query("insert into user_roles(user_id,role) values($1,'technical_admin'),($2,'reviewer')",[ids[1],ids[2]]);
 async function identity(id,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??'']);await db.exec('set role '+role);}
 async function move(id,version,action,evidence='',explanation=''){return db.query('select transition_project_task($1,$2,$3,$4,$5)',[id,version,action,evidence,explanation]);}
 await identity(null,'anon');await assert.rejects(db.query('select project_board()'));await assert.rejects(db.query('select * from project_tasks'));
 await identity(ids[0]);assert.equal((await db.query('select project_board() as board')).rows[0].board.tasks.length,10);
 await assert.rejects(db.query("update project_tasks set status='completed'"));
 await db.query("select set_workspace_area('design')");
 await assert.rejects(db.query("select set_workspace_area('technical_admin')"));
 await assert.rejects(move('T05',1,'claim'));
 await move('T01',1,'claim');
 await assert.rejects(move('T01',1,'start'));
 await identity(ids[2]);await assert.rejects(move('T01',2,'claim'));await assert.rejects(move('T01',2,'start'));
 assert.equal((await db.query('select * from workspace_preferences')).rows.length,0);
 await identity(ids[0]);await move('T01',2,'start');await assert.rejects(move('T01',3,'submit'));
 await assert.rejects(move('T01',3,'submit','javascript:alert(1)','Unsafe'));
 await move('T01',3,'submit','https://github.com/example/repo/pull/1','Reproducible setup attached');
 await assert.rejects(move('T01',4,'complete','','Self review'));
 await identity(ids[2]);await assert.rejects(move('T01',4,'complete','','Reviewer cannot approve technical work'));
 await identity(ids[1]);await move('T01',4,'request_changes','','Document the missing service state');
 await identity(ids[0]);await move('T01',5,'submit','https://github.com/example/repo/pull/1','Addressed feedback');
 await identity(ids[1]);await move('T01',6,'complete','','Verified independently');
 await identity(ids[0]);await move('T02',1,'claim');await move('T02',2,'start');await move('T02',3,'submit','https://example.com/report','Language evidence');
 await identity(ids[1]);await assert.rejects(move('T02',4,'complete','','Technical access is not language authority'));
 await identity(ids[2]);await move('T02',4,'complete','','Independent language review');
 await identity(ids[0]);await move('T10',1,'claim');await move('T10',2,'release');
 const board=(await db.query('select project_board() as board')).rows[0].board;
 assert.equal(board.area,'design');assert.equal(board.tasks.find(t=>t.id==='T01').status,'completed');assert.equal(board.tasks.find(t=>t.id==='T10').owner_id,null);
 assert.equal((await db.query('select * from user_roles')).rows.length,0);
 await db.exec('reset role');assert.equal((await db.query("select count(*)::int as count from audit_logs where action='project_task_complete'")).rows[0].count,2);
 } finally {await db.close();}
});
