SET local check_function_bodies = off;

CREATE TABLE "public"."expenses" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "family_id"         uuid                     NOT NULL,
  "paid_by"           uuid                     NOT NULL,
  "amount"            numeric(12,2)            NOT NULL,
  "concept"           text                     NOT NULL,
  "payer_share_pct"   numeric(5,2)             NOT NULL DEFAULT 50,
  "expense_date"      date                     NOT NULL DEFAULT CURRENT_DATE,
  "created_at"        timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "category"          text,
  "responsible_for"   text,
  "is_settled"        boolean                  DEFAULT false,
  "parent_id"         uuid,
  "is_active"         boolean                  DEFAULT true,
  "created_by"        uuid,
  "updated_by"        uuid,
  "fund_id"           uuid,
  "paid_from_fund"    boolean                  DEFAULT false,
  "transfer_group_id" uuid,
  CONSTRAINT "expenses_amount_check" CHECK ((amount > (0)::numeric)),
  CONSTRAINT "expenses_payer_share_pct_check" CHECK (((payer_share_pct >= (0)::numeric) AND (payer_share_pct <= (100)::numeric))),
  CONSTRAINT "expenses_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."expenses"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."families" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"             text                     NOT NULL DEFAULT 'Nuestra familia'::text,
  "user_1_id"        uuid                     NOT NULL,
  "user_2_id"        uuid,
  "created_at"       timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "invite_code"      character varying(6),
  "financial_model"  text                     NOT NULL DEFAULT 'joint_fund'::text,
  "user_1_split_pct" numeric                  NOT NULL DEFAULT 50,
  CONSTRAINT "families_different_users" CHECK (((user_2_id IS NULL) OR (user_1_id <> user_2_id))),
  CONSTRAINT "families_invite_code_format" CHECK (((invite_code IS NULL) OR ((invite_code)::text ~ '^[A-Z0-9]{6}$'::text))),
  CONSTRAINT "families_pkey" PRIMARY KEY (id),
  CONSTRAINT "families_user_1_split_pct_check" CHECK (((user_1_split_pct >= (0)::numeric) AND (user_1_split_pct <= (100)::numeric)))
);

ALTER TABLE "public"."families"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."family_funds" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "family_id"        uuid                     NOT NULL,
  "name"             text                     NOT NULL,
  "scope"            text                     NOT NULL,
  "owner_profile_id" uuid,
  "is_default"       boolean                  NOT NULL DEFAULT false,
  "is_system"        boolean                  NOT NULL DEFAULT false,
  "sort_order"       integer                  NOT NULL DEFAULT 0,
  "archived_at"      timestamp with time zone,
  "created_at"       timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "updated_at"       timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "color"            text,
  CONSTRAINT "family_funds_personal_owner_chk" CHECK ((((scope = 'personal'::text) AND (owner_profile_id IS
    NOT NULL)) OR ((scope = 'shared'::text) AND (owner_profile_id IS NULL)))),
  CONSTRAINT "family_funds_pkey" PRIMARY KEY (id),
  CONSTRAINT "family_funds_scope_check" CHECK ((scope = ANY (ARRAY['shared'::text, 'personal'::text])))
);

