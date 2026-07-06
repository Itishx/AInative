import type { LearnorContent } from '../lib/learnor';

// Launch course — hand-authored, Itish-directed. Follows the Learnor pattern:
// every section moves from an absolute definition → plain explanation → concrete
// example → visual where it helps → hands-on code, and goes deep enough to build
// real proficiency. Diagrams are ```viz <id> fences (see courseVisuals.tsx);
// coloured callouts use `> [!star] …`, `> [!tech] …`, `> [!tip] …`.

export const databricks: LearnorContent = {
  title: 'Databricks — End to End',
  subject: 'Databricks',
  category: 'Data & AI',
  level: 'beginner',
  summary:
    'From "what even is a lakehouse" to building production ETL on Databricks — the platform architecture, Spark, Delta Lake internals, ingestion, transforms on nested data, the medallion pattern, Unity Catalog governance, and declarative pipelines & jobs — hands-on the whole way.',
  sections: [
    {
      heading: 'What Databricks is & how it is built',
      intent: 'Start from zero: the one-line definition, the problem it solves, and the one architecture fact everything rests on.',
      body: `> **Definition.** Databricks is a unified **Data Intelligence Platform** for working with large amounts of data in one place — storing it, transforming it, analysing it, and training ML models on it — built on **Apache Spark**, **Delta Lake**, and the **lakehouse** architecture.

Before Databricks, teams ran two separate systems. A **data lake** — cheap cloud storage full of raw files — and a **data warehouse** — a fast, structured database for reporting. Data was copied back and forth, which was slow, expensive, and drifted out of sync.

Databricks collapses those two into one. You keep all your data as cheap open files in cloud storage, but get warehouse-grade speed, reliability, and SQL on top. That combination is the **lakehouse**.

\`\`\`viz lakehouse
\`\`\`

## The concrete picture

Imagine a ride-hailing company. Raw GPS pings and app events land as files in cloud storage (the "lake"). On Databricks the *same* platform cleans those events, joins them into trip records, powers the analysts' dashboards, and trains the surge-pricing model — with no copying between systems.

## Control plane vs compute plane

The single most important architecture fact: Databricks splits into a **control plane** (managed by Databricks) and a **compute plane** (in *your* cloud account, where data is actually processed).

\`\`\`viz control-compute
\`\`\`

> [!star] Your data never leaves your cloud account. Only metadata and orchestration signals flow through the control plane — the web app, the job scheduler, and Unity Catalog. Your clusters, storage, and the data itself live in the compute plane. This "separation of storage and compute" is what lets you scale compute up and down without moving data.

Everything else in this course is a variation on one theme: **cheap open files at the bottom, reliability from Delta, one fast engine, and every workload — SQL, pipelines, ML — sharing the same governed data.**`,
    },
    {
      heading: 'Lake vs warehouse vs lakehouse',
      intent: 'Place the lakehouse against the two things it replaces, so its value is obvious and precise.',
      body: `Each older approach makes a hard trade. A **warehouse** is fast and trustworthy but expensive and rigid — it only holds neat, structured tables, and your data is locked in a proprietary format. A **lake** is cheap and holds anything (images, JSON, logs) but has no guarantees: files can be half-written, schemas drift, and two jobs writing at once corrupt each other.

> **Definition.** A *lakehouse* keeps the lake's cheap, open storage but adds the warehouse's guarantees — ACID transactions, schema enforcement, and fast SQL — through a metadata layer (Delta Lake) laid over ordinary files.

| Property | Data warehouse | Data lake | **Lakehouse** |
|---|---|---|---|
| Storage cost | High | Low | **Low** |
| Data types | Structured only | Anything | **Anything** |
| Reliable writes (ACID) | Yes | No | **Yes** |
| Fast SQL / BI | Yes | No | **Yes** |
| Good for ML | Poor | Good | **Good** |
| Open format (no lock-in) | No | Yes | **Yes** |

The decisive row is the last one. Because a lakehouse stores data in **open formats** (Parquet + the Delta log), you are never locked in — the same files can be read by Spark, by other engines, or downloaded directly. A warehouse traps your data inside a proprietary system.

> [!tip] When someone asks "is Databricks a database?" — no. It's a platform that makes cheap files in *your* cloud storage behave like a fast, reliable, governed database, without ever locking the data inside a proprietary box.

For example, a startup on a lakehouse lets analysts run SQL dashboards and its ML team train models on the *identical* tables, at storage prices, without buying a separate warehouse or copying anything.`,
    },
    {
      heading: 'Your workspace: notebooks',
      intent: 'Get hands-on immediately — where you actually write and run code, and the mental model that trips up beginners.',
      body: `> **Definition.** A *notebook* is an interactive document made of **cells**. Each cell holds a chunk of code you can run on its own; its output — a table, a chart, a number — appears right below it.

Notebooks are where you'll spend most of your time. Instead of writing a whole program and running it at the end, you run one cell, look at the result, adjust, and run the next — a tight feedback loop that's ideal for exploring data.

## Mixing languages with magic commands

A notebook has one default language, but any cell can switch with a **magic command** — a line starting with \`%\`.

\`\`\`python
# A Python cell — load a sample dataset that ships with Databricks
df = spark.read.csv("/databricks-datasets/nyctaxi/tripdata/yellow", header=True)
df.show(5)                       # first 5 rows
print(df.count(), "rows loaded") # an action → triggers real work
\`\`\`

\`\`\`sql
-- The next cell, switched to SQL with a magic command
%sql
SELECT passenger_count, COUNT(*) AS trips
FROM samples.nyctaxi.trips
GROUP BY passenger_count
ORDER BY trips DESC;
\`\`\`

Magics you'll reach for constantly:

- \`%sql\` · \`%python\` · \`%scala\` · \`%r\` — run one cell in that language
- \`%md\` — write formatted notes in Markdown
- \`%fs\` — quick file-system commands, e.g. \`%fs ls /databricks-datasets\`
- \`%run ./setup\` — run another notebook (reuse shared setup)
- \`dbutils\` — a Python helper: \`dbutils.fs.ls(...)\`, \`dbutils.widgets\` (parameters), \`dbutils.secrets\` (credentials)

> [!star] A notebook cell does not run on your laptop. It runs on a **cluster** — a group of remote machines. That's what lets a two-line cell query billions of rows. If a notebook isn't attached to a running cluster, nothing executes.

Clusters are next — they're the biggest source of early confusion, and understanding them explains your bill.`,
    },
    {
      heading: 'Clusters & compute',
      intent: 'Explain the machines your code runs on, the two families, and how to not waste money.',
      body: `> **Definition.** A *cluster* is a set of cloud machines that run your code together: one **driver** (coordinates) and zero-to-many **workers** (do the heavy lifting in parallel).

When you run a cell, the driver splits the work into tasks and hands them to the workers. Ten workers can each crunch a tenth of your data at once — that parallelism is the whole reason big data is fast here.

\`\`\`viz cluster
\`\`\`

## Two families — pick the right one

| | All-purpose (interactive) | Job compute |
|---|---|---|
| Created | Manually, by you | Automatically, by a job |
| Lifetime | Persists until you stop it | Terminates when the job ends |
| Use | Interactive dev in notebooks | Scheduled, automated runs |
| Cost | Pricey if left running | Cheaper per run |

> [!star] The classic cost mistake is leaving an all-purpose cluster running overnight. Always set **auto-termination** (idle timeout), and use **job compute** for anything scheduled — it exists only for that run.

## The knobs that matter

- **Single-node vs multi-node** — a single machine for small data; multi-node to parallelise.
- **Autoscaling** — set a min/max worker count and Databricks adds/removes workers with load.
- **Databricks Runtime (DBR)** — the pre-packaged software on the cluster: a specific Spark version plus tuned libraries. Pick an **LTS** version for stability.
- **Photon** — Databricks' vectorised C++ engine that runs underneath Spark SQL for large speedups; toggle it on.

> [!tip] **Serverless** compute takes this further: Databricks manages the machines entirely, so a SQL query or job starts in seconds with no cluster to size. As a beginner, start with serverless (or a small auto-terminating all-purpose cluster), attach your notebook, and you're ready.`,
    },
    {
      heading: 'Apache Spark, the engine',
      intent: 'Teach the engine model — DataFrames, lazy evaluation, actions, partitions — because it explains all later behaviour and performance.',
      body: `> **Definition.** *Apache Spark* is the engine that runs your data work across the cluster. You mostly use it through the **DataFrame** — a table of rows and columns, split into **partitions** spread across the workers.

## Lazy evaluation — the one idea to internalise

When you write transformations — \`filter\`, \`select\`, \`join\`, \`groupBy\` — Spark does **not** run them. It records your recipe as a plan. Nothing computes until you call an **action** — something that needs a real result, like \`show()\`, \`count()\`, \`collect()\`, or writing to a table.

\`\`\`viz spark-dag
\`\`\`

Because Spark sees the whole recipe before running it, it **optimises** — for example pushing a \`filter\` down before an expensive \`join\` so less data moves. You get that for free.

| Transformations (lazy) | Actions (run now) |
|---|---|
| \`select\`, \`filter\`, \`withColumn\` | \`show\`, \`count\`, \`collect\` |
| \`groupBy\`, \`join\`, \`orderBy\` | \`write\`, \`save\`, \`toPandas\` |
| return another DataFrame | return a value or side-effect |

\`\`\`python
trips = spark.table("samples.nyctaxi.trips")
big   = trips.filter("trip_distance > 10")     # transformation — nothing runs
by_day = big.groupBy("pickup_date").count()    # transformation — still nothing
by_day.show()                                  # ACTION — now Spark reads, filters, groups
\`\`\`

> [!star] The most common beginner "bug" is a cell that seems to do nothing. It ran fine — you only wrote transformations. Add an action and the work happens.

## Partitions & shuffles — why some jobs are slow

Data is split into partitions; each worker processes some. **Narrow** transformations (\`filter\`, \`select\`) work partition-by-partition — cheap. **Wide** transformations (\`groupBy\`, \`join\`, \`orderBy\`) need a **shuffle** — moving data across the network to regroup it — which is the expensive part of most jobs.

> [!tech] If a job is slow, suspect the shuffle. Reduce it by filtering *early*, joining on well-distributed keys, and avoiding \`collect()\` on large data (it pulls everything to the driver and can crash it).`,
    },
    {
      heading: 'Delta Lake: reliability over files',
      intent: 'Explain the layer that turns fragile files into trustworthy tables — the heart of the lakehouse — and the ops you must know.',
      body: `> **Definition.** *Delta Lake* is a storage layer over your Parquet files that adds a **transaction log** — an ordered record of every change — giving plain files the guarantees of a database. Every table you create on Databricks is a Delta table by default.

Raw files are fragile: if a job crashes mid-write you're left with half a table. Delta fixes this with **ACID transactions** — a write either fully happens or not at all — by keeping a \`_delta_log\` folder next to the data. Each change appends a JSON commit listing exactly which files now make up the table (with periodic Parquet checkpoints so reads stay fast).

\`\`\`viz delta-table
\`\`\`

## What the log buys you

- **Time travel** — query the table as it was at any past version, or roll back a bad write.
- **Schema enforcement** — a write with the wrong columns is *rejected*, not silently corrupting the table.
- **MERGE (upsert)** — update existing rows and insert new ones in one atomic step.

\`\`\`sql
%sql
-- Time travel — impossible with plain files
SELECT * FROM my_trips VERSION AS OF 3;
SELECT * FROM my_trips TIMESTAMP AS OF '2024-01-01';

-- Upsert new/changed rows in one atomic operation
MERGE INTO target t USING updates u ON t.id = u.id
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;
\`\`\`

## Maintenance you're expected to know

| Command | What it does |
|---|---|
| \`OPTIMIZE t\` | Compacts many small files into fewer big ones — faster reads |
| \`OPTIMIZE t ZORDER BY (col)\` | Co-locates related data so queries skip more files |
| \`VACUUM t\` | Deletes old unreferenced files (default 7-day retention) |
| \`DESCRIBE HISTORY t\` | Shows every version + who changed it |

> [!tech] \`VACUUM\` is irreversible past its retention window — it removes the older files time travel relies on. Don't lower the retention below your recovery needs. Writes never mutate a file in place; they add new files and tombstone old ones, which is exactly why time travel works.`,
    },
    {
      heading: 'Getting data in',
      intent: 'Hands-on ingestion: query files directly, read into tables, and load new files incrementally.',
      body: `> **Definition.** *Ingestion* is getting raw data into the lakehouse — usually landing it as a **bronze** Delta table you can then refine.

## Query a file path directly

You can treat a path like a table with the **format-prefix** syntax (a format name before a backtick-quoted path), or the newer unified \`read_files()\`.

\`\`\`sql
%sql
-- format-prefix syntax (self-describing formats only: json, parquet)
SELECT * FROM json.\`/Volumes/main/raw/events\`;
SELECT * FROM parquet.\`/Volumes/main/raw/p\`;

-- read_files(): unified, supports CSV headers, options, schema inference
SELECT * FROM read_files('/Volumes/main/raw/x', format => 'csv', header => true);
\`\`\`

> [!tech] The format-prefix trick on a CSV path gives you a single unparsed column — CSV isn't self-describing, so it can't handle headers. Use \`read_files()\` (or \`CREATE TABLE … USING CSV OPTIONS\`) for delimited data.

## Read into a DataFrame, write a Delta table

\`\`\`python
raw = (spark.read
       .option("header", True)
       .option("inferSchema", True)
       .csv("/databricks-datasets/nyctaxi/tripdata/yellow"))

raw.write.mode("overwrite").saveAsTable("bronze_trips")   # now queryable in SQL
\`\`\`

\`mode\` controls existing tables: \`"overwrite"\` replaces, \`"append"\` adds rows.

## Files that keep arriving: Auto Loader vs COPY INTO

For continuously arriving files, don't re-read everything. **Auto Loader** ingests only new files incrementally, tracking what it's seen with a checkpoint.

\`\`\`python
stream = (spark.readStream.format("cloudFiles")
          .option("cloudFiles.format", "json")
          .load("/mnt/landing/events"))
(stream.writeStream
       .option("checkpointLocation", "/mnt/checkpoints/events")
       .toTable("bronze_events"))
\`\`\`

> [!star] **Auto Loader vs COPY INTO** — both are incremental. Choose **Auto Loader** for millions of files / continuous arrival (checkpoints + optional file-notification). Choose **COPY INTO** for thousands of files in scheduled batches with simple SQL.

One storage note: **DBFS / Volumes** make cloud paths look like normal folders (\`/mnt/…\`, \`/Volumes/…\`); underneath it's still your S3/ADLS/GCS bucket. Every file read also exposes a hidden \`_metadata\` column (\`file_name\`, \`file_modification_time\`) — invaluable for lineage in bronze.`,
    },
    {
      heading: 'Transforming data: PySpark & SQL',
      intent: 'The core skill — reshape data, join, and handle the nested/complex data the exam and real jobs lean on.',
      body: `> **Definition.** A *transformation* reshapes a DataFrame — selecting, filtering, aggregating, joining — to move from raw data toward an answer. On Databricks you can do it in **PySpark** or **SQL** on the same tables, and mix freely.

## Same job, two languages

\`\`\`python
from pyspark.sql import functions as F
result = (spark.table("silver_trips")
          .filter(F.col("fare_amount") > 0)
          .groupBy("passenger_count")
          .agg(F.avg("fare_amount").alias("avg_fare"))
          .orderBy("passenger_count"))
\`\`\`

\`\`\`sql
%sql
SELECT passenger_count, AVG(fare_amount) AS avg_fare
FROM silver_trips WHERE fare_amount > 0
GROUP BY passenger_count ORDER BY passenger_count;
\`\`\`

| Task | PySpark | SQL |
|---|---|---|
| Pick columns | \`.select("a","b")\` | \`SELECT a, b\` |
| Filter | \`.filter(F.col("x")>0)\` | \`WHERE x > 0\` |
| Aggregate | \`.groupBy(…).agg(…)\` | \`GROUP BY\` |
| Join | \`.join(other,"id")\` | \`JOIN other USING (id)\` |

## Complex & nested data

Real JSON has structs and arrays. Reach into a struct with dot notation, and turn an array into rows with \`explode\`.

\`\`\`sql
%sql
SELECT
  user.id                AS user_id,     -- struct field
  event.type             AS event_type,
  explode(event.items)   AS item         -- array → one row per element
FROM bronze_events;
\`\`\`

## Window functions

When you need "per-group" calculations without collapsing rows — a running total, a rank, the latest record per user — use a **window**.

\`\`\`sql
%sql
SELECT *,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY ts DESC) AS recency
FROM events;   -- recency = 1 is each user's most recent event
\`\`\`

> [!tip] Use SQL for quick aggregates and dashboards; reach for PySpark when you need functions, loops, or ML libraries. Both compile to the *same* optimised Spark plan, so there's no performance difference — pick the one that reads clearly.`,
    },
    {
      heading: 'The medallion architecture',
      intent: 'Give the repeatable blueprint real teams use to structure any pipeline, plus the managed/external table fact.',
      body: `> **Definition.** The *medallion architecture* organises data into three quality tiers — **bronze**, **silver**, **gold** — each table refining the one before it.

Rather than one giant messy transformation, you build a clean assembly line. Each layer is a Delta table.

\`\`\`viz medallion
\`\`\`

- **Bronze** — raw, as-ingested. Nothing dropped, so you always have the source of truth.
- **Silver** — cleaned, typed, joined, deduplicated. Trustworthy and granular.
- **Gold** — business-ready aggregates, shaped to what dashboards and ML actually consume.

\`\`\`sql
%sql
CREATE OR REPLACE TABLE silver_trips AS
SELECT * FROM bronze_trips WHERE fare_amount > 0 AND trip_distance > 0;

CREATE OR REPLACE TABLE gold_daily_revenue AS
SELECT pickup_date, ROUND(SUM(fare_amount), 2) AS revenue
FROM silver_trips GROUP BY pickup_date;
\`\`\`

## Managed vs external tables

A fact you must know: does dropping the table delete the data?

| Aspect | Managed table | External table |
|---|---|---|
| Location | Databricks-managed storage | You set \`LOCATION '/path'\` |
| Manages | Metadata **and** data files | Metadata only |
| \`DROP TABLE\` | **Deletes the data too** | **Keeps the data files** |
| Use when | Databricks owns the lifecycle | Data is shared / pre-exists |

> [!warn] \`DROP TABLE\` on a **managed** table deletes the underlying files. On an **external** table it only removes the metadata pointer — the files stay. Know which kind you have before dropping anything.

Why three layers at all? Because when a dashboard looks wrong you trace it bronze → silver → gold, and every team reads clean gold instead of re-cleaning raw data ten different ways.`,
    },
    {
      heading: 'Unity Catalog & governance',
      intent: 'How data is named, secured, traced, and shared — the piece that makes Databricks safe for a whole company.',
      body: `> **Definition.** *Unity Catalog* is Databricks' governance layer — one place that names, organises, secures, and traces every table, file, function, and model across all your workspaces.

## The object hierarchy

\`\`\`viz unity-catalog
\`\`\`

Every object is addressed as \`catalog.schema.table\` (schema = database). A **metastore** sits above all catalogs and is shared across every workspace in a region, so a table has one definition everywhere — no drifting copies. **Volumes** extend the same governance to non-tabular files.

\`\`\`sql
%sql
CREATE CATALOG prod;
CREATE SCHEMA prod.sales;
CREATE TABLE prod.sales.orders (...);
USE CATALOG prod;  USE SCHEMA sales;   -- then just: orders
\`\`\`

## Access control

Privileges are plain \`GRANT\` statements and are **inherited down** the hierarchy — grant on a schema and it applies to its tables.

\`\`\`sql
%sql
GRANT USAGE  ON CATALOG prod        TO \`data_eng\`;
GRANT SELECT ON TABLE prod.sales.orders TO \`analysts\`;
REVOKE SELECT ON TABLE prod.sales.salaries FROM \`interns\`;
\`\`\`

> [!star] Grant to **groups**, never individuals — it's the only way access stays manageable as the team grows. Identities come in three kinds: **users**, **groups**, and **service principals** (for automation/jobs). They're managed at the account level and assigned to workspaces.

Beyond access, Unity Catalog tracks **lineage** (which tables feed which — so you can see \`gold_daily_revenue\` came from \`silver_trips\`), keeps an **audit log** of who queried what, and powers **discovery** (search across all data). For a company, this is what turns a pile of tables into something safe to open to hundreds of people.`,
    },
    {
      heading: 'Pipelines & jobs: going to production',
      intent: 'Turn notebooks into systems that run themselves — declarative ETL with quality checks, and orchestration.',
      body: `> **Definition.** A *pipeline* declares the tables you want and the transforms between them; a *job* schedules and orchestrates work. Together they turn interactive code into production that runs without you.

## Lakeflow Declarative Pipelines (formerly Delta Live Tables)

You declare the tables you want and their transforms; the framework figures out dependencies, order, incremental processing, and recovery. You never hand-write orchestration.

\`\`\`viz pipeline
\`\`\`

- **Streaming tables** for incremental ingest; **materialized views** for transformed/aggregated results.
- **Expectations** = declarative data-quality constraints — the headline feature.
- **Pipeline modes**: *triggered* (run to completion, then stop) vs *continuous* (keep running).

\`\`\`sql
%sql
CREATE OR REFRESH STREAMING TABLE bronze_events
AS SELECT * FROM STREAM read_files('/Volumes/main/raw', format => 'json');

CREATE OR REFRESH STREAMING TABLE silver_events (
  CONSTRAINT valid_id  EXPECT (id IS NOT NULL)  ON VIOLATION DROP ROW,
  CONSTRAINT valid_amt EXPECT (amount > 0)      ON VIOLATION FAIL UPDATE
) AS SELECT * FROM STREAM(bronze_events);
\`\`\`

| Expectation clause | What happens to bad rows |
|---|---|
| *(none — warn only)* | Kept & loaded; violation recorded in metrics |
| \`ON VIOLATION DROP ROW\` | Dropped from the target; run continues |
| \`ON VIOLATION FAIL UPDATE\` | Pipeline **fails** the whole update |

## Lakeflow Jobs (orchestration)

A **job** is a DAG of **tasks** with dependencies; a task can be a notebook, a pipeline, SQL, Python, or dbt. Schedule it (e.g. daily at 2am) on **job compute**, add retries, and alert on failure.

> [!star] Expectations are the exam's favourite pipeline feature. Remember the three violation actions — warn (default), **DROP ROW**, **FAIL UPDATE** — and that streaming tables ingest incrementally while materialized views recompute results.`,
    },
    {
      heading: 'Where to go next',
      intent: 'Consolidate, then point at the natural next steps so proficiency keeps compounding.',
      body: `You now have the full spine: the **lakehouse** and its **control/compute** split, **notebooks** on **clusters**, **Spark** as the engine, **Delta Lake** for reliability, ingestion with **Auto Loader**, transforms over nested data, the **medallion** blueprint, **Unity Catalog** governance, and **declarative pipelines & jobs**. That's enough to build and ship a real pipeline.

## Cement it with one project

Pick any dataset from \`/databricks-datasets\`: land it as bronze, clean to silver (with a couple of expectations), aggregate to gold, then schedule the whole thing as a nightly job. Doing it once locks in everything above.

## Three directions to grow

- **Databricks SQL** — a dedicated SQL editor plus dashboards and alerts on fast **SQL warehouses**. If your work is mostly reporting, live here.
- **Machine learning with MLflow** — Databricks bundles **MLflow** to track experiments (params, metrics), package models, and manage them to deployment. Your features already live as Delta tables, so training is a short hop.

\`\`\`python
import mlflow
with mlflow.start_run():
    mlflow.log_param("max_depth", 5)
    mlflow.log_metric("rmse", 3.1)
    # mlflow.sklearn.log_model(model, "model")
\`\`\`

- **Performance & cost** — \`OPTIMIZE\`/\`ZORDER\`, right-sized and auto-terminating clusters, Photon, and serverless to avoid paying for idle machines.

> [!tip] Keep the one mental model: **cheap open files at the bottom, reliability from Delta, one fast engine, and every workload — SQL, pipelines, ML — sharing the same governed data.** Everything in Databricks is a variation on that theme.`,
    },
  ],
  quiz: [
    {
      q: 'What single fact defines the lakehouse architecture?',
      options: [
        'It keeps the data lake\'s cheap open storage but adds warehouse-grade ACID reliability and fast SQL on top',
        'It stores all data in memory for speed',
        'It replaces SQL with Python',
        'It is a proprietary database format',
      ],
      correct: 0,
      why: 'The lakehouse layers Delta Lake\'s guarantees over cheap open files — no copying between a separate lake and warehouse.',
    },
    {
      q: 'In Databricks\' architecture, what lives in the compute plane (your cloud account)?',
      options: [
        'Your clusters, storage, and the data being processed',
        'The web application and notebook UI',
        'The job scheduler',
        'Unity Catalog metadata',
      ],
      correct: 0,
      why: 'The control plane (web app, scheduler, Unity Catalog) is Databricks-managed; your data and compute stay in the compute plane in your cloud.',
    },
    {
      q: 'You run a cell with .filter() and .groupBy() and see no output. Why?',
      options: [
        'They are lazy transformations — nothing computes until an action like show() or count()',
        'The cluster crashed',
        'Spark rejects Python methods',
        'The table was empty',
      ],
      correct: 0,
      why: 'Spark records transformations as a plan and only executes on an action. Add show() and the work runs.',
    },
    {
      q: 'Which operation forces an expensive shuffle across the network?',
      options: [
        'groupBy / join / orderBy (wide transformations)',
        'filter (a narrow transformation)',
        'select of two columns',
        'reading a Parquet file',
      ],
      correct: 0,
      why: 'Wide transformations regroup data across partitions, requiring a shuffle — usually the slowest part of a job. Narrow ones stay per-partition.',
    },
    {
      q: 'What does Delta Lake add on top of plain Parquet files?',
      options: [
        'A transaction log giving ACID writes, time travel, and schema enforcement',
        'A faster language',
        'Automatic ML models',
        'Free storage',
      ],
      correct: 0,
      why: 'The _delta_log records every change, turning fragile files into a reliable, versioned table.',
    },
    {
      q: 'DROP TABLE on a managed table does what to the underlying data files?',
      options: [
        'Deletes them',
        'Keeps them; only removes metadata',
        'Moves them to bronze',
        'Nothing — DROP is disabled',
      ],
      correct: 0,
      why: 'Managed tables own their data, so DROP deletes the files. An external table (with LOCATION) keeps the files and only drops the metadata pointer.',
    },
    {
      q: 'For millions of continuously-arriving files, which ingestion tool fits best?',
      options: [
        'Auto Loader (incremental, checkpoints, optional file notification)',
        'COPY INTO for every file individually',
        'A manual spark.read each hour',
        'DROP and re-create the table',
      ],
      correct: 0,
      why: 'Auto Loader is built for high-volume/continuous arrival; COPY INTO suits thousands of files in scheduled batches with simple SQL.',
    },
    {
      q: 'In Unity Catalog, a table is named prod.sales.orders. What are the three levels?',
      options: [
        'catalog . schema . table',
        'workspace . user . file',
        'database . column . row',
        'region . cluster . job',
      ],
      correct: 0,
      why: 'Unity Catalog organises objects as catalog → schema → table, shared via a regional metastore.',
    },
    {
      q: 'A pipeline expectation with ON VIOLATION FAIL UPDATE does what to bad rows?',
      options: [
        'Fails the whole pipeline update',
        'Drops just those rows and continues',
        'Loads them and only records a metric',
        'Sends them to a dead-letter table automatically',
      ],
      correct: 0,
      why: 'FAIL UPDATE aborts the update; DROP ROW removes offending rows and continues; no action (warn) keeps them and records the violation in metrics.',
    },
    {
      q: 'In the medallion architecture, the silver layer holds…',
      options: [
        'Cleaned, typed, joined data — refined from bronze but not yet aggregated',
        'Raw, as-ingested data',
        'Final business aggregates',
        'Only deleted rows',
      ],
      correct: 0,
      why: 'Bronze = raw, silver = cleaned/joined/trustworthy, gold = business-ready aggregates.',
    },
  ],
  exercises: [
    {
      title: 'Build a bronze → silver → gold pipeline',
      task: `Using \`samples.nyctaxi.trips\` (or any table you have), write three SQL cells that:

1. Create a **bronze** table that is a raw copy of the source.
2. Create a **silver** table keeping only rows where \`fare_amount > 0\` and \`trip_distance > 0\`.
3. Create a **gold** table with total revenue per pickup date.

Each layer must read from the one before it.`,
      solution: `\`\`\`sql
%sql
-- 1. Bronze: raw copy (source of truth)
CREATE OR REPLACE TABLE bronze_trips AS
SELECT * FROM samples.nyctaxi.trips;

-- 2. Silver: clean — drop bad fares and zero-distance trips
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

Each layer reads only from the layer below, so a wrong gold number is traceable back through silver to bronze. Adjust column names (\`tpep_pickup_datetime\`, \`fare_amount\`) to your dataset.`,
    },
    {
      title: 'Add a data-quality expectation',
      task: `Rewrite the silver step as a **Lakeflow Declarative Pipeline** streaming table that:

1. Reads from \`bronze_trips\`.
2. **Drops** rows where \`fare_amount\` is null.
3. **Fails** the update if any \`trip_distance\` is negative.

Which violation clause goes with which rule?`,
      solution: `\`\`\`sql
%sql
CREATE OR REFRESH STREAMING TABLE silver_trips (
  CONSTRAINT has_fare      EXPECT (fare_amount IS NOT NULL) ON VIOLATION DROP ROW,
  CONSTRAINT non_neg_dist  EXPECT (trip_distance >= 0)      ON VIOLATION FAIL UPDATE
) AS SELECT * FROM STREAM(bronze_trips);
\`\`\`

- **DROP ROW** quietly removes rows missing a fare and lets the run continue — right for expected, low-stakes noise.
- **FAIL UPDATE** stops the whole pipeline on a negative distance — right for a "this should never happen" invariant you want to catch loudly.
- Omitting the clause (warn-only) would keep bad rows and just record the violation in the pipeline's data-quality metrics.`,
    },
    {
      title: 'Recover a table with time travel',
      task: `You accidentally overwrote \`silver_trips\` with an empty result. Using SQL, (a) inspect the table's history, (b) check what the previous version held, and (c) restore it.`,
      solution: `\`\`\`sql
%sql
-- (a) Every version is logged
DESCRIBE HISTORY silver_trips;

-- (b) Inspect the previous good version (say version 4)
SELECT COUNT(*) FROM silver_trips VERSION AS OF 4;

-- (c) Roll the table back atomically
RESTORE TABLE silver_trips TO VERSION AS OF 4;
\`\`\`

This works because Delta keeps a transaction log of every version instead of overwriting in place. \`DESCRIBE HISTORY\` lists versions, \`VERSION AS OF\` reads any of them, and \`RESTORE\` rolls back. With plain Parquet, that empty overwrite would have been unrecoverable — the reason Delta is the backbone of the lakehouse.`,
    },
  ],
};
