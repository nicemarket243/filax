ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS parent_account_id uuid REFERENCES public.accounts(id);
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS visual_key text;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS target numeric;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS has_dedicated_pin boolean NOT NULL DEFAULT false;
CREATE TABLE public.account_security (account_id uuid PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE, pin_hash text NOT NULL);
GRANT ALL ON public.account_security TO service_role;
ALTER TABLE public.account_security ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.valid_account_visual(_key text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT _key = ANY(ARRAY['bank-modern','bank-classic','wedding','house','apartment','land','car','motorcycle','airplane','beach','university','studies','business','office','construction','family','health','solar','farm','shop','boat','technology','retirement','watch']) $$;
CREATE FUNCTION public.create_subaccount(_parent uuid, _name text, _target numeric, _pin text, _visual text, _locked_until timestamptz DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE p public.accounts; aid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
 SELECT * INTO p FROM public.accounts WHERE id=_parent AND user_id=auth.uid() AND kind='main' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Choisissez votre Compte Principal'; END IF;
 IF length(trim(_name)) NOT BETWEEN 2 AND 80 OR _target IS NULL OR _target <= 0 OR _target > 1000000000000 OR _target::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Nom ou objectif invalide'; END IF;
 IF _pin IS NULL OR _pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'Code dédié : 4 chiffres requis'; END IF;
 IF _visual IS NULL OR NOT public.valid_account_visual(_visual) THEN RAISE EXCEPTION 'Visuel invalide'; END IF;
 IF _locked_until IS NOT NULL AND _locked_until <= now() THEN RAISE EXCEPTION 'Date de blocage invalide'; END IF;
 INSERT INTO public.accounts(user_id,name,kind,currency,parent_account_id,target,visual_key,locked_until,has_dedicated_pin) VALUES(auth.uid(),trim(_name),CASE WHEN _locked_until IS NULL THEN 'savings' ELSE 'locked' END,p.currency,p.id,_target,_visual,_locked_until,true) RETURNING id INTO aid;
 INSERT INTO public.account_security VALUES(aid,crypt(_pin,gen_salt('bf',10)));
 RETURN aid;
END $$;
REVOKE ALL ON FUNCTION public.create_subaccount(uuid,text,numeric,text,text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_subaccount(uuid,text,numeric,text,text,timestamptz) TO authenticated;
CREATE FUNCTION public.set_account_visual(_account uuid,_visual text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR _visual IS NULL OR NOT public.valid_account_visual(_visual) THEN RAISE EXCEPTION 'Visuel invalide'; END IF;
 UPDATE public.accounts SET visual_key=_visual WHERE id=_account AND user_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_account_visual(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_account_visual(uuid,text) TO authenticated;
CREATE FUNCTION public.guard_account_creation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.kind <> 'main' THEN
 IF NEW.parent_account_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.accounts WHERE id=NEW.parent_account_id AND user_id=NEW.user_id AND kind='main' AND currency=NEW.currency) THEN RAISE EXCEPTION 'Un sous-compte doit être rattaché à votre Compte Principal'; END IF;
 IF NOT NEW.has_dedicated_pin OR NEW.target IS NULL OR NEW.target<=0 OR NEW.visual_key IS NULL OR NOT public.valid_account_visual(NEW.visual_key) THEN RAISE EXCEPTION 'Objectif, code dédié et visuel requis'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER account_creation_hierarchy BEFORE INSERT ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.guard_account_creation();
REVOKE INSERT ON public.accounts FROM authenticated;
CREATE FUNCTION public.guard_account_outflow() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.balance < OLD.balance AND EXISTS(SELECT 1 FROM public.account_security WHERE account_id=OLD.id) AND COALESCE(current_setting('filax.authorized_account',true),'')<>OLD.id::text THEN RAISE EXCEPTION 'Code du sous-compte requis'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER account_outflow_pin BEFORE UPDATE OF balance ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.guard_account_outflow();
CREATE FUNCTION public.account_outflow(_account uuid,_operation text,_amount numeric,_pin text DEFAULT '',_global_pin text DEFAULT '',_destination text DEFAULT '',_related uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE a public.accounts; h text; tx uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non connecté'; END IF;
 IF _amount IS NULL OR _amount<=0 OR _amount>1000000000000 OR _amount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Montant invalide'; END IF;
 SELECT * INTO a FROM public.accounts WHERE id=_account AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Compte introuvable'; END IF;
 IF a.status<>'active' OR (a.locked_until IS NOT NULL AND a.locked_until>now()) THEN RAISE EXCEPTION 'Compte bloqué'; END IF;
 SELECT pin_hash INTO h FROM public.account_security WHERE account_id=a.id;
 IF h IS NOT NULL AND (_pin IS NULL OR _pin !~ '^[0-9]{4}$' OR crypt(_pin,h)<>h) THEN RAISE EXCEPTION 'Code du sous-compte incorrect'; END IF;
 PERFORM set_config('filax.authorized_account',a.id::text,true);
 CASE _operation
 WHEN 'withdraw' THEN
 IF _destination NOT IN ('orange','airtel','mpesa','banque','carte','filax') THEN RAISE EXCEPTION 'Moyen invalide'; END IF;
 tx:=public.withdraw(a.id,_amount,_destination);
 WHEN 'transfer' THEN
 IF _destination IS NULL OR length(_destination)>30 OR _destination !~ '^FLX-[A-Z0-9-]+$' THEN RAISE EXCEPTION 'ID FILAX invalide'; END IF;
 tx:=public.transfer(a.id,_destination,_amount,_global_pin);
 WHEN 'external' THEN
 IF length(trim(_destination)) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Destinataire invalide'; END IF;
 tx:=public.transfer_external(a.id,_amount,_destination,_global_pin);
 WHEN 'goal' THEN PERFORM public.fund_goal(_related,a.id,_amount);
 WHEN 'contribute' THEN PERFORM public.contribute(_related,a.id,_amount);
 ELSE RAISE EXCEPTION 'Opération invalide';
 END CASE;
 PERFORM set_config('filax.authorized_account','',true);
 RETURN jsonb_build_object('ok',true,'transaction_id',tx);
END $$;
REVOKE ALL ON FUNCTION public.account_outflow(uuid,text,numeric,text,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.account_outflow(uuid,text,numeric,text,text,text,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.guard_account_creation(),public.guard_account_outflow() FROM PUBLIC,anon,authenticated;