ALTER TABLE "public"."family_funds"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"         uuid                     NOT NULL,
  "full_name"  text,
  "avatar_url" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "updated_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "family_id"  uuid,
  "is_premium" boolean                  DEFAULT false,
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."promotional_campaigns" (
  "id"            uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"          text                     NOT NULL,
  "is_active"     boolean                  DEFAULT false,
  "max_users"     integer                  DEFAULT 100,
  "current_users" integer                  DEFAULT 0,
  "ends_at"       timestamp with time zone,
  CONSTRAINT "promotional_campaigns_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."promotional_campaigns"
  ENABLE ROW LEVEL SECURITY;

CREATE TYPE "public"."expense_split_type" AS ENUM (
  'personal',
  'shared_equal',
  'shared_custom',
  'p2p_debt'
);

ALTER TABLE "public"."expenses"
  ADD COLUMN "split_type" public.expense_split_type NOT NULL DEFAULT 'shared_equal'::public.expense_split_type;

CREATE OR REPLACE FUNCTION public.edit_expense_immutable (
  p_original_id uuid,
  p_new_amount  numeric,
  p_new_concept text
)
  RETURNS uuid
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_original RECORD;
  v_new_id UUID;
BEGIN
  -- Bloquear la fila original para evitar condiciones de carrera (Race conditions)
  SELECT * INTO v_original FROM expenses WHERE id = p_original_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gasto original no encontrado';
  END IF;

  -- A. Desactivar el asiento original (Soft Delete)
  UPDATE expenses SET is_active = false WHERE id = p_original_id;

  -- B. Insertar el asiento de reversión (Monto negativo para cuadrar los libros de auditoría, oculto en UI)
  INSERT INTO expenses (
    family_id, paid_by, amount, concept, split_type, payer_share_pct, 
    expense_date, category, responsible_for, is_settled, is_active, parent_id
  ) VALUES (
    v_original.family_id, v_original.paid_by, -v_original.amount, 
    'REVERSIÓN: ' || v_original.concept, v_original.split_type, v_original.payer_share_pct, 
    v_original.expense_date, v_original.category, v_original.responsible_for, 
    v_original.is_settled, false, p_original_id
  );

  -- C. Insertar el NUEVO asiento corregido (Activo)
  INSERT INTO expenses (
    family_id, paid_by, amount, concept, split_type, payer_share_pct, 
    expense_date, category, responsible_for, is_settled, is_active, parent_id
  ) VALUES (
    v_original.family_id, v_original.paid_by, p_new_amount, 
    p_new_concept, v_original.split_type, v_original.payer_share_pct, 
    v_original.expense_date, v_original.category, v_original.responsible_for, 
    false, true, p_original_id -- Nace como no liquidado y apuntando al padre
  ) RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$function$;

ALTER TABLE "public"."expenses"
  ADD CONSTRAINT "expenses_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.expenses(id);

ALTER TABLE "public"."expenses"
  ADD CONSTRAINT "expenses_family_id_fkey" FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;

ALTER TABLE "public"."family_funds"
  ADD CONSTRAINT "family_funds_family_id_fkey" FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;

ALTER TABLE "public"."expenses"
  ADD CONSTRAINT "expenses_fund_id_fkey" FOREIGN KEY (fund_id) REFERENCES public.family_funds(id);

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_family_id_fkey" FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE SET NULL;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."expenses"
  ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE "public"."expenses"
  ADD CONSTRAINT "expenses_paid_by_fkey" FOREIGN KEY (paid_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE "public"."expenses"
  ADD CONSTRAINT "expenses_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id);

ALTER TABLE "public"."families"
  ADD CONSTRAINT "families_user_1_id_fkey" FOREIGN KEY (user_1_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."families"
  ADD CONSTRAINT "families_user_2_id_fkey" FOREIGN KEY (user_2_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."family_funds"
  ADD CONSTRAINT "family_funds_owner_profile_id_fkey" FOREIGN KEY (owner_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX expenses_family_date_idx ON public.expenses USING btree (family_id, expense_date DESC);

CREATE INDEX expenses_fund_id_idx ON public.expenses USING btree (fund_id);

CREATE INDEX expenses_paid_by_idx ON public.expenses USING btree (paid_by);

CREATE INDEX expenses_transfer_group_id_idx ON public.expenses USING btree (transfer_group_id);

CREATE UNIQUE INDEX families_invite_code_key ON public.families USING btree (invite_code);

CREATE UNIQUE INDEX families_unique_pair_idx ON public.families USING btree (LEAST((user_1_id)::text, (user_2_id)::text), GREATEST((user_1_id)::text, (user_2_id)::text));

CREATE INDEX family_funds_family_id_idx ON public.family_funds USING btree (family_id);

CREATE INDEX family_funds_owner_idx ON public.family_funds USING btree (owner_profile_id);

CREATE UNIQUE INDEX family_funds_personal_name_uq ON public.family_funds USING btree (family_id, owner_profile_id, lower(name))
  WHERE ((scope = 'personal'::text) AND (archived_at IS NULL));

CREATE UNIQUE INDEX family_funds_shared_name_uq ON public.family_funds USING btree (family_id, lower(name))
  WHERE ((scope = 'shared'::text) AND (archived_at IS NULL));

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER expenses_set_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER families_set_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "expenses_delete_family_member" ON "public"."expenses"
  FOR DELETE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.families f
  WHERE ((f.id = expenses.family_id) AND ((f.user_1_id = auth.uid()) OR (f.user_2_id = auth.uid()))))));

CREATE POLICY "expenses_insert_family_member" ON "public"."expenses"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.families f
  WHERE ((f.id = expenses.family_id) AND ((f.user_1_id = auth.uid()) OR (f.user_2_id = auth.uid()))))));

