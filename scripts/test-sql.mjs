// Executa a migração em um Postgres embarcado (PGlite) com stubs mínimos de
// auth/storage do Supabase e valida o fluxo de aprovação + RLS.
//   npm run test:sql
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import assert from 'node:assert/strict'

const db = new PGlite()
const ids = { mkt: '11111111-1111-1111-1111-111111111111', dir: '22222222-2222-2222-2222-222222222222', nobody: '33333333-3333-3333-3333-333333333333' }

const stubs = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema auth to authenticated;
  grant usage on schema storage to authenticated;
`
// PGlite 0.2 é instável com muitos comandos de DDL em um único exec
for (const stmt of stubs.split(/;\s*\n/).map((x) => x.trim()).filter(Boolean)) await db.exec(stmt)
for (const f of readdirSync('supabase/migrations').sort()) {
  const sql = readFileSync(`supabase/migrations/${f}`, 'utf8').replace(/create extension if not exists pgcrypto;/, '')
  // PGlite falha com scripts muito longos em um único exec — executa por seção
  for (const part of sql.split(/\n(?=-- ───)/)) await db.exec(part)
}
await db.exec(`grant usage on schema public to authenticated; grant select, insert, update, delete on all tables in schema public to authenticated;`)

await db.exec(`
  insert into auth.users (id, email, raw_user_meta_data) values
   ('${ids.mkt}', 'mkt@x.com', '{"name":"Marina"}'), ('${ids.dir}', 'dir@x.com', '{"name":"Helena"}'), ('${ids.nobody}', 'n@x.com', '{}');
  update public.profiles set role = 'marketing' where id = '${ids.mkt}';
  update public.profiles set role = 'diretoria' where id = '${ids.dir}';
