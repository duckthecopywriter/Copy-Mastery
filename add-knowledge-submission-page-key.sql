-- Run this once in Supabase Dashboard > SQL Editor.
-- Existing submissions default to the 41 Kỹ thuật bán hàng page.
alter table public.knowledge_submissions
  add column if not exists page_key text not null default 'kt41';

create index if not exists knowledge_submissions_status_page_key_idx
  on public.knowledge_submissions (status, page_key);

notify pgrst, 'reload schema';
