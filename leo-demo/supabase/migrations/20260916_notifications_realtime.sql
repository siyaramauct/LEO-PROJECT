-- Adds the notifications table to the realtime publication so the
-- NotificationBell component can subscribe to INSERT events per recipient.
-- Safe to re-run: skips the ALTER if the table is already published.
do $$
begin
    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
            and schemaname = 'public'
            and tablename = 'notifications'
    ) then
        alter publication supabase_realtime add table public.notifications;
    end if;
end $$;