`)

async function as(user, fn) {
  await db.exec(`begin; set local role authenticated; select set_config('request.jwt.claim.sub', '${user}', true);`)
  try {
    const r = await fn()
    await db.exec('commit')
    return r
  } catch (e) {
    await db.exec('rollback')
    throw e
  }
}
const q = (sql, p) => (process.env.DEBUG && console.log('SQL', sql.slice(0, 70)), db.query(sql, p).then((r) => r.rows))
const fails = async (p, re) => assert.rejects(p, (e) => (re.test(e.message) ? true : (console.error('mensagem:', e.message), false)))
let n = 0
const ok = (m) => console.log(`  ✓ ${++n}. ${m}`)

// sem papel: nada visível
assert.equal((await as(ids.nobody, () => q('select * from contents'))).length, 0)
assert.equal((await as(ids.nobody, () => q('select * from products'))).length, 0)
ok('conta sem papel não enxerga dados')

await fails(as(ids.dir, () => q(`insert into contents (title, publish_date, channel, format) values ('x','2026-12-01','instagram','feed')`)), /row-level security/)
ok('diretoria não cria conteúdo (RLS)')

const [c] = await as(ids.mkt, () => q(`insert into contents (title, publish_date, channel, format, status) values ('Post A','2026-12-01','instagram','feed','aprovado') returning *`))
assert.equal(c.status, 'ideia'); assert.equal(c.version, 1); assert.equal(c.owner_id, ids.mkt)
ok('insert força status ideia / v1 / owner')

await fails(as(ids.mkt, () => q(`update contents set status='aprovado' where id=$1`, [c.id])), /set_content_status/)
ok('status não muda por update direto')

await fails(as(ids.mkt, () => q(`select submit_content($1)`, [c.id])), /Anexe/)
await as(ids.mkt, () => q(`update contents set assets='[{"id":"a1","kind":"image","name":"a.png","path":"x/a.png","url":"https://signed"}]' where id=$1`, [c.id]))
const [a1] = await q(`select assets from contents where id=$1`, [c.id])
assert.equal(a1.assets[0].url, undefined)
ok('envio exige arte; URL assinada não é persistida')

await as(ids.mkt, () => q(`select submit_content($1)`, [c.id]))
const notif = await as(ids.dir, () => q(`select * from notifications`))
assert.equal(notif.length, 1); assert.equal(notif[0].type, 'awaiting_approval')
assert.equal((await q(`select count(*)::int as n from email_outbox`))[0].n, 1)
ok('envio notifica diretoria + enfileira e-mail')

await fails(as(ids.mkt, () => q(`select approve_contents($1)`, [JSON.stringify([{ id: c.id, version: 1 }])])), /diretoria/)
ok('marketing não aprova')

await fails(as(ids.dir, () => q(`select request_changes($1, 1, '')`, [c.id])), /Descreva/)
await as(ids.dir, () => q(`select request_changes($1, 1, 'Trocar a foto de capa')`, [c.id]))
let [row] = await q(`select * from contents where id=$1`, [c.id])
assert.equal(row.status, 'ajustes')
ok('solicitar ajustes exige justificativa e muda status')

await fails(as(ids.mkt, () => q(`select submit_content($1)`, [c.id])), /nova versão/)
await as(ids.mkt, () => q(`update contents set caption='nova legenda' where id=$1`, [c.id]))
;[row] = await q(`select * from contents where id=$1`, [c.id])
assert.equal(row.version, 2); assert.equal(row.status, 'ajustes')
await as(ids.mkt, () => q(`update contents set caption='nova legenda 2' where id=$1`, [c.id]))
;[row] = await q(`select * from contents where id=$1`, [c.id])
assert.equal(row.version, 2)
ok('ajuste gera v2 (uma única vez até reenviar)')

await as(ids.mkt, () => q(`select submit_content($1)`, [c.id]))
await fails(as(ids.dir, () => q(`select approve_contents($1)`, [JSON.stringify([{ id: c.id, version: 1 }])])), /mudou para a v2/)
await as(ids.dir, () => q(`select approve_contents($1)`, [JSON.stringify([{ id: c.id, version: 2 }])]))
;[row] = await q(`select * from contents where id=$1`, [c.id])
assert.equal(row.status, 'aprovado'); assert.equal(row.approved_by, ids.dir); assert.ok(row.approved_at)
ok('aprovação valida versão e registra autor/data')

await as(ids.mkt, () => q(`update contents set publish_date='2026-12-03' where id=$1`, [c.id]))
;[row] = await q(`select * from contents where id=$1`, [c.id])
assert.equal(row.status, 'aprovado'); assert.equal(row.version, 2)
ok('reagendar não invalida aprovação (registrado no histórico)')

await as(ids.mkt, () => q(`update contents set title='Post A (rev)' where id=$1`, [c.id]))
;[row] = await q(`select * from contents where id=$1`, [c.id])
assert.equal(row.status, 'aguardando'); assert.equal(row.version, 3); assert.equal(row.approved_by, null); assert.equal(row.submitted_version, 3)
ok('alterar conteúdo aprovado gera v3 e pede nova aprovação')

const [c2] = await as(ids.mkt, () => q(`insert into contents (title, publish_date, channel, format, assets) values ('Post B','2026-12-02','linkedin','post','[{"id":"b"}]') returning id`))
await as(ids.mkt, () => q(`select submit_content($1)`, [c2.id]))
await fails(as(ids.dir, () => q(`select approve_contents($1)`, [JSON.stringify([{ id: c.id, version: 3 }, { id: c2.id, version: 9 }])])), /mudou/)
;[row] = await q(`select status from contents where id=$1`, [c.id])
assert.equal(row.status, 'aguardando')
await as(ids.dir, () => q(`select approve_contents($1)`, [JSON.stringify([{ id: c.id, version: 3 }, { id: c2.id, version: 1 }])]))
assert.equal((await q(`select count(*)::int n from contents where status='aprovado'`))[0].n, 2)
ok('aprovação em lote é atômica')

await fails(as(ids.mkt, () => q(`select set_content_status($1, 'publicado')`, [c.id])), /Transição/)
await as(ids.mkt, () => q(`select set_content_status($1, 'programado')`, [c.id]))
await as(ids.mkt, () => q(`select set_content_status($1, 'publicado')`, [c.id]))
await fails(as(ids.mkt, () => q(`update contents set caption='x' where id=$1`, [c.id])), /publicados/)
await fails(as(ids.mkt, () => q(`update contents set publish_date='2027-01-01' where id=$1`, [c.id])), /publicados/)
await as(ids.mkt, () => q(`delete from contents where id=$1`, [c.id]))
assert.equal((await q(`select count(*)::int n from contents where id=$1`, [c.id]))[0].n, 1)
ok('transições validadas; publicado é imutável e não é excluído')

const [cm] = await as(ids.dir, () => q(`insert into comments (content_id, version, body, pin) values ($1, 1, 'Mover logo', '{"assetId":"b","x":10,"y":20}') returning *`, [c2.id]))
assert.equal(cm.author_id, ids.dir)
await fails(as(ids.mkt, () => q(`update comments set body='hack' where id=$1`, [cm.id])), /não podem ser editados/)
await as(ids.mkt, () => q(`update comments set resolved=true where id=$1`, [cm.id]))
;[row] = await q(`select * from comments where id=$1`, [cm.id])
assert.equal(row.resolved_by, ids.mkt)
const mn = await as(ids.mkt, () => q(`select * from notifications where type='comment'`))
assert.equal(mn.length, 1)
ok('comentário com pin, autor forçado, resolvido registrado, notificação')

await fails(as(ids.mkt, () => q(`update profiles set role='admin' where id=$1`, [ids.mkt])), /administradores/)
ok('usuário não se promove a admin')

const versions = await q(`select number from content_versions where content_id=$1 order by number`, [c.id])
assert.deepEqual(versions.map((v) => v.number), [1, 2, 3])
const events = await q(`select action from approval_events where content_id=$1 order by created_at, id`, [c.id])
assert.ok(events.length >= 8)
ok(`histórico: versões ${versions.map((v) => 'v' + v.number).join(', ')} · ${events.length} eventos`)

console.log(`\n${n} verificações passaram.`)
