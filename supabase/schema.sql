-- Выполнить в SQL Editor бесплатного проекта Supabase.
create table if not exists public.budgets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.budgets enable row level security;
revoke all on public.budgets from anon;
grant select, insert, update, delete on public.budgets to authenticated;
create policy "Read own budget" on public.budgets for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own budget" on public.budgets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own budget" on public.budgets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own budget" on public.budgets for delete to authenticated using ((select auth.uid()) = user_id);
