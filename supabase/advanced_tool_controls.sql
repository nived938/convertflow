-- ConvertFlow Advanced Tools availability controls
-- Run once in the Supabase SQL Editor.

alter table public.site_control
  add column if not exists advanced_tools_enabled jsonb not null default '{"analyzer":true,"duplicates":true,"rename":true,"split":true,"merge":true,"contact":true,"palette":true,"blur":true,"pixelate":true,"qr":true,"scan":true,"barcode":true,"beautify":true,"favicon":true,"webp":true,"command":true,"ai-image":false,"tts":true}'::jsonb;

update public.site_control
set advanced_tools_enabled = coalesce(advanced_tools_enabled, '{}'::jsonb) || '{"analyzer":true,"duplicates":true,"rename":true,"split":true,"merge":true,"contact":true,"palette":true,"blur":true,"pixelate":true,"qr":true,"scan":true,"barcode":true,"beautify":true,"favicon":true,"webp":true,"command":true,"ai-image":false,"tts":true}'::jsonb
where id = 1;
