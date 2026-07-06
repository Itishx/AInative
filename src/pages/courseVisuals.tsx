// Hand-crafted course diagrams — the visual bar from the study-notes PDF:
// filled, colour-coded nodes with real arrow connectors, hierarchy trees, and
// nested architecture panels (not just boxes + text arrows). Referenced from
// course markdown via a ```viz <id> fence. Register new diagrams in VISUALS.

import React from 'react';

const SANS = '"Inter", -apple-system, system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';

// Node palette — self-coloured, so diagrams read identically in light & dark.
const P = {
  deep: '#173b46', teal: '#0e7c74', green: '#1f7a43', slate: '#3a4656',
  bronze: '#9c6b3f', silver: '#67717f', gold: '#b3893a', red: '#b3372f',
  amber: '#b7791f', indigo: '#3f4a7a',
};
const EDGE = '#9a948a';
const LT = '#f6f2e9';
const LSUB = 'rgba(246,242,233,0.62)';
const DINK = '#221d17';
const DSUB = 'rgba(34,29,23,0.55)';

// Theme-aware wrappers (inherit --c-* from the page).
const ink = 'var(--c-ink)';
const mute = 'var(--c-mute)';
const faint = 'var(--c-faint)';
const softer = 'var(--c-softer)';
const paper = 'var(--c-paper)';
const red = 'var(--c-red)';

