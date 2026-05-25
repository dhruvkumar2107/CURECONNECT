import React, { useState, useEffect, useRef } from 'react';
import {
  Database, Play, Terminal, CheckCircle2, AlertTriangle,
  GitBranch, FileCode, Settings, Layers, Search, RefreshCw,
  Sliders, Table, Sparkles, HelpCircle, ArrowRight, Eye, Check, X
} from 'lucide-react';

// Type definitions
interface DbtNode {
  id: string;
  name: string;
  type: 'source' | 'staging' | 'intermediate' | 'mart';
  description: string;
  rawSql: string;
  compiledSql: string;
  yamlConfig: string;
  dependencies: string[];
  mockData: Record<string, any>[];
}

export const DbtDemoPage = () => {
  const [selectedNode, setSelectedNode] = useState<string>('stg_searches');
  const [activeEditorTab, setActiveEditorTab] = useState<'raw' | 'compiled' | 'yaml'>('raw');
  const [activeLeftTab, setActiveLeftTab] = useState<'dag' | 'data'>('dag');
  
  // Terminal logs state
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['$ Ready to compile. Press "dbt run" or "dbt test" above.']);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runProgress, setRunProgress] = useState<number>(0);
  const [injectAnomaly, setInjectAnomaly] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(true);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Scroll terminal logs to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalOutput]);

  // DBT node registry representing CureConnect analytical models
  const nodes: Record<string, DbtNode> = {
    // SOURCES
    src_searches: {
      id: 'src_searches',
      name: 'src_searches',
      type: 'source',
      description: 'Raw medicine search click logs synced from Firestore search collection.',
      rawSql: '-- BigQuery Landing Table\nSELECT * FROM `cureconnect-data-warehouse.raw_firestore_landing.search_events`;',
      compiledSql: 'SELECT * FROM `cureconnect-data-warehouse.raw_firestore_landing.search_events`;',
      yamlConfig: `version: 2\nsources:\n  - name: raw_firestore\n    tables:\n      - name: search_events\n        description: "Firestore search events clickstream"\n        columns:\n          - name: search_id\n            tests:\n              - unique\n              - not_null`,
      dependencies: [],
      mockData: [
        { search_id: 'sch_9921', user_id: 'usr_881', search_query: ' Paracetamol 650mg  ', results_count: '12', interaction_timestamp: '2026-05-25 14:10:02', api_response_payload: '{"status_code": 200, "provider_code": "myupchaar"}' },
        { search_id: 'sch_9922', user_id: null, search_query: 'insulin injection ', results_count: '2', interaction_timestamp: '2026-05-25 14:12:45', api_response_payload: '{"status_code": 200, "provider_code": "myupchaar"}' },
        { search_id: 'sch_9923', user_id: 'usr_905', search_query: 'unknown_medicine_abc', results_count: '0', interaction_timestamp: '2026-05-25 14:15:30', api_response_payload: '{"status_code": 404, "provider_code": "myupchaar"}' }
      ]
    },
    src_carts: {
      id: 'src_carts',
      name: 'src_carts',
      type: 'source',
      description: 'Raw transactional cart events reflecting guest and logged-in checkout logs.',
      rawSql: '-- BigQuery Landing Table\nSELECT * FROM `cureconnect-data-warehouse.raw_firestore_landing.cart_sessions`;',
      compiledSql: 'SELECT * FROM `cureconnect-data-warehouse.raw_firestore_landing.cart_sessions`;',
      yamlConfig: `version: 2\nsources:\n  - name: raw_firestore\n    tables:\n      - name: cart_sessions\n        description: "Firestore shopping cart updates"`,
      dependencies: [],
      mockData: [
        { cart_id: 'crt_001a', anonymous_device_id: 'dev_99x', authenticated_user_id: 'usr_881', pharmacy_id: 'ph_ap_01', items_array: '[{"id":"med_12", "qty":2}]', status: 'checked_out' },
        { cart_id: 'crt_002b', anonymous_device_id: 'dev_99x', authenticated_user_id: null, pharmacy_id: 'ph_ap_01', items_array: '[{"id":"med_12", "qty":1}]', status: 'active' }
      ]
    },
    src_inventory: {
      id: 'src_inventory',
      name: 'src_inventory',
      type: 'source',
      description: 'Pharmacy stock levels and inventory change records.',
      rawSql: '-- BigQuery Landing Table\nSELECT * FROM `cureconnect-data-warehouse.raw_firestore_landing.pharmacy_inventory`;',
      compiledSql: 'SELECT * FROM `cureconnect-data-warehouse.raw_firestore_landing.pharmacy_inventory`;',
      yamlConfig: `version: 2\nsources:\n  - name: raw_firestore\n    tables:\n      - name: pharmacy_inventory\n        description: "Stores pharmacy updates"`,
      dependencies: [],
      mockData: [
        { pharmacy_id: 'ph_ap_01', medicine_id: 'med_12', stock_level: 45, last_updated: '2026-05-25 14:01:00' },
        { pharmacy_id: 'ph_ap_02', medicine_id: 'med_99', stock_level: -5, last_updated: '2026-05-25 14:05:00' } // -5 can trigger inventory anomaly test failure
      ]
    },
    src_pharmacies: {
      id: 'src_pharmacies',
      name: 'src_pharmacies',
      type: 'source',
      description: 'Static partner pharmacies credentials and locations.',
      rawSql: '-- BigQuery Landing Table\nSELECT * FROM `cureconnect-data-warehouse.raw_firestore_landing.pharmacies_list`;',
      compiledSql: 'SELECT * FROM `cureconnect-data-warehouse.raw_firestore_landing.pharmacies_list`;',
      yamlConfig: `version: 2\nsources:\n  - name: raw_firestore\n    tables:\n      - name: pharmacies_list\n        description: "Static pharmacies registrations"`,
      dependencies: [],
      mockData: [
        { pharmacy_id: 'ph_ap_01', name: 'Apollo Pharmacy Indiranagar', location: 'Indiranagar, Bangalore' },
        { pharmacy_id: 'ph_ap_02', name: 'MedPlus Koramangala', location: 'Koramangala, Bangalore' }
      ]
    },

    // STAGING LAYER
    stg_searches: {
      id: 'stg_searches',
      name: 'stg_searches',
      type: 'staging',
      description: 'Cleanses raw searches: trims queries, normalizes string cases, and parses nested API JSON logs.',
      rawSql: `{{ config(materialized='view') }}

with raw_source as (
    select * from {{ source('raw_firestore', 'search_events') }}
),
sanitized as (
    select
        cast(search_id as string) as search_id,
        coalesce(cast(user_id as string), 'GUEST') as user_id,
        lower(trim(search_query)) as cleaned_search_query,
        cast(results_count as integer) as number_of_results,
        cast(interaction_timestamp as timestamp) as clicked_at_est,
        
        -- JSON extracts for nested payload metrics
        json_extract_scalar(api_response_payload, '$.status_code') as api_status,
        json_extract_scalar(api_response_payload, '$.provider_code') as search_provider
    from raw_source
)
select * from sanitized`,
      compiledSql: `CREATE OR REPLACE VIEW \`cureconnect-data-warehouse.staging.stg_searches\` AS
with raw_source as (
    select * from \`cureconnect-data-warehouse.raw_firestore_landing.search_events\`
),
sanitized as (
    select
        cast(search_id as string) as search_id,
        coalesce(cast(user_id as string), 'GUEST') as user_id,
        lower(trim(search_query)) as cleaned_search_query,
        cast(results_count as integer) as number_of_results,
        cast(interaction_timestamp as timestamp) as clicked_at_est,
        
        json_extract_scalar(api_response_payload, '$.status_code') as api_status,
        json_extract_scalar(api_response_payload, '$.provider_code') as search_provider
    from raw_source
)
select * from sanitized;`,
      yamlConfig: `version: 2\nmodels:\n  - name: stg_searches\n    description: "Standardized clinical search keywords stream."\n    columns:\n      - name: search_id\n        tests:\n          - unique\n          - not_null`,
      dependencies: ['src_searches'],
      mockData: [
        { search_id: 'sch_9921', user_id: 'usr_881', cleaned_search_query: 'paracetamol 650mg', number_of_results: 12, clicked_at_est: '2026-05-25 14:10:02 UTC', api_status: '200', search_provider: 'myupchaar' },
        { search_id: 'sch_9922', user_id: 'GUEST', cleaned_search_query: 'insulin injection', number_of_results: 2, clicked_at_est: '2026-05-25 14:12:45 UTC', api_status: '200', search_provider: 'myupchaar' },
        { search_id: 'sch_9923', user_id: 'usr_905', cleaned_search_query: 'unknown_medicine_abc', number_of_results: 0, clicked_at_est: '2026-05-25 14:15:30 UTC', api_status: '404', search_provider: 'myupchaar' }
      ]
    },
    stg_carts: {
      id: 'stg_carts',
      name: 'stg_carts',
      type: 'staging',
      description: 'Parses nested items arrays and standardizes cart logs structures.',
      rawSql: `{{ config(materialized='view') }}

select
    cast(cart_id as string) as cart_id,
    cast(anonymous_device_id as string) as anonymous_device_id,
    cast(authenticated_user_id as string) as authenticated_user_id,
    cast(pharmacy_id as string) as pharmacy_id,
    lower(status) as checkout_status
from {{ source('raw_firestore', 'cart_sessions') }}`,
      compiledSql: `CREATE OR REPLACE VIEW \`cureconnect-data-warehouse.staging.stg_carts\` AS
select
    cast(cart_id as string) as cart_id,
    cast(anonymous_device_id as string) as anonymous_device_id,
    cast(authenticated_user_id as string) as authenticated_user_id,
    cast(pharmacy_id as string) as pharmacy_id,
    lower(status) as checkout_status
from \`cureconnect-data-warehouse.raw_firestore_landing.cart_sessions\`;`,
      yamlConfig: `version: 2\nmodels:\n  - name: stg_carts\n    description: "Casts and validates cart items raw metrics."`,
      dependencies: ['src_carts'],
      mockData: [
        { cart_id: 'crt_001a', anonymous_device_id: 'dev_99x', authenticated_user_id: 'usr_881', pharmacy_id: 'ph_ap_01', checkout_status: 'checked_out' },
        { cart_id: 'crt_002b', anonymous_device_id: 'dev_99x', authenticated_user_id: null, pharmacy_id: 'ph_ap_01', checkout_status: 'active' }
      ]
    },
    stg_inventory: {
      id: 'stg_inventory',
      name: 'stg_inventory',
      type: 'staging',
      description: 'Cleanses inventory entries and prepares audits tracking fields.',
      rawSql: `{{ config(materialized='view') }}

select
    cast(pharmacy_id as string) as pharmacy_id,
    cast(medicine_id as string) as medicine_id,
    cast(stock_level as integer) as current_stock,
    cast(last_updated as timestamp) as stock_updated_at
from {{ source('raw_firestore', 'pharmacy_inventory') }}`,
      compiledSql: `CREATE OR REPLACE VIEW \`cureconnect-data-warehouse.staging.stg_inventory\` AS
select
    cast(pharmacy_id as string) as pharmacy_id,
    cast(medicine_id as string) as medicine_id,
    cast(stock_level as integer) as current_stock,
    cast(last_updated as timestamp) as stock_updated_at
from \`cureconnect-data-warehouse.raw_firestore_landing.pharmacy_inventory\`;`,
      yamlConfig: `version: 2\nmodels:\n  - name: stg_inventory\n    columns:\n      - name: current_stock\n        tests:\n          - not_null\n          - dbt_expectations.expect_column_values_to_be_between:\n              min_value: 0 -- Triggers anomaly failure if inventory stock level is negative`,
      dependencies: ['src_inventory'],
      mockData: [
        { pharmacy_id: 'ph_ap_01', medicine_id: 'med_12', current_stock: 45, stock_updated_at: '2026-05-25 14:01:00 UTC' },
        { pharmacy_id: 'ph_ap_02', medicine_id: 'med_99', current_stock: -5, stock_updated_at: '2026-05-25 14:05:00 UTC' }
      ]
    },
    stg_pharmacies: {
      id: 'stg_pharmacies',
      name: 'stg_pharmacies',
      type: 'staging',
      description: 'Maps static details of partner pharmacy locations.',
      rawSql: `{{ config(materialized='view') }}

select
    cast(pharmacy_id as string) as pharmacy_id,
    trim(name) as pharmacy_name,
    trim(location) as location_locality
from {{ source('raw_firestore', 'pharmacies_list') }}`,
      compiledSql: `CREATE OR REPLACE VIEW \`cureconnect-data-warehouse.staging.stg_pharmacies\` AS
select
    cast(pharmacy_id as string) as pharmacy_id,
    trim(name) as pharmacy_name,
    trim(location) as location_locality
from \`cureconnect-data-warehouse.raw_firestore_landing.pharmacies_list\`;`,
      yamlConfig: `version: 2\nmodels:\n  - name: stg_pharmacies\n    columns:\n      - name: pharmacy_id\n        tests:\n          - unique\n          - not_null`,
      dependencies: ['src_pharmacies'],
      mockData: [
        { pharmacy_id: 'ph_ap_01', pharmacy_name: 'Apollo Pharmacy Indiranagar', location_locality: 'Indiranagar, Bangalore' },
        { pharmacy_id: 'ph_ap_02', pharmacy_name: 'MedPlus Koramangala', location_locality: 'Koramangala, Bangalore' }
      ]
    },

    // INTERMEDIATE LAYER
    int_user_sessionized: {
      id: 'int_user_sessionized',
      name: 'int_user_sessionized',
      type: 'intermediate',
      description: 'Performs User Stitching: Links anonymous web clicks with authenticated user accounts across sessions.',
      rawSql: `{{ config(materialized='ephemeral') }}

with searches as (
    select * from {{ ref('stg_searches') }}
),
carts as (
    select * from {{ ref('stg_carts') }}
),
-- Creates key link between device footprints and user logins
stitching_map as (
    select
        anonymous_device_id,
        max(authenticated_user_id) as stitched_user_id
    from carts
    where authenticated_user_id is not null
    group by 1
)
select
    s.search_id,
    coalesce(m.stitched_user_id, s.user_id) as stitched_user_id,
    s.cleaned_search_query,
    s.number_of_results,
    s.clicked_at_est,
    s.search_provider
from searches s
left join stitching_map m on s.user_id = m.anonymous_device_id`,
      compiledSql: `-- Compiles inline inside downstream models (ephemeral compilation method)
-- Evaluates as a common table expression (CTE) block within downstream fact tables.`,
      yamlConfig: `version: 2\nmodels:\n  - name: int_user_sessionized\n    description: "Intermediate user mapping model linking guest devices to users."`,
      dependencies: ['stg_searches', 'stg_carts'],
      mockData: [
        { search_id: 'sch_9921', stitched_user_id: 'usr_881', cleaned_search_query: 'paracetamol 650mg', number_of_results: 12, clicked_at_est: '2026-05-25 14:10:02 UTC', search_provider: 'myupchaar' },
        { search_id: 'sch_9922', stitched_user_id: 'usr_881', cleaned_search_query: 'insulin injection', number_of_results: 2, clicked_at_est: '2026-05-25 14:12:45 UTC', search_provider: 'myupchaar' }, // Stitched guest device to usr_881!
        { search_id: 'sch_9923', stitched_user_id: 'usr_905', cleaned_search_query: 'unknown_medicine_abc', number_of_results: 0, clicked_at_est: '2026-05-25 14:15:30 UTC', search_provider: 'myupchaar' }
      ]
    },
    int_inventory_delta: {
      id: 'int_inventory_delta',
      name: 'int_inventory_delta',
      type: 'intermediate',
      description: 'Calculates active inventory changes and flags low-stock warnings.',
      rawSql: `{{ config(materialized='ephemeral') }}

select
    pharmacy_id,
    medicine_id,
    current_stock,
    stock_updated_at,
    case 
        when current_stock <= 5 then true 
        else false 
    end as is_critical_stock
from {{ ref('stg_inventory') }}`,
      compiledSql: `-- Ephemeral Compilation --`,
      yamlConfig: `version: 2\nmodels:\n  - name: int_inventory_delta\n    description: "Precalculates stock critical status threshold."`,
      dependencies: ['stg_inventory'],
      mockData: [
        { pharmacy_id: 'ph_ap_01', medicine_id: 'med_12', current_stock: 45, stock_updated_at: '2026-05-25 14:01:00 UTC', is_critical_stock: false },
        { pharmacy_id: 'ph_ap_02', medicine_id: 'med_99', current_stock: -5, stock_updated_at: '2026-05-25 14:05:00 UTC', is_critical_stock: true }
      ]
    },

    // MARTS LAYER
    dim_pharmacies: {
      id: 'dim_pharmacies',
      name: 'dim_pharmacies',
      type: 'mart',
      description: 'Final Dimension Table representing partner pharmacies optimized for reporting.',
      rawSql: `{{ config(materialized='table') }}

select
    pharmacy_id,
    pharmacy_name,
    location_locality as neighborhood,
    current_timestamp() as load_timestamp
from {{ ref('stg_pharmacies') }}`,
      compiledSql: `CREATE TABLE \`cureconnect-data-warehouse.analytics.dim_pharmacies\` AS
select
    pharmacy_id,
    pharmacy_name,
    location_locality as neighborhood,
    current_timestamp() as load_timestamp
from \`cureconnect-data-warehouse.staging.stg_pharmacies\`;`,
      yamlConfig: `version: 2\nmodels:\n  - name: dim_pharmacies\n    columns:\n      - name: pharmacy_id\n        tests:\n          - unique\n          - not_null`,
      dependencies: ['stg_pharmacies'],
      mockData: [
        { pharmacy_id: 'ph_ap_01', pharmacy_name: 'Apollo Pharmacy Indiranagar', neighborhood: 'Indiranagar, Bangalore', load_timestamp: '2026-05-25 14:30:00 UTC' },
        { pharmacy_id: 'ph_ap_02', pharmacy_name: 'MedPlus Koramangala', neighborhood: 'Koramangala, Bangalore', load_timestamp: '2026-05-25 14:30:00 UTC' }
      ]
    },
    fact_searches: {
      id: 'fact_searches',
      name: 'fact_searches',
      type: 'mart',
      description: 'Incremental Fact Table recording all searches with results conversions tags.',
      rawSql: `{{ config(
    materialized='incremental',
    unique_key='search_id',
    partition_by={
      "field": "clicked_at_est",
      "data_type": "timestamp"
    }
) }}

select
    search_id,
    stitched_user_id as user_id,
    cleaned_search_query,
    number_of_results,
    clicked_at_est,
    case when number_of_results = 0 then 1 else 0 end as is_unfulfilled_search,
    current_timestamp() as inserted_at
from {{ ref('int_user_sessionized') }}

{% if is_incremental() %}
  where clicked_at_est >= (select max(clicked_at_est) from {{ this }}) - interval '2' day
{% endif %}`,
      compiledSql: `CREATE TABLE IF NOT EXISTS \`cureconnect-data-warehouse.analytics.fact_searches\` (
    search_id STRING,
    user_id STRING,
    cleaned_search_query STRING,
    number_of_results INT64,
    clicked_at_est TIMESTAMP,
    is_unfulfilled_search INT64,
    inserted_at TIMESTAMP
) PARTITION BY DATE(clicked_at_est);

-- Incremental Run Block: Appends only last 2 days of records
INSERT INTO \`cureconnect-data-warehouse.analytics.fact_searches\`
select
    search_id,
    stitched_user_id as user_id,
    cleaned_search_query,
    number_of_results,
    clicked_at_est,
    case when number_of_results = 0 then 1 else 0 end as is_unfulfilled_search,
    current_timestamp() as inserted_at
from (
    -- Inline evaluation of int_user_sessionized CTE code
    select 
        s.search_id,
        coalesce(m.stitched_user_id, s.user_id) as stitched_user_id,
        s.cleaned_search_query,
        s.number_of_results,
        s.clicked_at_est
    from \`cureconnect-data-warehouse.staging.stg_searches\` s
    left join (
        select anonymous_device_id, max(authenticated_user_id) as stitched_user_id
        from \`cureconnect-data-warehouse.staging.stg_carts\` group by 1
    ) m on s.user_id = m.anonymous_device_id
)
where clicked_at_est >= (select max(clicked_at_est) from \`cureconnect-data-warehouse.analytics.fact_searches\`) - interval '2' day;`,
      yamlConfig: `version: 2\nmodels:\n  - name: fact_searches\n    columns:\n      - name: search_id\n        tests:\n          - unique\n          - not_null\n      - name: user_id\n        tests:\n          - relationships:\n              to: ref('dim_users')\n              field: user_id -- Relational integrity check (Breaks if Anomaly Active)`,
      dependencies: ['int_user_sessionized'],
      mockData: [
        { search_id: 'sch_9921', user_id: 'usr_881', cleaned_search_query: 'paracetamol 650mg', number_of_results: 12, clicked_at_est: '2026-05-25 14:10:02 UTC', is_unfulfilled_search: 0 },
        { search_id: 'sch_9922', user_id: 'usr_881', cleaned_search_query: 'insulin injection', number_of_results: 2, clicked_at_est: '2026-05-25 14:12:45 UTC', is_unfulfilled_search: 0 },
        { search_id: 'sch_9923', user_id: 'usr_905', cleaned_search_query: 'unknown_medicine_abc', number_of_results: 0, clicked_at_est: '2026-05-25 14:15:30 UTC', is_unfulfilled_search: 1 }
      ]
    },
    fact_inventory_audits: {
      id: 'fact_inventory_audits',
      name: 'fact_inventory_audits',
      type: 'mart',
      description: 'Fact Table snapshotting pharmacy medicine stock levels for low inventory triggers.',
      rawSql: `{{ config(materialized='table') }}

select
    pharmacy_id,
    medicine_id,
    current_stock,
    is_critical_stock,
    stock_updated_at,
    current_timestamp() as snapshot_created_at
from {{ ref('int_inventory_delta') }}`,
      compiledSql: `CREATE TABLE \`cureconnect-data-warehouse.analytics.fact_inventory_audits\` AS
select
    pharmacy_id,
    medicine_id,
    current_stock,
    is_critical_stock,
    stock_updated_at,
    current_timestamp() as snapshot_created_at
from (
    select
        pharmacy_id,
        medicine_id,
        current_stock,
        stock_updated_at,
        case when current_stock <= 5 then true else false end as is_critical_stock
    from \`cureconnect-data-warehouse.staging.stg_inventory\`
);`,
      yamlConfig: `version: 2\nmodels:\n  - name: fact_inventory_audits\n    columns:\n      - name: pharmacy_id\n        tests:\n          - relationships:\n              to: ref('dim_pharmacies')\n              field: pharmacy_id`,
      dependencies: ['int_inventory_delta'],
      mockData: [
        { pharmacy_id: 'ph_ap_01', medicine_id: 'med_12', current_stock: 45, is_critical_stock: false, stock_updated_at: '2026-05-25 14:01:00 UTC' },
        { pharmacy_id: 'ph_ap_02', medicine_id: 'med_99', current_stock: -5, is_critical_stock: true, stock_updated_at: '2026-05-25 14:05:00 UTC' }
      ]
    }
  };

  // Run dbt pipeline simulation
  const handleDbtRun = () => {
    if (isRunning) return;
    setIsRunning(true);
    setRunProgress(0);
    setTerminalOutput([
      `$ dbt run --profiles-dir ./profiles --target dev`,
      `14:45:00 | Database: Google BigQuery (project: cureconnect-dw-2026)`,
      `14:45:00 | Concurrency: 4 threads`,
      `14:45:00 | Found 4 sources, 4 staging views, 2 ephemeral intermediate models, 3 table/incremental marts`,
      `14:45:00 | `
    ]);

    const steps = [
      { msg: '1 of 7 START view staging.stg_searches...................................... [RUN]', progress: 15 },
      { msg: '2 of 7 START view staging.stg_carts......................................... [RUN]', progress: 30 },
      { msg: '1 of 7 OK created view staging.stg_searches................................. [OK in 0.38s]', progress: 40 },
      { msg: '2 of 7 OK created view staging.stg_carts.................................... [OK in 0.44s]', progress: 50 },
      { msg: '3 of 7 START view staging.stg_inventory.................................... [RUN]', progress: 55 },
      { msg: '3 of 7 OK created view staging.stg_inventory................................ [OK in 0.32s]', progress: 60 },
      { msg: '4 of 7 START view staging.stg_pharmacies..................................... [RUN]', progress: 65 },
      { msg: '4 of 7 OK created view staging.stg_pharmacies................................ [OK in 0.28s]', progress: 70 },
      { msg: '5 of 7 START table analytics.dim_pharmacies.................................. [RUN]', progress: 80 },
      { msg: '5 of 7 OK created table analytics.dim_pharmacies............................. [OK in 1.15s]', progress: 85 },
      { msg: '6 of 7 START incremental analytics.fact_searches............................. [RUN]', progress: 90 },
      { msg: '6 of 7 OK created incremental analytics.fact_searches........................ [OK in 1.48s]', progress: 93 },
      { msg: '7 of 7 START table analytics.fact_inventory_audits........................... [RUN]', progress: 97 },
      { msg: '7 of 7 OK created table analytics.fact_inventory_audits...................... [OK in 0.95s]', progress: 100 },
      { msg: '\nFinished running 4 views, 3 tables in 4.96s.\n\nCompleted Successfully! 🎉 All models compiled and updated.' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setTerminalOutput(prev => [...prev, steps[currentStep].msg]);
        setRunProgress(steps[currentStep].progress);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 450);
  };

  // Run dbt tests simulation (triggers fails if anomaly injected)
  const handleDbtTest = () => {
    if (isRunning) return;
    setIsRunning(true);
    setRunProgress(0);
    setTerminalOutput([
      `$ dbt test --select path:models/staging path:models/marts`,
      `14:46:12 | Database: Google BigQuery (project: cureconnect-dw-2026)`,
      `14:46:12 | Found 6 active constraints, 4 schema relationship rules`,
      `14:46:12 | `
    ]);

    const normalSteps = [
      { msg: '1 of 5 START test unique_stg_searches_search_id............................. [RUN]', progress: 20 },
      { msg: '1 of 5 PASS unique_stg_searches_search_id.................................. [PASS in 0.52s]', progress: 30 },
      { msg: '2 of 5 START test not_null_stg_searches_search_id........................... [RUN]', progress: 40 },
      { msg: '2 of 5 PASS not_null_stg_searches_search_id................................. [PASS in 0.28s]', progress: 50 },
      { msg: '3 of 5 START test not_null_stg_inventory_current_stock...................... [RUN]', progress: 60 },
      { msg: '3 of 5 PASS not_null_stg_inventory_current_stock............................ [PASS in 0.31s]', progress: 70 },
      { msg: '4 of 5 START test relationships_fact_searches_user_id....................... [RUN]', progress: 80 },
      { msg: '4 of 5 PASS relationships_fact_searches_user_id............................. [PASS in 0.72s]', progress: 90 },
      { msg: '5 of 5 START test relationships_fact_inventory_audits_pharmacy_id........... [RUN]', progress: 95 },
      { msg: '5 of 5 PASS relationships_fact_inventory_audits_pharmacy_id................. [PASS in 0.61s]', progress: 100 },
      { msg: '\nFinished running 5 tests.\n\nAll tests passed successfully! 🟢 [5 PASS, 0 FAIL]' }
    ];

    const anomalySteps = [
      { msg: '1 of 5 START test unique_stg_searches_search_id............................. [RUN]', progress: 20 },
      { msg: '1 of 5 PASS unique_stg_searches_search_id.................................. [PASS in 0.45s]', progress: 30 },
      { msg: '2 of 5 START test not_null_stg_searches_search_id........................... [RUN]', progress: 40 },
      { msg: '2 of 5 PASS not_null_stg_searches_search_id................................. [PASS in 0.24s]', progress: 50 },
      { msg: '3 of 5 START test not_null_stg_inventory_current_stock...................... [RUN]', progress: 60 },
      { msg: '3 of 5 PASS not_null_stg_inventory_current_stock............................ [PASS in 0.30s]', progress: 70 },
      { msg: '4 of 5 START test relationships_fact_searches_user_id....................... [RUN]', progress: 80 },
      { msg: '4 of 5 FAIL relationships_fact_searches_user_id............................. [FAIL 1 in 0.81s]', progress: 90 },
      { msg: '🚨 ERROR: Referential Integrity Check Failed on models/marts/fact_searches.sql', progress: 92 },
      { msg: '   -> Found 1 orphan row where fact_searches.user_id (\'usr_905\') does not exist in analytics.dim_users.', progress: 95 },
      { msg: '5 of 5 START test relationships_fact_inventory_audits_pharmacy_id........... [RUN]', progress: 97 },
      { msg: '5 of 5 PASS relationships_fact_inventory_audits_pharmacy_id................. [PASS in 0.58s]', progress: 100 },
      { msg: '\nFinished running 5 tests.\n\nPipeline Failed! 🔴 [4 PASS, 1 FAIL]\nReview detailed anomaly log: Anomaly active (invalid user login mapped to clickstream).' }
    ];

    const steps = injectAnomaly ? anomalySteps : normalSteps;
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setTerminalOutput(prev => [...prev, steps[currentStep].msg]);
        setRunProgress(steps[currentStep].progress);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 450);
  };

  const getDbtNodeTypeStyle = (type: string) => {
    switch (type) {
      case 'source': return { bg: 'bg-emerald-500/10 hover:bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' };
      case 'staging': return { bg: 'bg-amber-500/10 hover:bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' };
      case 'intermediate': return { bg: 'bg-sky-500/10 hover:bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30' };
      case 'mart': return { bg: 'bg-purple-500/10 hover:bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' };
      default: return { bg: 'bg-slate-500/10 hover:bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };
    }
  };

  const selectedNodeData = nodes[selectedNode];

  return (
    <div className="relative text-slate-300 min-h-screen py-6">
      {/* ── Background Glow ── */}
      <div className="absolute top-10 left-1/3 w-96 h-96 bg-teal-500/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none" />

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-bold rounded-lg w-fit mb-2">
            <Sparkles size={12} /> Live Exam Demonstration
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            📊 DBT Analytics &amp; Lineage Explorer
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Simulate and interact with a live, production-grade <strong>Modern Data Stack (MDS)</strong> pipeline. 
            Transform CureConnect's operational Firestore events into BigQuery dimensional schemas.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold rounded-xl transition"
          >
            <HelpCircle size={14} /> {showExplanation ? 'Hide Help' : 'Exam Guide'}
          </button>
          
          <a
            href="./CureConnect_DBT_Writeup.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-black rounded-xl transition uppercase tracking-wider"
          >
            <Eye size={14} /> Open Exam Writeup
          </a>
        </div>
      </div>

      {/* ── Exam Guide Explanation banner ── */}
      {showExplanation && (
        <div className="mb-8 p-5 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl animate-fadeIn">
          <h3 className="text-sm font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
            <Sliders size={16} className="text-teal-400" /> Examiner Evaluation Cheatsheet
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400 leading-relaxed">
            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
              <strong className="text-teal-400 block mb-1">1. Model Lineage (DAG)</strong>
              Trace dependencies by clicking on the boxes in the DAG below. Notice how data moves from raw collections to Staging tables, flows into Stitched Intermediate layers, and materializes into optimal Dimensions and Facts for dashboards.
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
              <strong className="text-amber-400 block mb-1">2. Run Compiler Simulations</strong>
              Click <strong className="text-white">"dbt run"</strong> below. Watch it dynamically resolve model compilation order and load views and tables into the database. Click <strong className="text-white">"dbt test"</strong> to execute automated constraints testing.
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-2xl">
              <strong className="text-rose-400 block mb-1">3. Inject Anomaly (Test Quality)</strong>
              Toggle <strong className="text-white">"Inject Ingestion Anomaly"</strong> and run <strong className="text-white">"dbt test"</strong>. Observe how DBT intercepts the anomaly in the searches table relationships, proving real-world data quality governance!
            </div>
          </div>
        </div>
      )}

      {/* ── Main controls dashboard panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        
        {/* Left Column: Visual Lineage and Data Explorer */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-6 flex flex-col min-h-[580px] shadow-2xl relative overflow-hidden">
            {/* Header / Tabs */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveLeftTab('dag')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg uppercase tracking-wider transition ${
                    activeLeftTab === 'dag'
                      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers size={13} /> Interactive Lineage (DAG)
                </button>
                <button
                  onClick={() => setActiveLeftTab('data')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-lg uppercase tracking-wider transition ${
                    activeLeftTab === 'data'
                      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Table size={13} /> Target Warehouse Data Viewer
                </button>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                BigQuery Connected
              </div>
            </div>

            {/* TAB CONTENT: DAG */}
            {activeLeftTab === 'dag' && (
              <div className="flex-1 flex flex-col justify-between py-2">
                <p className="text-xs text-slate-500 italic mb-4">
                  *Click on any node in the lineage chain to inspect its source code, YAML configurations, and outputs.
                </p>

                {/* VISUAL DAG NODE MATRIX */}
                <div className="space-y-6">
                  
                  {/* Layer 1: Sources */}
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-2">Sources (Firestore Landing)</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.values(nodes).filter(n => n.type === 'source').map(node => {
                        const style = getDbtNodeTypeStyle(node.type);
                        const isSelected = selectedNode === node.id;
                        return (
                          <button
                            key={node.id}
                            onClick={() => setSelectedNode(node.id)}
                            className={`p-3 rounded-2xl border text-left transition duration-200 ${style.bg} ${style.border} ${
                              isSelected ? 'ring-2 ring-emerald-500 border-transparent scale-[1.03]' : ''
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 block">SOURCE</span>
                            <span className="text-xs font-bold text-white block truncate">{node.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Flow Arrow */}
                  <div className="flex justify-center text-slate-700 font-black text-sm">↓ ref()</div>

                  {/* Layer 2: Staging */}
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-2">Staging Models (Cleansed Views)</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.values(nodes).filter(n => n.type === 'staging').map(node => {
                        const style = getDbtNodeTypeStyle(node.type);
                        const isSelected = selectedNode === node.id;
                        return (
                          <button
                            key={node.id}
                            onClick={() => setSelectedNode(node.id)}
                            className={`p-3 rounded-2xl border text-left transition duration-200 ${style.bg} ${style.border} ${
                              isSelected ? 'ring-2 ring-amber-500 border-transparent scale-[1.03]' : ''
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 block">STAGING</span>
                            <span className="text-xs font-bold text-white block truncate">{node.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Flow Arrow */}
                  <div className="flex justify-center text-slate-700 font-black text-sm">↓ ref()</div>

                  {/* Layer 3: Intermediate */}
                  <div>
                    <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest block mb-2">Intermediate Layer (User Stitching / Deltas)</span>
                    <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                      {Object.values(nodes).filter(n => n.type === 'intermediate').map(node => {
                        const style = getDbtNodeTypeStyle(node.type);
                        const isSelected = selectedNode === node.id;
                        return (
                          <button
                            key={node.id}
                            onClick={() => setSelectedNode(node.id)}
                            className={`p-3 rounded-2xl border text-left transition duration-200 ${style.bg} ${style.border} ${
                              isSelected ? 'ring-2 ring-sky-500 border-transparent scale-[1.03]' : ''
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-500 block">INTERMEDIATE (EPHEMERAL)</span>
                            <span className="text-xs font-bold text-white block truncate">{node.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Flow Arrow */}
                  <div className="flex justify-center text-slate-700 font-black text-sm">↓ ref()</div>

                  {/* Layer 4: Marts */}
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block mb-2">Marts Layer (Dimensions &amp; Facts - Analytical Schema)</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {Object.values(nodes).filter(n => n.type === 'mart').map(node => {
                        const style = getDbtNodeTypeStyle(node.type);
                        const isSelected = selectedNode === node.id;
                        return (
                          <button
                            key={node.id}
                            onClick={() => setSelectedNode(node.id)}
                            className={`p-3 rounded-2xl border text-left transition duration-200 ${style.bg} ${style.border} ${
                              isSelected ? 'ring-2 ring-purple-500 border-transparent scale-[1.03]' : ''
                            }`}
                          >
                            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-500 block">MART (TABLE)</span>
                            <span className="text-xs font-bold text-white block truncate">{node.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB CONTENT: DATA EXPLORER */}
            {activeLeftTab === 'data' && (
              <div className="flex-1 flex flex-col h-full justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Database size={15} className="text-teal-400" /> 
                      Schema Output: <span className="text-teal-400 font-mono">{selectedNodeData.name}</span>
                    </h4>
                    <span className="text-[10px] font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-400 uppercase tracking-wider">
                      {selectedNodeData.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-6">{selectedNodeData.description}</p>
                </div>

                <div className="flex-1 overflow-x-auto bg-slate-950/80 border border-slate-800 rounded-2xl p-4 max-h-[380px] overflow-y-auto">
                  {selectedNodeData.mockData.length > 0 ? (
                    <table className="w-full text-[11px] text-left border-collapse font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500">
                          {Object.keys(selectedNodeData.mockData[0]).map(key => (
                            <th key={key} className="pb-2 pr-4 font-black truncate">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedNodeData.mockData.map((row, idx) => (
                          <tr key={idx} className="border-b border-slate-900/50 hover:bg-white/[0.02]">
                            {Object.entries(row).map(([k, value]) => {
                              const isNull = value === null;
                              return (
                                <td key={k} className="py-2.5 pr-4 truncate max-w-[200px]" title={String(value)}>
                                  {isNull ? (
                                    <span className="text-rose-500/80 italic font-black uppercase text-[9px]">NULL</span>
                                  ) : typeof value === 'boolean' ? (
                                    value ? <span className="text-emerald-400 font-bold">TRUE</span> : <span className="text-slate-500">FALSE</span>
                                  ) : (
                                    String(value)
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-xs">
                      No records mock mapped for this node.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Code Editor & Live Terminal */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Section 1: Interactive Code Editor */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-5 flex flex-col min-h-[320px] shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-white/[0.06] pb-3 mb-4">
              <div className="flex items-center gap-1.5">
                <FileCode size={15} className="text-amber-400" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Model Code View
                </span>
              </div>

              {/* Editor Tabs */}
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveEditorTab('raw')}
                  className={`px-2.5 py-1 text-[10px] font-black rounded uppercase tracking-wider transition ${
                    activeEditorTab === 'raw' ? 'bg-amber-400/20 text-amber-400 font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Raw (Jinja)
                </button>
                <button
                  onClick={() => setActiveEditorTab('compiled')}
                  className={`px-2.5 py-1 text-[10px] font-black rounded uppercase tracking-wider transition ${
                    activeEditorTab === 'compiled' ? 'bg-amber-400/20 text-amber-400 font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Compiled SQL
                </button>
                <button
                  onClick={() => setActiveEditorTab('yaml')}
                  className={`px-2.5 py-1 text-[10px] font-black rounded uppercase tracking-wider transition ${
                    activeEditorTab === 'yaml' ? 'bg-amber-400/20 text-amber-400 font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  YAML Config
                </button>
              </div>
            </div>

            {/* Code Field */}
            <div className="flex-1 bg-slate-950 border border-slate-800/80 rounded-2xl p-4 font-mono text-[10.5px] leading-relaxed overflow-x-auto text-slate-300 whitespace-pre scrollbar-thin select-all">
              {activeEditorTab === 'raw' && selectedNodeData.rawSql}
              {activeEditorTab === 'compiled' && selectedNodeData.compiledSql}
              {activeEditorTab === 'yaml' && selectedNodeData.yamlConfig}
            </div>
            
            <div className="mt-2 text-[10px] text-slate-500 italic text-right flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Dynamic rendering based on selected DAG node above
            </div>
          </div>

          {/* Section 2: Terminal Simulation and Diagnostics */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/[0.06] rounded-3xl p-5 flex flex-col min-h-[300px] shadow-2xl relative">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/[0.06] pb-3 mb-4">
              <div className="flex items-center gap-1.5">
                <Terminal size={15} className="text-teal-400 animate-pulse" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  DBT Runner Console
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleDbtRun}
                  disabled={isRunning}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/30 text-slate-950 text-xs font-bold rounded-lg transition"
                >
                  <Play size={11} className="fill-slate-950 text-slate-950" />
                  dbt run
                </button>
                <button
                  onClick={handleDbtTest}
                  disabled={isRunning}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-500/30 text-slate-950 text-xs font-bold rounded-lg transition"
                >
                  <CheckCircle2 size={11} />
                  dbt test
                </button>
              </div>
            </div>

            {/* Diagnostic Switch - Anomaly Injector */}
            <div className="mb-4 flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className={injectAnomaly ? "text-rose-400 animate-pulse" : "text-slate-500"} />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black text-white uppercase tracking-wider">Inject Ingestion Anomaly</span>
                  <span className="text-[9px] text-slate-500 leading-none">Force a bad guest login ID anomaly</span>
                </div>
              </div>
              
              <button
                onClick={() => setInjectAnomaly(!injectAnomaly)}
                disabled={isRunning}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  injectAnomaly ? 'bg-rose-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    injectAnomaly ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Progress line */}
            {isRunning && (
              <div className="w-full bg-slate-950 rounded-full h-1.5 mb-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-500 to-sky-400 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${runProgress}%` }}
                />
              </div>
            )}

            {/* Terminal logs viewport */}
            <div className="flex-1 bg-slate-950 border border-slate-900 rounded-2xl p-4 font-mono text-[10px] text-emerald-400/90 leading-relaxed overflow-y-auto max-h-[190px] min-h-[160px] scrollbar-thin flex flex-col justify-start">
              {terminalOutput.map((line, index) => {
                const isCmd = line.startsWith('$');
                const isFail = line.includes('FAIL') || line.includes('ERROR') || line.includes('Failed');
                const isPass = line.includes('PASS') || line.includes('Successfully');
                
                let lineClass = 'text-teal-400/90';
                if (isCmd) lineClass = 'text-white font-bold';
                else if (isFail) lineClass = 'text-rose-400 font-bold';
                else if (isPass) lineClass = 'text-emerald-400 font-bold';
                
                return (
                  <div key={index} className={`whitespace-pre-wrap ${lineClass}`}>
                    {line}
                  </div>
                );
              })}
              <div ref={terminalEndRef} />
            </div>

            <div className="mt-2 text-[9px] text-slate-500 flex items-center justify-between">
              <span>Environment: <strong>dev_bq_datalake</strong></span>
              <span className="flex items-center gap-1 font-bold text-slate-400">
                <RefreshCw size={8} className={isRunning ? "animate-spin text-teal-400" : ""} />
                Ready to stream DBT logs
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* ── Lineage explaining cards block ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Sources explain */}
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-5 text-left">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl w-fit mb-3">
            <Database size={15} />
          </div>
          <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Sources (L0)</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Unstructured and nested database entries loaded straight from Firebase transactional logs into Google BigQuery schemas.
          </p>
        </div>

        {/* Staging explain */}
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-5 text-left">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl w-fit mb-3">
            <Eye size={15} />
          </div>
          <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Staging Layer (L1)</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Normalizes case naming conventions, enforces datatypes standardizations, extracts scalar values from JSON strings, and triggers data testing constraints.
          </p>
        </div>

        {/* Intermediate explain */}
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-5 text-left">
          <div className="p-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-xl w-fit mb-3">
            <GitBranch size={15} />
          </div>
          <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Intermediate (L2)</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Constructs ephemeral business logic: tracks session transitions, merges anonymous visitor actions with logged in profiles (user stitching).
          </p>
        </div>

        {/* Marts explain */}
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-3xl p-5 text-left">
          <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl w-fit mb-3">
            <Layers size={15} />
          </div>
          <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Marts Layer (L3)</h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Constructs dimensional facts and metrics optimized with partitioning policies for fast data queries inside downstream reporting charts and business intelligence.
          </p>
        </div>

      </div>

    </div>
  );
};
