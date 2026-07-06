// Hand-crafted course diagrams — the visual bar Itish set in the study-notes
// PDF, rebuilt as themed HTML/CSS so they're crisp, readable, and theme-aware
// (they inherit the page's --c-* tokens). Reference from course markdown with
// a ```viz <id> fence. Add a new diagram → register it in VISUALS below.

import React from 'react';

const MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';
const SANS = '"Inter", -apple-system, system-ui, sans-serif';

// Theme tokens (CSS vars set on the course page root).
const ink = 'var(--c-ink)';
const mute = 'var(--c-mute)';
const faint = 'var(--c-faint)';
const softer = 'var(--c-softer)';
const paper = 'var(--c-paper)';
const red = 'var(--c-red)';
const green = 'var(--c-green)';
const amber = 'var(--c-amber)';

// Terminal / log panels stay dark in both themes (like code).
const TERM = '#100e0b';
const TERM_INK = '#f3eee2';
const TERM_MUTE = 'rgba(243,238,226,0.46)';
const TERM_LINE = 'rgba(243,238,226,0.10)';

const card: React.CSSProperties = {
  border: `1px solid ${faint}`,
  borderRadius: 16,
  background: paper,
  padding: 20,
};

function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: color ?? mute, marginBottom: 12 }}>
      {children}
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${faint}`, fontFamily: SANS, fontSize: 12.5, lineHeight: 1.6, color: mute, textAlign: 'center' }}>
      {children}
    </div>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return <b style={{ color: red, fontWeight: 700 }}>{children}</b>;
}

// A labelled box (light) — the workhorse building block.
function Box({ title, sub, accent, style }: { title: React.ReactNode; sub?: React.ReactNode; accent?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{
      flex: 1, minWidth: 0, borderRadius: 10, padding: '12px 14px', textAlign: 'center',
      border: `1px solid ${accent ? red : faint}`,
      background: softer,
      ...style,
    }}>
      <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: accent ? red : ink, lineHeight: 1.2 }}>{title}</div>
      {sub && <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.04em', color: mute }}>{sub}</div>}
    </div>
  );
}

function Arrow({ dir = 'right', dashed }: { dir?: 'right' | 'down'; dashed?: boolean }) {
  const glyph = dir === 'right' ? '→' : '↓';
  return (
    <div style={{ color: red, fontFamily: MONO, fontSize: 15, flexShrink: 0, display: 'grid', placeItems: 'center', padding: dir === 'right' ? '0 2px' : '2px 0', opacity: dashed ? 0.55 : 1 }}>
      {glyph}
    </div>
  );
}

// ── 1. Lakehouse stack ────────────────────────────────────────────────────────
function Layer({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      borderRadius: 9, padding: '13px 16px',
      border: `1px solid ${accent ? red : faint}`,
      background: softer,
      fontFamily: SANS, fontSize: 13.5, color: ink,
    }}>
      {children}
    </div>
  );
}

export function Lakehouse() {
  return (
    <div style={card}>
      <Label>The lakehouse, top to bottom</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Layer accent><b>BI &amp; dashboards</b> · Data science · Machine learning</Layer>
        <Layer>Apache Spark + Photon — the compute engine</Layer>
        <Layer accent><b>Delta Lake</b> — ACID, time travel, reliability over files</Layer>
        <Layer>Cloud object storage — cheap Parquet on S3 / ADLS / GCS</Layer>
      </div>
      <Caption><Lead>Read it bottom-up.</Lead> Cheap files at the base, a reliability layer over them, one fast engine, and every workload — SQL, pipelines, ML — sharing the exact same data.</Caption>
    </div>
  );
}

// ── 2. Cluster: driver + workers ──────────────────────────────────────────────
export function Cluster() {
  return (
    <div style={card}>
      <Label>One cluster = a driver + workers</Label>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Box title="DRIVER" sub="coordinates · splits the work" accent style={{ flex: '0 0 220px' }} />
      </div>
      <div style={{ textAlign: 'center', color: red, fontFamily: MONO, fontSize: 15, margin: '2px 0' }}>↓&nbsp;&nbsp;&nbsp;↓&nbsp;&nbsp;&nbsp;↓</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Box title="worker" sub="runs tasks" />
        <Box title="worker" sub="runs tasks" />
        <Box title="worker" sub="runs tasks" />
      </div>
      <Caption><Lead>Parallelism is the point.</Lead> The driver splits your job into tasks; ten workers each crunch a tenth of the data at once. That&apos;s why big data is fast here.</Caption>
    </div>
  );
}

// ── 3. Spark lazy DAG ─────────────────────────────────────────────────────────
export function SparkDag() {
  return (
    <div style={card}>
      <Label>Transformations are lazy · the action runs it</Label>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 4, flexWrap: 'wrap' }}>
        <Box title="read" sub="lazy" />
        <Arrow />
        <Box title="filter" sub="lazy" />
        <Arrow />
        <Box title="groupBy" sub="lazy" />
        <Arrow dashed />
        <Box title=".show()" sub="ACTION — runs now" accent />
      </div>
      <Caption><Lead>Nothing computes until the action.</Lead> Because Spark sees the whole recipe first, it optimises — e.g. pushing the filter down before the group. A cell with only transformations looks like it &quot;did nothing.&quot;</Caption>
    </div>
  );
}

// ── 4. Delta table on disk (log + data files) ────────────────────────────────
function TermPanel({ children, title, sub, foot }: { children: React.ReactNode; title: string; sub: string; foot: string }) {
  return (
    <div style={{ flex: '1 1 240px', minWidth: 0, background: TERM, borderRadius: 12, padding: '14px 16px', border: `1px solid ${TERM_LINE}` }}>
      <div style={{ fontFamily: MONO, fontSize: 12, color: red, fontWeight: 600 }}>{title}</div>
      <div style={{ fontFamily: MONO, fontSize: 8.5, color: TERM_MUTE, marginTop: 3, marginBottom: 12, letterSpacing: '0.04em' }}>{sub}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>{children}</div>
      <div style={{ fontFamily: MONO, fontSize: 8.5, color: TERM_MUTE, marginTop: 12, letterSpacing: '0.04em' }}>{foot}</div>
    </div>
  );
}

function Commit({ file, note, tone }: { file: string; note: string; tone?: 'green' | 'mute' }) {
  return (
    <div style={{ background: 'rgba(243,238,226,0.05)', borderRadius: 6, padding: '6px 9px', fontFamily: MONO, fontSize: 10.5, color: tone === 'green' ? green : TERM_INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {file} <span style={{ color: TERM_MUTE }}>{note}</span>
    </div>
  );
}

export function DeltaTable() {
  return (
    <div style={card}>
      <div style={{ fontFamily: MONO, fontSize: 12, color: ink, marginBottom: 14 }}>
        <b>/my_table/</b> <span style={{ color: mute }}>← the table is a directory, not one file</span>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <TermPanel title="_delta_log/" sub="the transaction log = source of truth" foot="each commit is atomic → ACID">
          <Commit file="000…000.json" note="add A, B" />
          <Commit file="000…001.json" note="remove A, add C" />
          <Commit file="000…002.json" note="MERGE / upsert" />
          <Commit file="…010.checkpoint" note="parquet" tone="green" />
        </TermPanel>
        <div style={{ flex: '1 1 240px', minWidth: 0, background: softer, borderRadius: 12, padding: '14px 16px', border: `1px solid ${faint}` }}>
          <div style={{ fontFamily: MONO, fontSize: 12, color: ink, fontWeight: 600, marginBottom: 12 }}>data files (Parquet)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {['part-0000-….snappy.parquet', 'part-0001-….snappy.parquet'].map((f) => (
              <div key={f} style={{ border: `1px solid ${faint}`, borderRadius: 6, padding: '6px 9px', fontFamily: MONO, fontSize: 10.5, color: ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f}</div>
            ))}
            <div style={{ border: `1px solid ${faint}`, borderRadius: 6, padding: '6px 9px', fontFamily: MONO, fontSize: 10.5, color: mute, textDecoration: 'line-through', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>part-0002 (tombstoned)</div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 8.5, color: mute, marginTop: 12 }}>immutable · old files kept for time travel until VACUUM</div>
        </div>
      </div>
      <Caption><Lead>Delta = Parquet + a transaction log.</Lead> Writes never edit a file in place; they add new files and record add/remove in the log. That log is what powers ACID, time travel, and streaming.</Caption>
    </div>
  );
}

// ── 5. Medallion architecture ─────────────────────────────────────────────────
export function Medallion() {
  return (
    <div style={card}>
      <Label>One clean assembly line</Label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <Box title="BRONZE" sub="raw, as-ingested" />
        <Arrow />
        <Box title="SILVER" sub="cleaned, joined" />
        <Arrow />
        <Box title="GOLD" sub="business-ready" accent />
      </div>
      <Caption><Lead>Clean once, reuse everywhere.</Lead> Each layer refines the one before it — so when a dashboard looks wrong you trace it layer by layer, and every team reads from the same trustworthy gold.</Caption>
    </div>
  );
}

// ── 6. Unity Catalog namespace ────────────────────────────────────────────────
function Nest({ title, sub, indent, accent }: { title: string; sub: string; indent: number; accent?: boolean }) {
  return (
    <div style={{ marginLeft: indent, display: 'flex', alignItems: 'center', gap: 10 }}>
      {indent > 0 && <span style={{ color: mute, fontFamily: MONO, fontSize: 12 }}>└</span>}
      <div style={{ flex: 1, border: `1px solid ${accent ? red : faint}`, background: softer, borderRadius: 8, padding: '9px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600, color: accent ? red : ink }}>{title}</span>
        <span style={{ fontFamily: MONO, fontSize: 8.5, color: mute, letterSpacing: '0.04em' }}>{sub}</span>
      </div>
    </div>
  );
}

export function UnityCatalog() {
  return (
    <div style={card}>
      <Label>Three-level namespace</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Nest title="metastore" sub="shared per region" indent={0} accent />
        <Nest title="catalog" sub="e.g. prod" indent={22} />
        <Nest title="schema" sub="e.g. sales" indent={44} />
        <Nest title="table" sub="e.g. trips" indent={66} />
      </div>
      <div style={{ marginTop: 14, textAlign: 'center' }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: ink, background: softer, border: `1px solid ${faint}`, borderRadius: 6, padding: '6px 12px' }}>
          full name → <b style={{ color: red }}>prod.sales.trips</b>
        </span>
      </div>
      <Caption><Lead>catalog → schema → table.</Lead> One metastore sits above all catalogs and is shared across every workspace in a region, so a table has one definition everywhere — no drifting copies.</Caption>
    </div>
  );
}

// ── 7. Job workflow ───────────────────────────────────────────────────────────
export function JobWorkflow() {
  return (
    <div style={card}>
      <Label>A workflow chains tasks in order</Label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        <Box title="ingest → bronze" sub="task 1" />
        <Arrow />
        <Box title="clean → silver" sub="task 2" />
        <Arrow />
        <Box title="aggregate → gold" sub="task 3" accent />
      </div>
      <Caption><Lead>Runs itself.</Lead> Scheduled on an ephemeral job cluster, retries on failure, alerts on error — the same notebooks you wrote interactively, now a system that runs nightly without you.</Caption>
    </div>
  );
}

export const VISUALS: Record<string, React.FC> = {
  lakehouse: Lakehouse,
  cluster: Cluster,
  'spark-dag': SparkDag,
  'delta-table': DeltaTable,
  medallion: Medallion,
  'unity-catalog': UnityCatalog,
  'job-workflow': JobWorkflow,
};
