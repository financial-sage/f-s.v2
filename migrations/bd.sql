-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  type character varying NOT NULL,
  balance numeric DEFAULT 0.00,
  currency character varying DEFAULT 'USD'::character varying,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  icon character varying,
  color character varying DEFAULT '#6366f1'::character varying,
  bank_name character varying,
  last_four_digits character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT accounts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.admin_access_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid,
  action text,
  ip text,
  user_agent text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_access_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#000000'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  budget_limit numeric,
  is_default boolean NOT NULL DEFAULT false,
  icon text,
  type text,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL DEFAULT 'user'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.subcategories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subcategories_pkey PRIMARY KEY (id),
  CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  description text,
  category_id uuid,
  date timestamp with time zone NOT NULL DEFAULT now(),
  type text NOT NULL DEFAULT 'expense'::text,
  status text NOT NULL DEFAULT 'completed'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  source text DEFAULT 'manual'::text,
  external_id text,
  account_id uuid,
  destination_account_id uuid,
  subcategory_id uuid,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id),
  CONSTRAINT transactions_destination_account_id_fkey FOREIGN KEY (destination_account_id) REFERENCES public.accounts(id),
  CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
  CONSTRAINT transactions_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id)
);