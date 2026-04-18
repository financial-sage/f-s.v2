-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL,
  paid_by uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  concept text NOT NULL,
  split_type USER-DEFINED NOT NULL DEFAULT 'shared_equal'::expense_split_type,
  payer_share_pct numeric NOT NULL DEFAULT 50 CHECK (payer_share_pct >= 0::numeric AND payer_share_pct <= 100::numeric),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  category text,
  responsible_for text,
  is_settled boolean DEFAULT false,
  parent_id uuid,
  is_active boolean DEFAULT true,
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id),
  CONSTRAINT expenses_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES public.profiles(id),
  CONSTRAINT expenses_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.expenses(id)
);
CREATE TABLE public.families (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Nuestra familia'::text,
  user_1_id uuid NOT NULL,
  user_2_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  invite_code character varying CHECK (invite_code IS NULL OR invite_code::text ~ '^[A-Z0-9]{6}$'::text),
  CONSTRAINT families_pkey PRIMARY KEY (id),
  CONSTRAINT families_user_1_id_fkey FOREIGN KEY (user_1_id) REFERENCES public.profiles(id),
  CONSTRAINT families_user_2_id_fkey FOREIGN KEY (user_2_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  family_id uuid,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id)
);