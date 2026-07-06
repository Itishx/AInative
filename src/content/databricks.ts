import type { LearnorContent } from '../lib/learnor';

// Launch course — hand-authored, Itish-directed. Follows the Learnor pattern:
// every section moves from an absolute definition → plain explanation →
// concrete example → visual where it helps → hands-on code. Visuals are
// inline SVG in ```svg fences (theme-aware via currentColor + --c-red).

export const databricks: LearnorContent = {
  title: 'Databricks — End to End',
  subject: 'Databricks',
  category: 'Data & AI',
  level: 'beginner',
  summary:
    'Go from "what even is a lakehouse" to building real ETL on Databricks — Spark, Delta Lake, notebooks, the medallion architecture, Unity Catalog, and jobs — with hands-on code the whole way.',
  sections: [
    {
      heading: 'What Databricks actually is',
      intent: 'Start from zero: the one-sentence definition and the problem it solves.',
      body: `> **Definition.** Databricks is a cloud platform for working with large amounts of data in one place — storing it, transforming it, analysing it, and training machine-learning models on it — built on top of **Apache Spark** and the **lakehouse** architecture.

Before Databricks, teams juggled two separate systems. A **data lake** (cheap cloud storage full of raw files) and a **data warehouse** (a fast, structured database for reporting). Data was copied back and forth between them, which was slow, expensive, and error-prone.

Databricks collapses those two into one. You keep all your data as cheap files in cloud storage, but you get warehouse-grade speed, reliability, and SQL on top of it. That combination is the **lakehouse**.

A concrete example: imagine a ride-hailing company. Raw GPS pings and app events land as files in cloud storage (the "lake" part). On Databricks, the same platform cleans those events, joins them into trip records, powers the analysts' dashboards, and trains the model that predicts surge pricing — no copying between systems.

\`\`\`svg
<svg viewBox="0 0 520 210" width="100%" style="max-width:520px;height:auto;font-family:monospace;font-size:11px">
  <text x="10" y="18" fill="currentColor" opacity="0.6">THE LAKEHOUSE, TOP TO BOTTOM</text>
  <g style="color:var(--c-red)"><rect x="10" y="30" width="500" height="34" rx="6" fill="currentColor" opacity="0.10" stroke="currentColor"/></g>
  <text x="24" y="51" fill="currentColor">BI &amp; dashboards  ·  Data science  ·  Machine learning</text>
  <rect x="10" y="74" width="500" height="34" rx="6" fill="currentColor" opacity="0.05" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="24" y="95" fill="currentColor">Apache Spark + Photon  —  the compute engine</text>
  <g style="color:var(--c-red)"><rect x="10" y="118" width="500" height="34" rx="6" fill="currentColor" opacity="0.10" stroke="currentColor"/></g>
  <text x="24" y="139" fill="currentColor">Delta Lake  —  reliability, ACID, time travel over files</text>
  <rect x="10" y="162" width="500" height="34" rx="6" fill="currentColor" opacity="0.05" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="24" y="183" fill="currentColor">Cloud object storage  —  cheap files (Parquet) on S3 / ADLS / GCS</text>
</svg>
\`\`\`

Read the stack bottom-up: cheap files at the base, a reliability layer (Delta) over them, a fast engine (Spark) over that, and every kind of workload — dashboards, notebooks, ML — sharing the exact same data at the top.`,
    },
    {
      heading: 'Lake vs warehouse vs lakehouse',
      intent: 'Place the lakehouse against the two things it replaces, so the value is obvious.',
      body: `Each approach makes a trade. A **data warehouse** is fast and trustworthy but expensive and rigid — it only holds neat, structured tables. A **data lake** is cheap and holds anything (images, JSON, logs) but has no guarantees: files can be half-written, schemas drift, and two jobs writing at once can corrupt each other.

> **Definition.** A *lakehouse* keeps the lake's cheap open storage but adds the warehouse's guarantees — transactions, schema enforcement, and fast SQL — through a metadata layer (Delta Lake).

| | Data warehouse | Data lake | **Lakehouse** |
|---|---|---|---|
| Storage cost | High | Low | **Low** |
| Data types | Structured only | Anything | **Anything** |
| Reliable writes (ACID) | Yes | No | **Yes** |
| Fast SQL / BI | Yes | No | **Yes** |
| Good for ML | Poor | Good | **Good** |
| Vendor lock-in | High | Low | **Low (open formats)** |

The punchline is the bottom of the table: because a lakehouse stores data in **open file formats** (Parquet), you are never locked in. The same files can be read by Spark, by other engines, or downloaded directly — unlike a warehouse where your data is trapped in a proprietary system.

For example, a startup that picked a lakehouse can let its analysts run SQL dashboards and its ML team train models on the *identical* tables, at storage prices, without buying a separate warehouse.`,
    },
    {
      heading: 'Your workspace: notebooks',
      intent: 'Get hands-on immediately — where you actually write and run code.',
      body: `> **Definition.** A *notebook* is an interactive document made of **cells**. Each cell holds a chunk of code you can run on its own, and its output (a table, a chart, a number) appears right below it.

Notebooks are where you'll spend most of your time on Databricks. Instead of writing a whole program and running it at the end, you run one cell, look at the result, adjust, and run the next — a tight feedback loop that's perfect for exploring data.

A single notebook can mix languages. By default a notebook has one language (say Python), but any cell can switch using a **magic command** — a line starting with \`%\`.

\`\`\`python
# A Python cell: load a sample dataset that ships with Databricks
df = spark.read.csv("/databricks-datasets/nyctaxi/tripdata/yellow", header=True)
df.show(5)   # print the first 5 rows
\`\`\`

\`\`\`sql
-- The very next cell, switched to SQL with a magic command
%sql
SELECT passenger_count, COUNT(*) AS trips
FROM samples.nyctaxi.trips
GROUP BY passenger_count
ORDER BY trips DESC;
\`\`\`

Useful magics you'll reach for constantly:

- \`%sql\` — run the cell as SQL
- \`%python\`, \`%scala\`, \`%r\` — switch language for one cell
- \`%md\` — write formatted notes in Markdown (like this)
- \`%fs\` — quick file-system commands, e.g. \`%fs ls /databricks-datasets\`
- \`%run ./other_notebook\` — run another notebook (reuse setup code)

The key mental model: a notebook cell doesn't run *on your laptop*. It runs on a **cluster** — a group of remote machines. That's what makes it possible to query billions of rows from the same little cell. Clusters are next.`,
    },
    {
      heading: 'Clusters & compute',
      intent: 'Explain the machines your code runs on — the single biggest source of beginner confusion.',
      body: `> **Definition.** A *cluster* is a set of cloud machines that run your code together. One machine is the **driver** (it coordinates), and the rest are **workers** (they do the heavy lifting in parallel).

When you run a cell, the driver splits the work into tasks and hands them to the workers. Ten workers can each crunch a tenth of your data at the same time — that parallelism is the whole reason big data is fast here.

\`\`\`svg
<svg viewBox="0 0 520 180" width="100%" style="max-width:520px;height:auto;font-family:monospace;font-size:11px">
  <g style="color:var(--c-red)"><rect x="200" y="14" width="120" height="40" rx="6" fill="currentColor" opacity="0.12" stroke="currentColor"/></g>
  <text x="228" y="38" fill="currentColor">DRIVER</text>
  <line x1="130" y1="90" x2="260" y2="54" stroke="currentColor" stroke-opacity="0.4"/>
  <line x1="260" y1="54" x2="260" y2="90" stroke="currentColor" stroke-opacity="0.4"/>
  <line x1="390" y1="90" x2="260" y2="54" stroke="currentColor" stroke-opacity="0.4"/>
  <g fill="currentColor" font-family="monospace">
    <rect x="80" y="90" width="100" height="40" rx="6" fill="currentColor" opacity="0.05" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="210" y="90" width="100" height="40" rx="6" fill="currentColor" opacity="0.05" stroke="currentColor" stroke-opacity="0.3"/>
    <rect x="340" y="90" width="100" height="40" rx="6" fill="currentColor" opacity="0.05" stroke="currentColor" stroke-opacity="0.3"/>
  </g>
  <text x="104" y="114" fill="currentColor">worker</text>
  <text x="234" y="114" fill="currentColor">worker</text>
  <text x="364" y="114" fill="currentColor">worker</text>
  <text x="80" y="160" fill="currentColor" opacity="0.6">driver splits work → workers run tasks in parallel → results return</text>
</svg>
\`\`\`

There are two kinds of clusters, and picking the wrong one wastes money:

- **All-purpose cluster** — interactive, stays on while you work in a notebook. Great for exploring; expensive if you forget to turn it off (so they auto-terminate after idle minutes).
- **Job cluster** — spun up automatically to run one scheduled job, then destroyed. Cheaper for production because you only pay while the job runs.

Two more terms you'll see:

> **Databricks Runtime** is the pre-packaged software on every cluster — a specific Spark version plus tuned libraries. **Photon** is Databricks' faster C++ query engine that can run underneath Spark SQL for big speedups.

**Serverless** compute takes this further: Databricks manages the machines entirely, so a SQL query or job starts in seconds with no cluster to configure. As a beginner, start a small all-purpose cluster (or serverless), attach your notebook to it, and you're ready.`,
    },
    {
      heading: 'Apache Spark, the engine',
      intent: 'Teach the engine model — DataFrames, lazy evaluation, actions — because it explains all later behaviour.',
      body: `> **Definition.** *Apache Spark* is the engine that runs your data work across the cluster. You mostly use it through the **DataFrame** — a table of rows and columns, spread in pieces (**partitions**) across the workers.

The single most important idea in Spark is **lazy evaluation**. When you write transformations — \`filter\`, \`select\`, \`join\`, \`groupBy\` — Spark does *not* run them. It just records your recipe as a plan. Nothing actually computes until you call an **action** — something that needs a real result, like \`show()\`, \`count()\`, or writing to a table.

\`\`\`svg
<svg viewBox="0 0 520 150" width="100%" style="max-width:520px;height:auto;font-family:monospace;font-size:11px">
  <text x="10" y="16" fill="currentColor" opacity="0.6">TRANSFORMATIONS (lazy — just a plan)</text>
  <rect x="10" y="26" width="90" height="30" rx="5" fill="currentColor" opacity="0.05" stroke="currentColor" stroke-opacity="0.3"/><text x="26" y="45" fill="currentColor">read</text>
  <rect x="120" y="26" width="90" height="30" rx="5" fill="currentColor" opacity="0.05" stroke="currentColor" stroke-opacity="0.3"/><text x="132" y="45" fill="currentColor">filter</text>
  <rect x="230" y="26" width="90" height="30" rx="5" fill="currentColor" opacity="0.05" stroke="currentColor" stroke-opacity="0.3"/><text x="238" y="45" fill="currentColor">groupBy</text>
  <line x1="100" y1="41" x2="120" y2="41" stroke="currentColor" stroke-opacity="0.4"/>
  <line x1="210" y1="41" x2="230" y2="41" stroke="currentColor" stroke-opacity="0.4"/>
  <line x1="320" y1="41" x2="360" y2="41" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="3 3"/>
  <g style="color:var(--c-red)"><rect x="360" y="26" width="150" height="30" rx="5" fill="currentColor" opacity="0.12" stroke="currentColor"/></g>
  <text x="374" y="45" fill="currentColor">.show()  ← ACTION</text>
  <text x="10" y="95" fill="currentColor" opacity="0.85">Only the action triggers real computation. Spark then optimises</text>
  <text x="10" y="112" fill="currentColor" opacity="0.85">the whole recipe at once (e.g. pushing the filter down first).</text>
</svg>
\`\`\`

Why this matters: because Spark sees your whole recipe before running it, it can **optimise** — for instance, applying a \`filter\` *before* an expensive \`join\` so it moves less data. You get that for free.

\`\`\`python
# Each line below is lazy — nothing runs yet
trips = spark.table("samples.nyctaxi.trips")
big = trips.filter("trip_distance > 10")          # transformation
by_day = big.groupBy("pickup_date").count()        # transformation

by_day.show()     # ACTION — now Spark actually reads, filters, groups
\`\`\`

A common beginner trap: wondering why a cell "did nothing." It's because you only wrote transformations. Add an action and the work happens. Partitions explain the speed — if \`trips\` is split into 200 partitions across the workers, the filter runs on all 200 pieces at once.`,
    },
    {
      heading: 'Delta Lake: reliability over files',
      intent: 'Explain the layer that turns fragile files into trustworthy tables — the heart of the lakehouse.',
      body: `> **Definition.** *Delta Lake* is a storage layer that sits on top of your Parquet files and adds a **transaction log** — a record of every change — giving plain files the guarantees of a database.

Raw files are fragile: if a job crashes mid-write, you're left with half a table. Delta fixes this with **ACID transactions**: a write either fully happens or not at all. It does this by keeping a folder called \`_delta_log\` next to your data. Every change appends a new entry describing exactly which files are now part of the table.

\`\`\`svg
<svg viewBox="0 0 520 170" width="100%" style="max-width:520px;height:auto;font-family:monospace;font-size:11px">
  <text x="10" y="16" fill="currentColor" opacity="0.6">A DELTA TABLE ON DISK</text>
  <rect x="10" y="28" width="240" height="120" rx="6" fill="currentColor" opacity="0.04" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="24" y="50" fill="currentColor" opacity="0.7">data files (Parquet)</text>
  <rect x="24" y="60" width="90" height="24" rx="4" fill="currentColor" opacity="0.08"/><text x="34" y="76" fill="currentColor">part-001</text>
  <rect x="124" y="60" width="90" height="24" rx="4" fill="currentColor" opacity="0.08"/><text x="134" y="76" fill="currentColor">part-002</text>
  <rect x="24" y="92" width="90" height="24" rx="4" fill="currentColor" opacity="0.08"/><text x="34" y="108" fill="currentColor">part-003</text>
  <g style="color:var(--c-red)">
  <rect x="270" y="28" width="240" height="120" rx="6" fill="currentColor" opacity="0.08" stroke="currentColor"/>
  <text x="284" y="50" fill="currentColor" opacity="0.85">_delta_log/</text>
  <text x="284" y="74" fill="currentColor">000.json → +part-001,002</text>
  <text x="284" y="96" fill="currentColor">001.json → +part-003</text>
  <text x="284" y="118" fill="currentColor">002.json → -part-001 (deleted)</text>
  </g>
</svg>
\`\`\`

Because every version is logged, you get superpowers ordinary files can't offer:

- **Time travel** — query the table as it was yesterday, or roll back a bad write.
- **Schema enforcement** — a write with the wrong columns is *rejected*, not silently corrupting the table.
- **Upserts (MERGE)** — update existing rows and insert new ones in one atomic step.

\`\`\`sql
%sql
-- Query the table as of an earlier version — impossible with plain files
SELECT * FROM my_trips VERSION AS OF 3;

-- Or as it looked at a point in time
SELECT * FROM my_trips TIMESTAMP AS OF '2024-01-01';
\`\`\`

Two maintenance commands you'll use: \`OPTIMIZE my_trips\` compacts many small files into fewer big ones (faster reads), and \`VACUUM my_trips\` deletes old unreferenced files to save storage. Every table you create on Databricks is a Delta table by default — this reliability is on automatically.`,
    },
    {
      heading: 'Reading and writing data',
      intent: 'Hands-on: get data in and out — the first thing you do in any real project.',
      body: `> **Definition.** *Reading* loads data into a DataFrame from a source (a file, a table, a stream); *writing* saves a DataFrame back out, usually as a Delta table.

You read with \`spark.read\` and write with \`df.write\`. The pattern is always: read → transform → write.

\`\`\`python
# READ a CSV of raw events into a DataFrame
raw = (spark.read
       .option("header", True)
       .option("inferSchema", True)
       .csv("/databricks-datasets/nyctaxi/tripdata/yellow"))

# WRITE it out as a managed Delta table you can query with SQL
raw.write.mode("overwrite").saveAsTable("bronze_trips")
\`\`\`

\`write.mode\` controls what happens if the table exists: \`"overwrite"\` replaces it, \`"append"\` adds rows. Once saved, that table is instantly queryable in any SQL cell — \`SELECT * FROM bronze_trips\`.

For files that keep arriving (new logs every hour), don't re-read everything each time. **Auto Loader** processes only the new files incrementally:

\`\`\`python
# Auto Loader — ingest only newly-arrived files, forever
stream = (spark.readStream
          .format("cloudFiles")
          .option("cloudFiles.format", "json")
          .load("/mnt/landing/events"))

(stream.writeStream
       .option("checkpointLocation", "/mnt/checkpoints/events")
       .toTable("bronze_events"))
\`\`\`

One storage concept to know: **DBFS** (Databricks File System) is a convenience layer that makes cloud storage paths look like normal folders (\`/mnt/...\`, \`/databricks-datasets/...\`). Under the hood it's still your S3/ADLS/GCS bucket — DBFS just gives it friendly paths.`,
    },
    {
      heading: 'Transforming data with PySpark and SQL',
      intent: 'The core skill: reshape data. Show the same job two ways so SQL and Python users both feel at home.',
      body: `> **Definition.** A *transformation* reshapes a DataFrame — selecting columns, filtering rows, aggregating, or joining tables — to move from raw data toward an answer.

The beauty of Databricks is that you can do this in **PySpark** (Python) or **SQL**, on the exact same tables, and mix freely. Here's the same task — average fare per passenger count — written both ways.

\`\`\`python
# PySpark
from pyspark.sql import functions as F

result = (spark.table("bronze_trips")
          .filter(F.col("fare_amount") > 0)
          .groupBy("passenger_count")
          .agg(F.avg("fare_amount").alias("avg_fare"))
          .orderBy("passenger_count"))
result.show()
\`\`\`

\`\`\`sql
%sql
-- Identical logic in SQL
SELECT passenger_count, AVG(fare_amount) AS avg_fare
FROM bronze_trips
WHERE fare_amount > 0
GROUP BY passenger_count
ORDER BY passenger_count;
\`\`\`

The building blocks map one-to-one between the two:

| Task | PySpark | SQL |
|---|---|---|
| Pick columns | \`.select("a", "b")\` | \`SELECT a, b\` |
| Filter rows | \`.filter(F.col("x") > 0)\` | \`WHERE x > 0\` |
| Aggregate | \`.groupBy(...).agg(...)\` | \`GROUP BY\` |
| Combine tables | \`.join(other, "id")\` | \`JOIN other USING (id)\` |
| Sort | \`.orderBy("x")\` | \`ORDER BY x\` |

A joining example — attach driver details to each trip:

\`\`\`python
trips = spark.table("bronze_trips")
drivers = spark.table("drivers")
enriched = trips.join(drivers, on="driver_id", how="left")
\`\`\`

Use whichever language fits the moment: SQL for quick aggregations and dashboards, PySpark when you need loops, functions, or ML libraries. They compile down to the same optimised Spark plan, so there's no performance difference.`,
    },
    {
      heading: 'The medallion architecture',
      intent: 'Give a repeatable blueprint for structuring any pipeline — the pattern real teams actually use.',
      body: `> **Definition.** The *medallion architecture* organises data into three quality tiers — **bronze**, **silver**, and **gold** — each table refining the one before it.

Rather than one giant messy transformation, you build a clean assembly line. Raw data comes in as bronze, gets cleaned into silver, and is aggregated into gold for consumption. Each layer is a Delta table.

\`\`\`svg
<svg viewBox="0 0 520 150" width="100%" style="max-width:520px;height:auto;font-family:monospace;font-size:11px">
  <rect x="10" y="40" width="150" height="60" rx="8" fill="currentColor" opacity="0.05" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="50" y="66" fill="currentColor" opacity="0.85">BRONZE</text>
  <text x="26" y="86" fill="currentColor" opacity="0.6">raw, as-ingested</text>
  <rect x="185" y="40" width="150" height="60" rx="8" fill="currentColor" opacity="0.05" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="228" y="66" fill="currentColor" opacity="0.85">SILVER</text>
  <text x="200" y="86" fill="currentColor" opacity="0.6">cleaned, joined</text>
  <g style="color:var(--c-red)"><rect x="360" y="40" width="150" height="60" rx="8" fill="currentColor" opacity="0.12" stroke="currentColor"/></g>
  <text x="404" y="66" fill="currentColor">GOLD</text>
  <text x="374" y="86" fill="currentColor" opacity="0.7">business-ready</text>
  <text x="168" y="74" fill="currentColor" opacity="0.5">→</text>
  <text x="343" y="74" fill="currentColor" opacity="0.5">→</text>
  <text x="10" y="130" fill="currentColor" opacity="0.6">clean once, reuse everywhere — dashboards &amp; ML read gold</text>
</svg>
\`\`\`

Walk it through with our trips example:

- **Bronze** — \`bronze_trips\`: the raw CSV loaded verbatim. Nothing dropped, so you always have the source of truth.
- **Silver** — \`silver_trips\`: bad rows removed (negative fares), types fixed, driver info joined. Trustworthy, granular.
- **Gold** — \`gold_daily_revenue\`: aggregated to what the business asks for, e.g. revenue per day per city. Small and fast for dashboards.

\`\`\`sql
%sql
-- Silver: clean the bronze layer
CREATE TABLE silver_trips AS
SELECT * FROM bronze_trips WHERE fare_amount > 0 AND trip_distance > 0;

-- Gold: aggregate silver for the dashboard
CREATE TABLE gold_daily_revenue AS
SELECT pickup_date, ROUND(SUM(fare_amount), 2) AS revenue
FROM silver_trips GROUP BY pickup_date;
\`\`\`

Why bother with three layers? Because when the dashboard looks wrong, you can trace the problem layer by layer — and because every team reads from clean gold instead of re-cleaning raw data ten different ways.`,
    },
    {
      heading: 'Unity Catalog & governance',
      intent: 'Explain how data is organised, secured, and shared — the piece that makes Databricks safe for a company.',
      body: `> **Definition.** *Unity Catalog* is Databricks' governance layer — a single place that names, organises, and controls access to every table, file, and model across all your workspaces.

Without governance, "who can see the salary table?" becomes a nightmare. Unity Catalog answers it with a clear three-level naming hierarchy and permissions you grant with plain SQL.

\`\`\`svg
<svg viewBox="0 0 520 165" width="100%" style="max-width:520px;height:auto;font-family:monospace;font-size:11px">
  <g style="color:var(--c-red)"><rect x="10" y="14" width="180" height="30" rx="5" fill="currentColor" opacity="0.10" stroke="currentColor"/></g>
  <text x="24" y="34" fill="currentColor">metastore (per region)</text>
  <line x1="30" y1="44" x2="30" y2="60" stroke="currentColor" stroke-opacity="0.4"/>
  <rect x="30" y="60" width="180" height="28" rx="5" fill="currentColor" opacity="0.05" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="44" y="79" fill="currentColor">catalog  (e.g. prod)</text>
  <line x1="50" y1="88" x2="50" y2="104" stroke="currentColor" stroke-opacity="0.4"/>
  <rect x="50" y="104" width="180" height="28" rx="5" fill="currentColor" opacity="0.05" stroke="currentColor" stroke-opacity="0.3"/>
  <text x="64" y="123" fill="currentColor">schema  (e.g. sales)</text>
  <line x1="70" y1="132" x2="70" y2="148" stroke="currentColor" stroke-opacity="0.4"/>
  <rect x="70" y="148" width="180" height="14" rx="4" fill="currentColor" opacity="0.08"/>
  <text x="300" y="112" fill="currentColor" opacity="0.85">full name:</text>
  <text x="300" y="132" fill="currentColor">prod.sales.trips</text>
</svg>
\`\`\`

The hierarchy is **catalog → schema → table**, so every table has a three-part name like \`prod.sales.trips\`. A **metastore** sits above catalogs and is shared across all the workspaces in a region, so one definition of a table is visible everywhere — no more copies drifting apart.

Permissions are just \`GRANT\` statements, like a database:

\`\`\`sql
%sql
GRANT SELECT ON TABLE prod.sales.trips TO \`analysts\`;
GRANT USAGE ON SCHEMA prod.sales TO \`analysts\`;
REVOKE SELECT ON TABLE prod.sales.salaries FROM \`analysts\`;
\`\`\`

Beyond access control, Unity Catalog also tracks **lineage** (which tables feed which — so you can see that \`gold_daily_revenue\` came from \`silver_trips\`), keeps an **audit log** of who queried what, and governs ML models and files under the same system. For a company, this is what turns a pile of tables into something safe to open up to hundreds of people.`,
    },
    {
      heading: 'Jobs, workflows & going to production',
      intent: 'Turn a notebook into something that runs itself — the leap from exploring to shipping.',
      body: `> **Definition.** A *job* (or *workflow*) is a scheduled, automated run of your notebooks or scripts — the same code you wrote interactively, now running on its own on a timetable.

Exploring in a notebook is step one. Production means it runs every night without you clicking anything. A **Workflow** lets you chain **tasks** (each task is a notebook or script) into a dependency graph, so bronze runs, then silver, then gold — in order, automatically.

\`\`\`svg
<svg viewBox="0 0 520 120" width="100%" style="max-width:520px;height:auto;font-family:monospace;font-size:11px">
  <rect x="10" y="40" width="110" height="40" rx="6" fill="currentColor" opacity="0.05" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="30" y="64" fill="currentColor">ingest→bronze</text>
  <rect x="170" y="40" width="110" height="40" rx="6" fill="currentColor" opacity="0.05" stroke="currentColor" stroke-opacity="0.35"/>
  <text x="188" y="64" fill="currentColor">clean→silver</text>
  <g style="color:var(--c-red)"><rect x="330" y="40" width="110" height="40" rx="6" fill="currentColor" opacity="0.12" stroke="currentColor"/></g>
  <text x="345" y="64" fill="currentColor">aggregate→gold</text>
  <line x1="120" y1="60" x2="170" y2="60" stroke="currentColor" stroke-opacity="0.5" marker-end=""/>
  <text x="140" y="55" fill="currentColor" opacity="0.6">→</text>
  <line x1="280" y1="60" x2="330" y2="60" stroke="currentColor" stroke-opacity="0.5"/>
  <text x="300" y="55" fill="currentColor" opacity="0.6">→</text>
  <text x="10" y="104" fill="currentColor" opacity="0.6">runs nightly on a job cluster · retries on failure · alerts on error</text>
</svg>
\`\`\`

You configure a job in the Workflows UI (or as code): pick the notebook, set the schedule (e.g. daily at 2am), choose a **job cluster** (created just for this run, then destroyed), and add alerts on failure. Tasks can depend on each other, retry automatically, and pass parameters.

For pure ETL, Databricks offers **Delta Live Tables (DLT)** — you declare the tables you want and the transformations between them, and DLT handles the orchestration, data-quality checks, and error recovery for you:

\`\`\`python
import dlt

@dlt.table
def silver_trips():
    return dlt.read("bronze_trips").filter("fare_amount > 0")
\`\`\`

That's the full arc: explore in a notebook, structure with medallion, then schedule it as a job or declare it as a DLT pipeline. Your interactive code becomes a system that runs itself.`,
    },
    {
      heading: 'Where to go next',
      intent: 'Consolidate and point at the natural next steps, including ML — so proficiency keeps compounding.',
      body: `You now have the whole spine of Databricks: the **lakehouse** idea, **notebooks** on **clusters**, **Spark** as the engine, **Delta Lake** for reliability, the **medallion** blueprint, **Unity Catalog** for governance, and **jobs** for production. That's genuinely enough to build a real pipeline end to end.

To turn this into working proficiency, build one small project entirely yourself: pick any dataset from \`/databricks-datasets\`, land it as bronze, clean it to silver, aggregate to gold, and schedule the whole thing as a nightly job. Doing it once cements everything above.

Three directions to grow from here:

- **Databricks SQL** — a dedicated SQL editor plus dashboards and alerts built for analysts, running on fast SQL warehouses. If your work is mostly reporting, live here.
- **Machine learning with MLflow** — Databricks includes **MLflow**, an open-source tool that tracks your experiments (parameters, metrics), packages models, and manages them from training to deployment. Because your features already live as Delta tables, training is a short hop.

\`\`\`python
import mlflow
with mlflow.start_run():
    mlflow.log_param("max_depth", 5)
    mlflow.log_metric("rmse", 3.1)
    # mlflow.sklearn.log_model(model, "model")
\`\`\`

- **Performance & cost** — learn \`OPTIMIZE\`/\`ZORDER\` for faster reads, right-size clusters, and prefer serverless or job clusters to avoid paying for idle machines.

The mental model to keep: **cheap open files at the bottom, reliability from Delta, one fast engine, and every workload — SQL, pipelines, ML — sharing the same governed data.** Everything in Databricks is a variation on that one theme.`,
    },
  ],
  quiz: [
    {
      q: 'In one line, what problem does the lakehouse architecture solve?',
      options: [
        'It combines the cheap open storage of a data lake with the reliability and fast SQL of a warehouse, in one system',
        'It makes data warehouses cheaper by compressing tables',
        'It replaces SQL entirely with Python',
        'It stores data only in memory for speed',
      ],
      correct: 0,
      why: 'The lakehouse keeps the lake\'s cheap open files but adds warehouse-grade ACID reliability and SQL on top — no copying between two systems.',
    },
    {
      q: 'On a cluster, what is the role of the driver?',
      options: [
        'It coordinates the work and splits it into tasks for the workers',
        'It stores all the data permanently',
        'It is the machine your web browser runs on',
        'It is a backup of the workers',
      ],
      correct: 0,
      why: 'The driver coordinates; the workers execute tasks in parallel. That parallelism across workers is what makes big-data processing fast.',
    },
    {
      q: 'You run a cell with .filter() and .groupBy() but see no output. Why?',
      options: [
        'Those are lazy transformations — nothing computes until you call an action like show() or count()',
        'The cluster is broken',
        'Spark only supports SQL, not Python methods',
        'The DataFrame was empty to begin with',
      ],
      correct: 0,
      why: 'Spark records transformations as a plan and only executes when an action forces a real result. Add show() and the work runs.',
    },
    {
      q: 'What does Delta Lake add on top of plain Parquet files?',
      options: [
        'A transaction log giving ACID writes, time travel, and schema enforcement',
        'A faster programming language',
        'Automatic machine-learning models',
        'A way to store data without any cost',
      ],
      correct: 0,
      why: 'Delta\'s _delta_log records every change, turning fragile files into a reliable table with transactions, versioning, and schema safety.',
    },
    {
      q: 'Which command lets you query a Delta table as it looked at an earlier version?',
      options: [
        'SELECT * FROM t VERSION AS OF 3',
        'SELECT PAST * FROM t',
        'ROLLBACK t TO 3',
        'SELECT * FROM t WHERE version = 3',
      ],
      correct: 0,
      why: 'Time travel uses VERSION AS OF (or TIMESTAMP AS OF) — a direct benefit of Delta logging every version of the table.',
    },
    {
      q: 'In the medallion architecture, what does the silver layer hold?',
      options: [
        'Cleaned and joined data — refined from raw bronze but not yet aggregated',
        'The raw, as-ingested data',
        'Final business aggregates for dashboards',
        'Deleted records only',
      ],
      correct: 0,
      why: 'Bronze is raw, silver is cleaned/joined/trustworthy, and gold is the business-ready aggregate. Silver is the middle refining step.',
    },
    {
      q: 'A table in Unity Catalog is named prod.sales.trips. What are the three parts?',
      options: [
        'catalog . schema . table',
        'workspace . user . file',
        'database . column . row',
        'region . cluster . job',
      ],
      correct: 0,
      why: 'Unity Catalog organises data as catalog → schema → table, so every table has a clear three-part name shared across workspaces.',
    },
    {
      q: 'Why use a job cluster instead of an all-purpose cluster for a scheduled pipeline?',
      options: [
        'It is created for the single run and destroyed after, so you only pay while the job runs',
        'It runs faster because it skips Spark',
        'It keeps running forever so the job never cold-starts',
        'It is the only cluster type that can read Delta tables',
      ],
      correct: 0,
      why: 'Job clusters are ephemeral — spun up per run and torn down after — which is cheaper for production than an always-on all-purpose cluster.',
    },
    {
      q: 'What is MLflow used for on Databricks?',
      options: [
        'Tracking ML experiments (params, metrics) and managing models from training to deployment',
        'Scheduling SQL dashboards',
        'Compressing Parquet files',
        'Granting table permissions',
      ],
      correct: 0,
      why: 'MLflow is the open-source experiment-tracking and model-management tool bundled with Databricks; it logs runs and packages models.',
    },
  ],
  exercises: [
    {
      title: 'Build a bronze → silver → gold pipeline',
      task: `Using the sample dataset \`samples.nyctaxi.trips\` (or any table you have), write three SQL cells that:

1. Create a **bronze** table that is a raw copy of the source.
2. Create a **silver** table that keeps only rows where \`fare_amount > 0\` and \`trip_distance > 0\`.
3. Create a **gold** table with total revenue per pickup date.

Write it so each layer reads from the one before it.`,
      solution: `\`\`\`sql
%sql
-- 1. Bronze: raw copy (source of truth)
CREATE OR REPLACE TABLE bronze_trips AS
SELECT * FROM samples.nyctaxi.trips;

-- 2. Silver: clean it — drop bad fares and zero-distance trips
CREATE OR REPLACE TABLE silver_trips AS
SELECT * FROM bronze_trips
WHERE fare_amount > 0 AND trip_distance > 0;

-- 3. Gold: aggregate for the dashboard
CREATE OR REPLACE TABLE gold_daily_revenue AS
SELECT DATE(tpep_pickup_datetime) AS pickup_date,
       ROUND(SUM(fare_amount), 2)  AS revenue,
       COUNT(*)                    AS trips
FROM silver_trips
GROUP BY DATE(tpep_pickup_datetime)
ORDER BY pickup_date;
\`\`\`

The key idea: each layer reads only from the layer below it, so if the gold numbers look wrong you can inspect silver, then bronze, to find where it broke. Column names may differ by dataset — adjust \`tpep_pickup_datetime\`/\`fare_amount\` to match yours.`,
    },
    {
      title: 'Same aggregation in PySpark and SQL',
      task: `Compute the **average trip distance per passenger count** from \`silver_trips\`, filtering out any rows where \`passenger_count\` is null. Write it **twice** — once in PySpark and once in SQL — and confirm they give the same result.`,
      solution: `\`\`\`python
# PySpark
from pyspark.sql import functions as F

result = (spark.table("silver_trips")
          .filter(F.col("passenger_count").isNotNull())
          .groupBy("passenger_count")
          .agg(F.avg("trip_distance").alias("avg_distance"))
          .orderBy("passenger_count"))
result.show()
\`\`\`

\`\`\`sql
%sql
-- Identical logic in SQL
SELECT passenger_count,
       AVG(trip_distance) AS avg_distance
FROM silver_trips
WHERE passenger_count IS NOT NULL
GROUP BY passenger_count
ORDER BY passenger_count;
\`\`\`

Both compile to the same optimised Spark plan, so the output matches exactly. Use SQL for quick aggregates and dashboards; reach for PySpark when you need functions, loops, or ML libraries. Mixing them on the same tables is completely normal.`,
    },
    {
      title: 'Use Delta time travel to recover from a mistake',
      task: `You accidentally overwrote \`silver_trips\` with an empty result. Explain (with SQL) how you would (a) inspect the table's history, (b) see what the previous version contained, and (c) restore it.`,
      solution: `\`\`\`sql
%sql
-- (a) Look at the change history — every version is logged
DESCRIBE HISTORY silver_trips;
-- returns a version number + timestamp for each write

-- (b) Inspect the previous good version (say it was version 4)
SELECT COUNT(*) FROM silver_trips VERSION AS OF 4;

-- (c) Restore the table to that version
RESTORE TABLE silver_trips TO VERSION AS OF 4;
\`\`\`

This works because Delta keeps a transaction log of every version rather than overwriting in place. \`DESCRIBE HISTORY\` shows you the versions, \`VERSION AS OF\` lets you read any of them, and \`RESTORE\` rolls the table back atomically. With plain Parquet files, that empty overwrite would have been unrecoverable — this is exactly why Delta is the backbone of the lakehouse.`,
    },
  ],
};