CREATE POLICY "expenses_select_family_member" ON "public"."expenses"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.families f
  WHERE ((f.id = expenses.family_id) AND ((f.user_1_id = auth.uid()) OR (f.user_2_id = auth.uid()))))));

CREATE POLICY "expenses_update_family_member" ON "public"."expenses"
  FOR UPDATE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.families f
  WHERE ((f.id = expenses.family_id) AND ((f.user_1_id = auth.uid()) OR (f.user_2_id = auth.uid()))))));

CREATE POLICY "families_insert_member" ON "public"."families"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (((auth.uid() = user_1_id) OR (auth.uid() = user_2_id)));

CREATE POLICY "families_select_member" ON "public"."families"
  FOR SELECT
  TO PUBLIC
  USING (((auth.uid() = user_1_id) OR (auth.uid() = user_2_id)));

CREATE POLICY "families_update_member" ON "public"."families"
  FOR UPDATE
  TO PUBLIC
  USING (((auth.uid() = user_1_id) OR (auth.uid() = user_2_id)));

CREATE POLICY "family_funds_insert_member" ON "public"."family_funds"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((family_id IN ( SELECT profiles.family_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

CREATE POLICY "family_funds_select_member" ON "public"."family_funds"
  FOR SELECT
  TO PUBLIC
  USING ((family_id IN ( SELECT profiles.family_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

CREATE POLICY "family_funds_update_member" ON "public"."family_funds"
  FOR UPDATE
  TO PUBLIC
  USING ((family_id IN ( SELECT profiles.family_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));

CREATE POLICY "profiles_insert_self" ON "public"."profiles"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "profiles_select_self_or_family" ON "public"."profiles"
  FOR SELECT
  TO PUBLIC
  USING (((auth.uid() = id) OR (EXISTS ( SELECT 1
   FROM public.families f
  WHERE (((f.user_1_id = auth.uid()) OR (f.user_2_id = auth.uid())) AND ((f.user_1_id = profiles.id) OR (f.user_2_id = profiles.id)))))));

CREATE POLICY "profiles_update_self" ON "public"."profiles"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = id));

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."expenses";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."families";

ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."profiles";

GRANT EXECUTE ON FUNCTION "public"."edit_expense_immutable"(uuid, numeric, text) TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."edit_expense_immutable"(uuid, numeric, text) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."edit_expense_immutable"(uuid, numeric, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."edit_expense_immutable"(uuid, numeric, text) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expenses" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."expenses" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expenses" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."expenses" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."families" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."families" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."families" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."families" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."family_funds" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."family_funds" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."family_funds" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."family_funds" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."profiles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."promotional_campaigns" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."promotional_campaigns" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."promotional_campaigns" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."promotional_campaigns" TO "service_role";