const card: React.CSSProperties = { border: `1px solid ${faint}`, borderRadius: 16, background: paper, padding: '22px 20px' };

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: mute, marginBottom: 14, textAlign: 'center' }}>{children}</div>;
}
function Caption({ children }: { children: React.ReactNode }) {
  return <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${faint}`, fontFamily: SANS, fontSize: 12.5, lineHeight: 1.6, color: mute, textAlign: 'center' }}>{children}</div>;
}
function Lead({ children }: { children: React.ReactNode }) {
  return <b style={{ color: red, fontWeight: 700 }}>{children}</b>;
}

// ── SVG primitives ────────────────────────────────────────────────────────────
function Node({ x, y, w = 150, h = 46, fill, label, sub, light, rx = 10 }: {
  x: number; y: number; w?: number; h?: number; fill: string; label: string; sub?: string; light?: boolean; rx?: number;
}) {
  const tc = light ? DINK : LT;
  const sc = light ? DSUB : LSUB;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={light ? EDGE : 'none'} strokeWidth={light ? 1 : 0} />
      <text x={x + w / 2} y={y + h / 2 + (sub ? -3 : 1)} textAnchor="middle" dominantBaseline="middle" fontFamily={SANS} fontSize="12.5" fontWeight="700" fill={tc}>{label}</text>
      {sub && <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontSize="8" fill={sc}>{sub}</text>}
    </g>
  );
}
function Edge({ x1, y1, x2, y2, mid, dashed }: { x1: number; y1: number; x2: number; y2: number; mid: string; dashed?: boolean }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={EDGE} strokeWidth={1.6} strokeDasharray={dashed ? '4 3' : undefined} markerEnd={`url(#${mid})`} />;
}
function Svg({ id, h, children }: { id: string; h: number; children: React.ReactNode }) {
  return (
    <svg viewBox={`0 0 640 ${h}`} width="100%" style={{ maxWidth: 600, height: 'auto', display: 'block', margin: '0 auto' }}>
      <defs>
        <marker id={`${id}-ah`} markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto-start-reverse">
          <path d="M1,1.5 L8,5 L1,8.5 Z" fill={EDGE} />
        </marker>
      </defs>
      {children}
    </svg>
  );
}

// ── 1. Lakehouse stack ────────────────────────────────────────────────────────
export function Lakehouse() {
  const layers = [
    { fill: P.teal, label: 'BI · Data science · Machine learning', sub: 'every workload, one copy of data' },
    { fill: P.slate, label: 'Apache Spark  +  Photon', sub: 'the compute engine' },
    { fill: P.green, label: 'Delta Lake', sub: 'ACID · time travel · schema enforcement' },
    { fill: P.deep, label: 'Cloud object storage', sub: 'cheap Parquet on S3 / ADLS / GCS' },
  ];
  return (
    <div style={card}>
      <Label>The lakehouse, top to bottom</Label>
      <Svg id="lh" h={252}>
        {layers.map((l, i) => (
          <Node key={i} x={20} y={14 + i * 60} w={600} h={50} fill={l.fill} label={l.label} sub={l.sub} />
        ))}
      </Svg>
      <Caption><Lead>Read it bottom-up.</Lead> Cheap files at the base, a reliability layer over them, one fast engine, and every workload sharing the exact same data — no copies.</Caption>
    </div>
  );
}

// ── 2. Cluster: driver + workers ──────────────────────────────────────────────
export function Cluster() {
  const workers = [40, 250, 460];
  return (
    <div style={card}>
      <Label>One cluster = a driver + workers</Label>
      <Svg id="cl" h={188}>
        <Node x={245} y={14} w={150} h={48} fill={P.teal} label="DRIVER" sub="coordinates · splits work" />
        {workers.map((x) => <Edge key={x} x1={320} y1={62} x2={x + 70} y2={116} mid="cl-ah" />)}
        {workers.map((x) => <Node key={x} x={x} y={116} w={140} h={48} fill={P.slate} label="worker" sub="runs tasks" />)}
      </Svg>
      <Caption><Lead>Parallelism is the point.</Lead> The driver splits your job into tasks; ten workers each crunch a tenth of the data at once. That&apos;s why big data is fast here.</Caption>
    </div>
  );
}

// ── 3. Spark lazy DAG ─────────────────────────────────────────────────────────
export function SparkDag() {
  return (
    <div style={card}>
      <Label>Transformations are lazy · the action runs it</Label>
      <Svg id="sd" h={118}>
        <text x={200} y={20} textAnchor="middle" fontFamily={MONO} fontSize="9" fill={EDGE}>◄─────  lazy plan  ─────►</text>
        <Node x={14} y={40} w={120} h={48} fill={P.slate} label="read" sub="transform" />
        <Node x={170} y={40} w={120} h={48} fill={P.slate} label="filter" sub="transform" />
        <Node x={326} y={40} w={120} h={48} fill={P.slate} label="groupBy" sub="transform" />
        <Node x={482} y={40} w={144} h={48} fill={P.red} label=".show()" sub="ACTION — runs now" />
        <Edge x1={134} y1={64} x2={170} y2={64} mid="sd-ah" />
        <Edge x1={290} y1={64} x2={326} y2={64} mid="sd-ah" />
        <Edge x1={446} y1={64} x2={482} y2={64} mid="sd-ah" dashed />
      </Svg>
      <Caption><Lead>Nothing computes until the action.</Lead> Because Spark sees the whole recipe first, it optimises — e.g. pushing the filter down before the group. A cell with only transformations looks like it &quot;did nothing.&quot;</Caption>
    </div>
  );
}

// ── 4. Delta table on disk (log + data files) ────────────────────────────────
const TERM = '#100e0b';
const TERM_MUTE = 'rgba(243,238,226,0.46)';
function Commit({ file, note, tone }: { file: string; note: string; tone?: 'green' | 'mute' }) {
  return (
    <div style={{ background: 'rgba(243,238,226,0.05)', borderRadius: 6, padding: '6px 9px', fontFamily: MONO, fontSize: 10.5, color: tone === 'green' ? '#8fbf7f' : '#f3eee2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
        <div style={{ flex: '1 1 240px', minWidth: 0, background: TERM, borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(243,238,226,0.1)' }}>
          <div style={{ fontFamily: MONO, fontSize: 12, color: '#e0714f', fontWeight: 600 }}>_delta_log/</div>
          <div style={{ fontFamily: MONO, fontSize: 8.5, color: TERM_MUTE, marginTop: 3, marginBottom: 12 }}>the transaction log = source of truth</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Commit file="000…000.json" note="add A, B" />
            <Commit file="000…001.json" note="remove A, add C" />
            <Commit file="000…002.json" note="MERGE / upsert" />
            <Commit file="…010.checkpoint" note="parquet" tone="green" />
          </div>
          <div style={{ fontFamily: MONO, fontSize: 8.5, color: TERM_MUTE, marginTop: 12 }}>each commit is atomic → ACID</div>
        </div>
        <div style={{ flex: '1 1 240px', minWidth: 0, background: softer, borderRadius: 12, padding: '14px 16px', border: `1px solid ${faint}` }}>
          <div style={{ fontFamily: MONO, fontSize: 12, color: ink, fontWeight: 600, marginBottom: 12 }}>data files (Parquet)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {['part-0000-….snappy.parquet', 'part-0001-….snappy.parquet'].map((f) => (
              <div key={f} style={{ border: `1px solid ${faint}`, borderRadius: 6, padding: '6px 9px', fontFamily: MONO, fontSize: 10.5, color: ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f}</div>
            ))}
            <div style={{ border: `1px solid ${faint}`, borderRadius: 6, padding: '6px 9px', fontFamily: MONO, fontSize: 10.5, color: mute, textDecoration: 'line-through', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>part-0002 (tombstoned)</div>
          </div>
          <div style={{ fontFamily: MONO, fontSize: 8.5, color: mute, marginTop: 12 }}>immutable · kept for time travel until VACUUM</div>
        </div>
      </div>
      <Caption><Lead>Delta = Parquet + a transaction log.</Lead> Writes never edit a file in place; they add new files and record add/remove in the log. That log powers ACID, time travel, and streaming.</Caption>
    </div>
  );
}

// ── 5. Medallion architecture ─────────────────────────────────────────────────
export function Medallion() {
  return (
    <div style={card}>
      <Label>One clean assembly line</Label>
      <Svg id="md" h={96}>
        <Node x={20} y={22} w={172} h={54} fill={P.bronze} label="BRONZE" sub="raw, as-ingested" />
        <Node x={234} y={22} w={172} h={54} fill={P.silver} label="SILVER" sub="cleaned, joined, typed" />
        <Node x={448} y={22} w={172} h={54} fill={P.gold} label="GOLD" sub="business-ready aggregates" />
        <Edge x1={192} y1={49} x2={234} y2={49} mid="md-ah" />
        <Edge x1={406} y1={49} x2={448} y2={49} mid="md-ah" />
      </Svg>
      <Caption><Lead>Clean once, reuse everywhere.</Lead> Each layer refines the one before it — trace a bad dashboard number layer by layer, and every team reads the same trustworthy gold.</Caption>
    </div>
  );
}

// ── 6. Unity Catalog object hierarchy (tree) ─────────────────────────────────
export function UnityCatalog() {
  const leaves = [
    { x: 12, label: 'Tables / Views' },
    { x: 138, label: 'Volumes' },
    { x: 264, label: 'Functions', sub: 'UDFs' },
    { x: 390, label: 'Models' },
    { x: 516, label: 'Ext. locations' },
  ];
  return (
    <div style={card}>
      <Label>The object hierarchy</Label>
      <Svg id="uc" h={300}>
        <Node x={235} y={14} w={170} h={48} fill={P.deep} label="Metastore" sub="top of the tree · per region" />
        <Edge x1={320} y1={62} x2={320} y2={92} mid="uc-ah" />
        <Node x={235} y={92} w={170} h={44} fill={P.teal} label="Catalog" sub="e.g. prod" />
        <Edge x1={320} y1={136} x2={320} y2={166} mid="uc-ah" />
        <Node x={225} y={166} w={190} h={44} fill={P.green} label="Schema (database)" sub="e.g. sales" />
        {leaves.map((l) => <Edge key={l.x} x1={320} y1={210} x2={l.x + 56} y2={240} mid="uc-ah" />)}
        {leaves.map((l) => <Node key={l.x} x={l.x} y={240} w={112} h={44} fill="#ece7db" light label={l.label} sub={l.sub} />)}
      </Svg>
      <Caption><Lead>Metastore → catalog → schema → objects.</Lead> The middle three levels are what you write as <code style={{ fontFamily: MONO, background: softer, padding: '1px 5px', borderRadius: 4 }}>catalog.schema.table</code>. Volumes govern non-tabular files.</Caption>
    </div>
  );
}

// ── 7. Control plane vs compute plane (nested panels) ────────────────────────
function PlaneChip({ title, sub, dark }: { title: string; sub: string; dark?: boolean }) {
  return (
    <div style={{ flex: '1 1 120px', minWidth: 0, borderRadius: 8, padding: '10px 12px', textAlign: 'center', background: dark ? 'rgba(246,242,233,0.06)' : softer, border: `1px solid ${dark ? 'rgba(246,242,233,0.12)' : faint}` }}>
      <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: dark ? LT : ink }}>{title}</div>
      <div style={{ fontFamily: MONO, fontSize: 8, color: dark ? LSUB : mute, marginTop: 3 }}>{sub}</div>
    </div>
  );
}
export function ControlCompute() {
  return (
    <div style={card}>
      <div style={{ background: P.deep, borderRadius: 12, padding: 16 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5ec8bb', marginBottom: 3 }}>Control plane</div>
        <div style={{ fontFamily: MONO, fontSize: 8.5, color: LSUB, marginBottom: 12 }}>managed by Databricks · your data never lives here</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <PlaneChip dark title="Web app + notebooks" sub="the UI" />
          <PlaneChip dark title="Job scheduler" sub="Lakeflow Jobs" />
          <PlaneChip dark title="Cluster manager" sub="launch / config" />
          <PlaneChip dark title="Unity Catalog" sub="metadata" />
        </div>
      </div>
      <div style={{ textAlign: 'center', color: red, fontFamily: MONO, fontSize: 18, lineHeight: 1, margin: '6px 0' }}>↓</div>
      <div style={{ border: `1.5px solid ${P.teal}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: P.teal, marginBottom: 3 }}>Compute plane</div>
        <div style={{ fontFamily: MONO, fontSize: 8.5, color: mute, marginBottom: 12 }}>in your cloud account · where data is processed</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <PlaneChip title="Driver + workers" sub="the Spark cluster" />
          <PlaneChip title="Object storage" sub="S3 / ADLS / GCS" />
          <PlaneChip title="DBFS / Volumes" sub="file access" />
        </div>
      </div>
      <Caption><Lead>Your data never leaves your cloud.</Lead> Only metadata and orchestration signals flow through the control plane — the &quot;separation of storage and compute&quot; that makes the lakehouse elastic.</Caption>
    </div>
  );
}

// ── 8. Lakeflow pipeline (streaming ETL with expectations) ───────────────────
export function Pipeline() {
  return (
    <div style={card}>
      <Label>A declarative pipeline · you declare tables, it runs the DAG</Label>
      <Svg id="pl" h={130}>
        <Node x={14} y={40} w={168} h={50} fill={P.bronze} label="bronze_events" sub="STREAMING TABLE · raw" />
        <Node x={236} y={40} w={168} h={50} fill={P.silver} label="silver_events" sub="EXPECT valid rows" />
        <Node x={458} y={40} w={168} h={50} fill={P.gold} label="daily_rollup" sub="MATERIALIZED VIEW" />
        <Edge x1={182} y1={65} x2={236} y2={65} mid="pl-ah" />
        <Edge x1={404} y1={65} x2={458} y2={65} mid="pl-ah" />
        <text x={320} y={112} textAnchor="middle" fontFamily={MONO} fontSize="8.5" fill={EDGE}>expectations drop / fail bad rows before they reach silver</text>
      </Svg>
      <Caption><Lead>Declare the tables you want.</Lead> The framework figures out dependencies, order, incremental processing, and recovery — you never hand-write the orchestration.</Caption>
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
  'control-compute': ControlCompute,
  pipeline: Pipeline,
  // Back-compat alias — the earlier course referenced a job workflow.
  'job-workflow': Pipeline,
};
