-- ==============================================================================
-- BERYL — Database Schema Definition (Supabase / PostgreSQL)
-- Policy Guardrails for Autonomous Shopping Agents
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table (syncs from auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz default now() not null
);

-- 2. Mandates Table (User-defined policies & constraints)
-- Note: All monetary amounts are stored in integer cents (Rule #2)
create table if not exists public.mandates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  total_budget_cents bigint not null check (total_budget_cents >= 0),
  per_purchase_limit_cents bigint not null check (per_purchase_limit_cents >= 0),
  ask_above_cents bigint not null check (ask_above_cents >= 0),
  allowed_categories text[] not null default '{}',
  blocked_merchants text[] not null default '{}',
  expires_at timestamptz not null,
  is_frozen boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. Payment Requests Table
create table if not exists public.payment_requests (
  id uuid primary key default uuid_generate_v4(),
  mandate_id uuid not null references public.mandates(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  merchant text not null,
  category text not null,
  item_name text not null,
  item_url text,
  status text not null check (status in ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED')),
  raw_prompt text,
  created_at timestamptz default now() not null
);

-- 4. Decisions Table (Deterministic policy engine verdicts)
create table if not exists public.decisions (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references public.payment_requests(id) on delete cascade,
  mandate_id uuid not null references public.mandates(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  outcome text not null check (outcome in ('APPROVE', 'NEEDS_APPROVAL', 'BLOCK')),
  rule_code text not null,
  reason text not null,
  spent_before_cents bigint not null default 0,
  remaining_cents bigint not null default 0,
  latency_ms integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- 5. Approvals Table (Human-in-the-loop escalation queue)
create table if not exists public.approvals (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references public.payment_requests(id) on delete cascade,
  mandate_id uuid not null references public.mandates(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reason text,
  requested_at timestamptz default now() not null,
  decided_at timestamptz,
  decided_by uuid references public.profiles(id)
);

-- 6. Audit Events Table (Tamper-evident system trail)
create table if not exists public.audit_events (
  id uuid primary key default uuid_generate_v4(),
  request_id text,
  mandate_id text,
  user_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- Indexes for high-performance guard evaluation & dashboard queries
create index if not exists idx_mandates_user_id on public.mandates(user_id);
create index if not exists idx_payment_requests_mandate_id on public.payment_requests(mandate_id);
create index if not exists idx_decisions_mandate_id on public.decisions(mandate_id);
create index if not exists idx_decisions_request_id on public.decisions(request_id);
create index if not exists idx_approvals_mandate_id on public.approvals(mandate_id);
create index if not exists idx_approvals_status on public.approvals(status);
create index if not exists idx_audit_events_created_at on public.audit_events(created_at desc);
