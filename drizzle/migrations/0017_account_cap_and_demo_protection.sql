CREATE OR REPLACE FUNCTION public.guard_account_creation()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
 IF NEW.kind <> 'main' THEN
  IF NEW.parent_account_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.accounts WHERE id=NEW.parent_account_id AND user_id=NEW.user_id AND kind='main' AND currency=NEW.currency) THEN RAISE EXCEPTION 'Un sous-compte doit être rattaché à votre Compte Principal'; END IF;
  IF NOT NEW.has_dedicated_pin OR NEW.target IS NULL OR NEW.target<=0 OR NEW.visual_key IS NULL OR NOT public.valid_account_visual(NEW.visual_key) THEN RAISE EXCEPTION 'Objectif, code dédié et visuel requis'; END IF;
  IF (SELECT count(*) FROM public.accounts WHERE user_id=NEW.user_id AND kind<>'main') >= 8 THEN RAISE EXCEPTION 'Limite atteinte : 8 sous-comptes maximum (10 comptes au total)'; END IF;
 END IF;
 RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.protect_demo_data()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
 IF EXISTS(SELECT 1 FROM public.profiles WHERE user_id=OLD.user_id AND is_demo) THEN
  RAISE EXCEPTION 'Données de démonstration protégées : suppression interdite';
 END IF;
 RETURN OLD;
END $function$;

DROP TRIGGER IF EXISTS protect_demo_accounts ON public.accounts;
CREATE TRIGGER protect_demo_accounts BEFORE DELETE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.protect_demo_data();
DROP TRIGGER IF EXISTS protect_demo_transactions ON public.transactions;
CREATE TRIGGER protect_demo_transactions BEFORE DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.protect_demo_data();
DROP TRIGGER IF EXISTS protect_demo_profiles ON public.profiles;
CREATE TRIGGER protect_demo_profiles BEFORE DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_demo_data();