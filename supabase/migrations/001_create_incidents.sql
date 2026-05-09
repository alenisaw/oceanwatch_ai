create extension if not exists pgcrypto;

create table if not exists public.incidents (
    id uuid primary key default gen_random_uuid(),
    incident_id text not null unique,
    source jsonb not null default '{}'::jsonb,
    risk_level text not null,
    confidence double precision not null,
    affected_pixel_ratio double precision not null,
    regions_detected integer not null default 0,
    report text not null,
    payload jsonb not null,
    created_at timestamptz not null default now()
);

create index if not exists incidents_risk_level_idx
    on public.incidents (risk_level);

create index if not exists incidents_created_at_idx
    on public.incidents (created_at desc);
