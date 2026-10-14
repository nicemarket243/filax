CREATE OR REPLACE FUNCTION public.find_recipient(_identifier text)
RETURNS TABLE(name text, filax_id text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), p.filax_id
  FROM profiles p
  WHERE auth.uid() IS NOT NULL AND p.user_id <> auth.uid() AND p.filax_id IS NOT NULL
    AND length(trim(_identifier)) >= 5
    AND (upper(p.filax_id) = upper(trim(_identifier))
      OR lower(p.email) = lower(trim(_identifier))
      OR (length(regexp_replace(_identifier,'\D','','g')) >= 9
          AND right(regexp_replace(coalesce(p.phone,''),'\D','','g'), 9) = right(regexp_replace(_identifier,'\D','','g'), 9)))
  LIMIT 1
$$;