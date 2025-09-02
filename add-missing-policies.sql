-- Add missing UPDATE and DELETE policies for patients and reports
-- Run this script in your Supabase SQL editor

-- Add missing policies for patients table
create policy "anon update patients" on public.patients for update using (true);
create policy "anon delete patients" on public.patients for delete using (true);

-- Add missing policies for reports table  
create policy "anon update reports" on public.reports for update using (true);
create policy "anon delete reports" on public.reports for delete using (true);
