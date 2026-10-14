CREATE OR REPLACE FUNCTION public.guard_kyc_requires_pin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.kyc_status IN ('pending','verified')
     AND NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
     AND NOT COALESCE(NEW.is_demo, false)
     AND NOT EXISTS (SELECT 1 FROM public.user_security s WHERE s.user_id = NEW.user_id AND s.pin_hash IS NOT NULL) THEN
    RAISE EXCEPTION 'Créez votre code PIN à 4 chiffres avant la vérification d''identité';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_kyc_requires_pin ON public.profiles;
CREATE TRIGGER profiles_kyc_requires_pin BEFORE UPDATE OF kyc_status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_kyc_requires_pin();