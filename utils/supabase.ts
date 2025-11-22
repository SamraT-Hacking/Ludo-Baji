




import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace with your actual Supabase project URL and anon key
// You can find these in your Supabase project settings under API.
const supabaseUrl = 'https://aoncfgcauhvxpvguqeoh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbmNmZ2NhdWh2eHB2Z3VxZW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4ODQxODcsImV4cCI6MjA3ODQ2MDE4N30.k0LOxXgNV1O8mR3FALRMzL-5frqO2PprWsL6wwCXuAE';

const isConfigured = supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("PASTE_YOUR");

export const supabase = isConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
export { isConfigured };

/*
================================================================================
!! COMPLETE & IDEMPOTENT DATABASE SETUP SCRIPT !!
================================================================================
Run this entire script in your Supabase SQL Editor to set up the backend.
This script handles Tables, Enums, RLS Policies, Functions, Triggers, and Seeding.
================================================================================

-- Run this command in your Supabase SQL Editor.
--------------------------------------------------------------------------------

-- Section 1: TYPE DEFINITIONS
--------------------------------------------------------------------------------
-- Create the transaction_type enum, re-adding referral bonus
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
        DROP TYPE public.transaction_type;
    END IF;
    CREATE TYPE public.transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'ENTRY_FEE', 'WINNINGS', 'REFUND', 'CLAWBACK', 'REFERRAL_BONUS');
END$$;


-- Section 2: TABLE CREATION
--------------------------------------------------------------------------------
-- Profiles Table (references auth.users) - with device_id
create table if not exists public.profiles (
  id uuid not null primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone,
  username text,
  deposit_balance numeric(10, 2) not null default 0.00,
  winnings_balance numeric(10, 2) not null default 0.00,
  wins integer not null default 0,
  losses integer not null default 0,
  rating integer not null default 1000,
  is_banned boolean not null default false,
  role text default 'user',
  referral_code text unique not null default substr(md5(random()::text), 0, 7),
  referred_by uuid references public.profiles(id) on delete set null,
  device_id text unique -- ADDED FOR DEVICE VERIFICATION
);

-- Tournaments Table
create table if not exists public.tournaments (
    id uuid not null primary key default gen_random_uuid(),
    created_at timestamp with time zone default now(),
    game_number integer not null unique,
    title text not null,
    entry_fee numeric(10, 2) not null default 0.00,
    prize_pool numeric(10, 2) not null default 0.00,
    max_players integer not null default 4,
    status text not null default 'UPCOMING', -- UPCOMING, ACTIVE, COMPLETED, UNDER_REVIEW, CANCELLED
    players_joined jsonb not null default '[]'::jsonb,
    game_code text null
);

-- Tournament Results Table
create table if not exists public.tournament_results (
    id uuid not null primary key default gen_random_uuid(),
    created_at timestamp with time zone default now(),
    tournament_id uuid not null references public.tournaments(id) on delete cascade,
    user_id uuid not null references public.profiles(id),
    result text not null, -- WIN, LOSE, CANCELLED
    reason text null,
    screenshot_url text null,
    unique(tournament_id, user_id)
);

-- Transactions Table
create table if not exists public.transactions (
  id uuid not null primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  user_id uuid not null references public.profiles(id),
  amount numeric(10, 2) not null,
  type public.transaction_type not null,
  status text not null, -- PENDING, COMPLETED, FAILED, REJECTED
  description text,
  source_user_id uuid references public.profiles(id) null
);

-- Notifications & Read Status Tables
create table if not exists public.notifications (
    id uuid not null primary key default gen_random_uuid(),
    created_at timestamp with time zone default now(),
    title text not null,
    content text not null,
    target_user_ids uuid[] null
);
create table if not exists public.notification_read_status (
    id uuid not null primary key default gen_random_uuid(),
    notification_id uuid not null references public.notifications(id) on delete cascade,
    user_id uuid not null references public.profiles(id),
    read_at timestamp with time zone default now(),
    unique(notification_id, user_id)
);

-- App Settings Table (for rules, admin status, etc.)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- How to Play Videos Table
create table if not exists public.how_to_play_videos (
    id uuid not null primary key default gen_random_uuid(),
    created_at timestamp with time zone default now(),
    title text not null,
    youtube_url text not null
);

-- Game Turn History Table
CREATE TABLE IF NOT EXISTS public.game_turn_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    username TEXT,
    description TEXT NOT NULL
);

-- In-Game Chat Messages Table (Schema Correction)
-- This command drops the existing table to ensure a clean, correct schema.
-- WARNING: This will delete all existing chat messages.
DROP TABLE IF EXISTS public.chat_messages CASCADE;
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    username TEXT,
    message_text TEXT NOT NULL
);

-- Support Chats Table
CREATE TABLE IF NOT EXISTS public.support_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username TEXT,
    message_text TEXT NOT NULL,
    sent_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE
);

-- Group Chat Messages Table
CREATE TABLE IF NOT EXISTS public.group_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username TEXT,
    message_text TEXT NOT NULL
);


-- Deposit Gateway Logs Table (For Debugging Payments)
CREATE TABLE IF NOT EXISTS public.deposit_gateway_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    invoice_id TEXT,
    transaction_id TEXT,
    gateway TEXT,
    raw_response JSONB
);

-- UPDATE: Add columns for specific payment details
ALTER TABLE public.deposit_gateway_logs 
ADD COLUMN IF NOT EXISTS sender_number TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT;


-- Section 3: HELPER FUNCTIONS & TRIGGERS
--------------------------------------------------------------------------------

-- ADDED FOR DEVICE VERIFICATION: Ensure device_id column exists and is unique
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_device_id_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_device_id_key UNIQUE (device_id);

-- is_admin check function
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1
    from public.profiles
    where public.profiles.id = auth.uid() and public.profiles.role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- New user trigger function (MODIFIED for device ID)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  referrer_id uuid;
  user_referral_code text;
  user_device_id text;
begin
  -- Get referral code from sign-up metadata
  user_referral_code := new.raw_user_meta_data->>'referral_code';
  
  -- Get device ID from sign-up metadata
  user_device_id := new.raw_user_meta_data->>'device_id';

  -- Check if device ID is provided; if not, block the signup.
  if user_device_id is null or user_device_id = '' then
     raise exception 'A unique device identifier is required for signup.';
  end if;
  
  -- Find the referrer's ID if the code is valid
  if user_referral_code is not null and user_referral_code <> '' then
    select id into referrer_id from public.profiles where referral_code = user_referral_code;
  end if;

  -- Insert new user with device ID. The unique constraint will handle duplicates.
  insert into public.profiles (id, username, referred_by, device_id)
  values (new.id, new.raw_user_meta_data->>'full_name', referrer_id, user_device_id);
  
  return new;
end;
$$ language plpgsql security definer;


-- Attach trigger to auth.users table
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
  
-- Insert default app settings
INSERT INTO public.app_settings (key, value)
VALUES 
  ('admin_commission_percent', '{"percentage": 10}'),
  ('referral_bonus_amount', '{"amount": 20}'),
  ('referee_bonus_amount', '{"amount": 10}'),
  ('referral_match_bonus', '{"amount": 1}'),
  ('deposit_gateway_settings', '{"active_gateway": "offline", "uddoktapay": {"api_key": "", "api_url": ""}, "paytm": {"merchant_id": "", "merchant_key": ""}, "offline": {"instructions": "Please send money to bKash number 01234567890 and enter the transaction ID below."}}'),
  ('group_chat_status', '{"enabled": true}'),
  ('home_page_config', '{
    "about_image": "https://i.imgur.com/PhJByIb.jpeg",
    "screenshots": [
      "https://picsum.photos/400/800?random=1",
      "https://picsum.photos/400/800?random=2",
      "https://picsum.photos/400/800?random=3",
      "https://picsum.photos/400/800?random=4",
      "https://picsum.photos/400/800?random=5",
      "https://picsum.photos/400/800?random=6"
    ],
    "avatars": [
      "https://i.pravatar.cc/150?u=a042581f4e29026704d",
      "https://i.pravatar.cc/150?u=a042581f4e29026704e",
      "https://i.pravatar.cc/150?u=a042581f4e29026704f"
    ]
  }')
ON CONFLICT (key) DO NOTHING;


-- Section 4: ROW LEVEL SECURITY (RLS) POLICIES
--------------------------------------------------------------------------------
-- Enable RLS and define policies for all tables
-- Profiles
alter table public.profiles enable row level security;
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);

-- FIX: Split the general 'manage' policy into explicit INSERT and UPDATE/DELETE policies
-- This resolves a common issue with auth triggers not having sufficient permission to create a profile.
drop policy if exists "Users can manage their own profile." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);

-- The previous combined 'update, delete' policy caused a syntax error. 
-- Splitting into separate policies for maximum compatibility.
drop policy if exists "Users can update and delete their own profile." on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;
create policy "Users can update their own profile." on public.profiles for update using (auth.uid() = id);
drop policy if exists "Users can delete their own profile." on public.profiles;
create policy "Users can delete their own profile." on public.profiles for delete using (auth.uid() = id);

drop policy if exists "Admins can manage any profile." on public.profiles;
create policy "Admins can manage any profile." on public.profiles for all using (public.is_admin());

-- Tournaments
alter table public.tournaments enable row level security;
drop policy if exists "Tournaments are viewable by everyone." on public.tournaments;
create policy "Tournaments are viewable by everyone." on public.tournaments for select using (true);
drop policy if exists "Admins can manage tournaments." on public.tournaments;
create policy "Admins can manage tournaments." on public.tournaments for all using (public.is_admin());
drop policy if exists "Authenticated users can join tournaments." on public.tournaments;
create policy "Authenticated users can join tournaments." on public.tournaments for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Tournament Results
alter table public.tournament_results enable row level security;
drop policy if exists "Users can view their own results." on public.tournament_results;
drop policy if exists "Players can view results for their own tournaments." on public.tournament_results;
create policy "Players can view results for their own tournaments." on public.tournament_results for select using (
  EXISTS (
    SELECT 1 FROM public.tournaments t WHERE t.id = public.tournament_results.tournament_id AND t.players_joined @> jsonb_build_array(jsonb_build_object('id', auth.uid()))
  )
);
drop policy if exists "Users can submit their own results." on public.tournament_results;
create policy "Users can submit their own results." on public.tournament_results for insert with check (user_id = auth.uid());
drop policy if exists "Admins can manage all results." on public.tournament_results;
create policy "Admins can manage all results." on public.tournament_results for all using (public.is_admin());

-- Transactions
alter table public.transactions enable row level security;
-- Allow authenticated users to view all transactions for leaderboards, etc.
drop policy if exists "Authenticated users can view all transactions." on public.transactions;
create policy "Authenticated users can view all transactions." on public.transactions for select using (auth.role() = 'authenticated');
-- Allow users to fully manage their own transactions.
drop policy if exists "Users can manage their own transactions." on public.transactions;
create policy "Users can manage their own transactions." on public.transactions for all using (user_id = auth.uid());
drop policy if exists "Admins can manage all transactions." on public.transactions;
create policy "Admins can manage all transactions." on public.transactions for all using (public.is_admin());

-- Notifications
alter table public.notifications enable row level security;
alter table public.notification_read_status enable row level security;
drop policy if exists "Notifications are public." on public.notifications;
create policy "Notifications are public." on public.notifications for select using (true);
drop policy if exists "Admins can manage notifications." on public.notifications;
create policy "Admins can manage notifications." on public.notifications for all using (public.is_admin());
drop policy if exists "Users can manage their read status." on public.notification_read_status;
create policy "Users can manage their read status." on public.notification_read_status for all using (user_id = auth.uid());

-- App Settings
alter table public.app_settings enable row level security;
drop policy if exists "Allow all users to read settings" on public.app_settings;
create policy "Allow all users to read settings" on public.app_settings for select using (true);
drop policy if exists "Allow admins to manage settings" on public.app_settings;
create policy "Allow admins to manage settings" on public.app_settings for all using (public.is_admin());

-- How to Play Videos
alter table public.how_to_play_videos enable row level security;
drop policy if exists "Allow all users to read videos" on public.how_to_play_videos;
create policy "Allow all users to read videos" on public.how_to_play_videos for select using (true);
drop policy if exists "Allow admins to manage videos" on public.how_to_play_videos;
create policy "Allow admins to manage videos" on public.how_to_play_videos for all using (public.is_admin());

-- Game Turn History
alter table public.game_turn_history enable row level security;
drop policy if exists "Allow admins to see all turn history" on public.game_turn_history;
create policy "Allow admins to see all turn history" on public.game_turn_history for select using (public.is_admin());
drop policy if exists "Allow players in a tournament to see their turn history" on public.game_turn_history;
create policy "Allow players in a tournament to see their turn history" on public.game_turn_history for select using (
  EXISTS (
    SELECT 1 FROM public.tournaments t WHERE t.id = public.game_turn_history.tournament_id AND t.players_joined @> jsonb_build_array(jsonb_build_object('id', auth.uid()))
  )
);
-- **REMOVED**: The failing INSERT policy for game_turn_history. Inserts are now handled by the server with admin rights.
drop policy if exists "Players can insert turn history for their games" on public.game_turn_history;


-- Chat Messages
alter table public.chat_messages enable row level security;
drop policy if exists "Allow admins to see all chat history" on public.chat_messages;
create policy "Allow admins to see all chat history" on public.chat_messages for select using (public.is_admin());
drop policy if exists "Allow players in a tournament to see their chat" on public.chat_messages;
create policy "Allow players in a tournament to see their chat" on public.chat_messages for select using (
  EXISTS (
    SELECT 1 FROM public.tournaments t WHERE t.id = public.chat_messages.tournament_id AND t.players_joined @> jsonb_build_array(jsonb_build_object('id', auth.uid()))
  )
);
-- **REMOVED**: The failing INSERT policy for chat_messages. Inserts are now handled by the server with admin rights.
drop policy if exists "Players can insert chat messages in their games" on public.chat_messages;

-- RLS for support_chats
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own support chats." ON public.support_chats;
CREATE POLICY "Users can manage their own support chats." ON public.support_chats
    FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can send support messages." ON public.support_chats;
CREATE POLICY "Users can send support messages." ON public.support_chats
    FOR INSERT WITH CHECK (auth.uid() = user_id AND sent_by_admin = false);

-- NEW POLICY: Allow users to mark messages as read (UPDATE)
DROP POLICY IF EXISTS "Users can update their own support chats." ON public.support_chats;
CREATE POLICY "Users can update their own support chats." ON public.support_chats
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins have full access to support chats." ON public.support_chats;
CREATE POLICY "Admins have full access to support chats." ON public.support_chats
    FOR ALL USING (public.is_admin());

-- RLS for group_chat_messages
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view group chats" ON public.group_chat_messages;
CREATE POLICY "Authenticated users can view group chats" ON public.group_chat_messages
    FOR SELECT USING (auth.role() = 'authenticated');
-- Note: Insertion is handled by server service key, but for good measure/if client inserts enabled later:
DROP POLICY IF EXISTS "Authenticated users can send group messages" ON public.group_chat_messages;
CREATE POLICY "Authenticated users can send group messages" ON public.group_chat_messages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can manage group chats" ON public.group_chat_messages;
CREATE POLICY "Admins can manage group chats" ON public.group_chat_messages
    FOR ALL USING (public.is_admin());


-- RLS for deposit_gateway_logs
ALTER TABLE public.deposit_gateway_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view gateway logs" ON public.deposit_gateway_logs;
CREATE POLICY "Admins can view gateway logs" ON public.deposit_gateway_logs
    FOR SELECT USING (public.is_admin());
-- Note: Server uses service role to insert, so no INSERT policy needed for logs.


-- Section 5: RPC FUNCTIONS
--------------------------------------------------------------------------------
-- MODIFIED: Function to get referral leaderboard (only counts users who have deposited)
create or replace function get_referral_leaderboard(period text)
returns table(id uuid, username text, total_refers bigint) as $$
begin
    return query
    select
        p.id,
        p.username,
        count(distinct r.id) as total_refers
    from
        public.profiles as r -- The users who were referred
    join
        public.profiles as p on r.referred_by = p.id -- The users who did the referring
    join
        public.transactions as t on t.user_id = r.id -- Join to check for a deposit
    where
        r.referred_by is not null
        and t.type = 'DEPOSIT'
        and t.status = 'COMPLETED'
        and
        case
            when period = 'weekly' then r.created_at >= now() - interval '7 days'
            when period = 'monthly' then r.created_at >= now() - interval '1 month'
            else true
        end
    group by
        p.id, p.username
    order by
        total_refers desc
    limit 100;
end;
$$ language plpgsql;

-- NEW FUNCTION: get_valid_referral_count
create or replace function get_valid_referral_count(p_user_id uuid)
returns integer as $$
declare
  referral_count integer;
begin
    select count(distinct r.id)
    into referral_count
    from public.profiles r
    join public.transactions t on r.id = t.user_id
    where r.referred_by = p_user_id
    and t.type = 'DEPOSIT'
    and t.status = 'COMPLETED';
    return referral_count;
end;
$$ language plpgsql;


-- NEW FUNCTION: grant_referral_match_bonus
CREATE OR REPLACE FUNCTION public.grant_referral_match_bonus(p_user_id uuid)
RETURNS void AS $$
DECLARE
  player_profile public.profiles;
  bonus_amount numeric;
  referrer_username text;
BEGIN
  -- Find the profile of the player who played the match
  SELECT * INTO player_profile FROM public.profiles WHERE id = p_user_id;

  -- Check if this player was referred by someone
  IF player_profile.referred_by IS NOT NULL THEN
    -- Get the per-match bonus amount from settings
    SELECT (value->>'amount')::numeric INTO bonus_amount FROM public.app_settings WHERE key = 'referral_match_bonus';
    
    -- Ensure there's a bonus to give
    IF bonus_amount IS NOT NULL AND bonus_amount > 0 THEN
      -- Get the referrer's username for the description
      SELECT username INTO referrer_username FROM public.profiles WHERE id = player_profile.referred_by;

      -- Grant the bonus to the referrer
      UPDATE public.profiles SET deposit_balance = deposit_balance + bonus_amount WHERE id = player_profile.referred_by;

      -- Log the transaction for the referrer
      INSERT INTO public.transactions (user_id, amount, type, status, description, source_user_id)
      VALUES (
          player_profile.referred_by,
          bonus_amount,
          'REFERRAL_BONUS',
          'COMPLETED',
          'Per-match bonus from ' || player_profile.username,
          p_user_id
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to add a deposit (MODIFIED to handle dual referral bonuses)
CREATE OR REPLACE FUNCTION public.add_deposit(amount_to_add numeric)
RETURNS text AS $$
DECLARE
  current_user_profile public.profiles;
  is_first_deposit boolean;
  referrer_bonus numeric;
  referee_bonus numeric;
BEGIN
  IF amount_to_add < 30 THEN RETURN 'Error: Minimum deposit amount is ৳30.'; END IF;

  -- Check if this is the user's first COMPLETED deposit
  SELECT NOT EXISTS (SELECT 1 FROM public.transactions WHERE user_id = auth.uid() AND type = 'DEPOSIT' AND status = 'COMPLETED') INTO is_first_deposit;
  
  -- Process deposit
  UPDATE public.profiles SET deposit_balance = deposit_balance + amount_to_add WHERE id = auth.uid();
  INSERT INTO public.transactions (user_id, amount, type, status, description) VALUES (auth.uid(), amount_to_add, 'DEPOSIT', 'COMPLETED', 'User deposit.');

  -- Handle referral bonuses on first deposit
  IF is_first_deposit THEN
    SELECT * INTO current_user_profile FROM public.profiles WHERE id = auth.uid();
    IF current_user_profile.referred_by IS NOT NULL THEN
      -- Get bonus amounts from settings
      SELECT (value->>'amount')::numeric INTO referrer_bonus FROM public.app_settings WHERE key = 'referral_bonus_amount';
      SELECT (value->>'amount')::numeric INTO referee_bonus FROM public.app_settings WHERE key = 'referee_bonus_amount';
      
      -- Grant bonus to the referrer
      IF referrer_bonus > 0 THEN
        UPDATE public.profiles SET deposit_balance = deposit_balance + referrer_bonus WHERE id = current_user_profile.referred_by;
        INSERT INTO public.transactions (user_id, amount, type, status, description, source_user_id) 
        VALUES (
            current_user_profile.referred_by, 
            referrer_bonus, 
            'REFERRAL_BONUS', 
            'COMPLETED', 
            'Referral bonus from ' || current_user_profile.username,
            current_user_profile.id
        );
      END IF;

      -- Grant bonus to the new user (referee)
      IF referee_bonus > 0 THEN
          UPDATE public.profiles SET deposit_balance = deposit_balance + referee_bonus WHERE id = auth.uid();
          INSERT INTO public.transactions (user_id, amount, type, status, description)
          VALUES (
              auth.uid(),
              referee_bonus,
              'REFERRAL_BONUS',
              'COMPLETED',
              'Sign-up bonus for using a referral code.'
          );
      END IF;
    END IF;
  END IF;

  RETURN 'Deposit successful.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NEW: Function for users to request an offline deposit
CREATE OR REPLACE FUNCTION public.request_offline_deposit(amount_to_deposit numeric, transaction_details text)
RETURNS text AS $$
BEGIN
  IF amount_to_deposit < 30 THEN RETURN 'Error: Minimum deposit amount is ৳30.'; END IF;
  
  INSERT INTO public.transactions (user_id, amount, type, status, description) 
  VALUES (auth.uid(), amount_to_deposit, 'DEPOSIT', 'PENDING', 'Offline deposit request. Details: ' || transaction_details);

  RETURN 'Deposit request submitted successfully. Please wait for admin approval.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NEW: Function for admins to process a pending deposit
CREATE OR REPLACE FUNCTION public.process_deposit(transaction_id_to_process uuid, is_approved boolean)
RETURNS text AS $$
DECLARE
  target_transaction public.transactions%rowtype;
  current_user_profile public.profiles;
  is_first_deposit boolean;
  referrer_bonus numeric;
  referee_bonus numeric;
BEGIN
  IF NOT public.is_admin() THEN RETURN 'Error: Permission denied.'; END IF;

  SELECT * INTO target_transaction FROM public.transactions WHERE id = transaction_id_to_process AND type = 'DEPOSIT' AND status = 'PENDING';
  IF NOT FOUND THEN RETURN 'Error: Pending deposit transaction not found.'; END IF;

  IF is_approved THEN
    -- Check if this is the user's first COMPLETED deposit BEFORE updating the current one
    SELECT NOT EXISTS (SELECT 1 FROM public.transactions WHERE user_id = target_transaction.user_id AND type = 'DEPOSIT' AND status = 'COMPLETED') INTO is_first_deposit;

    -- Update transaction status and user balance
    UPDATE public.transactions SET status = 'COMPLETED' WHERE id = transaction_id_to_process;
    UPDATE public.profiles SET deposit_balance = deposit_balance + target_transaction.amount WHERE id = target_transaction.user_id;

    -- Handle referral bonuses on first deposit
    IF is_first_deposit THEN
      SELECT * INTO current_user_profile FROM public.profiles WHERE id = target_transaction.user_id;
      IF current_user_profile.referred_by IS NOT NULL THEN
        -- Get bonus amounts from settings
        SELECT (value->>'amount')::numeric INTO referrer_bonus FROM public.app_settings WHERE key = 'referral_bonus_amount';
        SELECT (value->>'amount')::numeric INTO referee_bonus FROM public.app_settings WHERE key = 'referee_bonus_amount';
        
        -- Grant bonus to the referrer
        IF referrer_bonus > 0 THEN
          UPDATE public.profiles SET deposit_balance = deposit_balance + referrer_bonus WHERE id = current_user_profile.referred_by;
          INSERT INTO public.transactions (user_id, amount, type, status, description, source_user_id) 
          VALUES (current_user_profile.referred_by, referrer_bonus, 'REFERRAL_BONUS', 'COMPLETED', 'Referral bonus from ' || current_user_profile.username, current_user_profile.id);
        END IF;

        -- Grant bonus to the new user (referee)
        IF referee_bonus > 0 THEN
            UPDATE public.profiles SET deposit_balance = deposit_balance + referee_bonus WHERE id = target_transaction.user_id;
            INSERT INTO public.transactions (user_id, amount, type, status, description)
            VALUES (target_transaction.user_id, referee_bonus, 'REFERRAL_BONUS', 'COMPLETED', 'Sign-up bonus for using a referral code.');
        END IF;
      END IF;
    END IF;
    RETURN 'Success: Deposit approved and funds added.';
  ELSE
    UPDATE public.transactions SET status = 'REJECTED' WHERE id = transaction_id_to_process;
    RETURN 'Success: Deposit rejected.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to request a withdrawal
CREATE OR REPLACE FUNCTION public.request_withdrawal(amount_to_withdraw numeric, method text, account_number text)
RETURNS text AS $$
DECLARE
  current_user_id uuid := auth.uid();
  user_winnings_balance numeric;
  transaction_fee numeric := 5.00;
  total_deduction numeric := amount_to_withdraw + transaction_fee;
BEGIN
  IF amount_to_withdraw < 100 THEN RETURN 'Error: Minimum withdrawal amount is ৳100.'; END IF;
  SELECT winnings_balance INTO user_winnings_balance FROM public.profiles WHERE id = current_user_id;
  IF user_winnings_balance < total_deduction THEN RETURN 'Error: Insufficient winnings balance to cover withdrawal and transaction fee.'; END IF;
  UPDATE public.profiles SET winnings_balance = winnings_balance - total_deduction WHERE id = current_user_id;
  INSERT INTO public.transactions (user_id, amount, type, status, description) VALUES (current_user_id, amount_to_withdraw, 'WITHDRAWAL', 'PENDING', 'Withdrawal request via ' || method || ' to ' || account_number || '. Fee: ৳' || transaction_fee);
  RETURN 'Withdrawal request submitted successfully.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join a tournament
CREATE OR REPLACE FUNCTION public.join_tournament(tournament_id_to_join uuid)
RETURNS json AS $$
DECLARE
  current_user_id uuid := auth.uid();
  user_profile public.profiles;
  target_tournament public.tournaments;
  is_already_joined boolean;
  next_game_number int;
  fee_remaining numeric;
  deducted_from_winnings numeric := 0;
  deducted_from_deposit numeric := 0;
BEGIN
  SELECT * INTO user_profile FROM public.profiles WHERE id = current_user_id;
  SELECT * INTO target_tournament FROM public.tournaments WHERE id = tournament_id_to_join;
  IF user_profile IS NULL THEN RETURN json_build_object('error', 'User profile not found.'); END IF;
  IF target_tournament IS NULL THEN RETURN json_build_object('error', 'Tournament not found.'); END IF;
  IF target_tournament.status <> 'UPCOMING' THEN RETURN json_build_object('error', 'This tournament is not open for joining.'); END IF;
  fee_remaining := target_tournament.entry_fee;
  IF (user_profile.winnings_balance + user_profile.deposit_balance) < fee_remaining THEN RETURN json_build_object('error', 'Insufficient total balance.', 'redirect', 'wallet'); END IF;
  select exists(select 1 from jsonb_array_elements(target_tournament.players_joined) as p where (p->>'id')::uuid = current_user_id) into is_already_joined;
  if is_already_joined then return json_build_object('error', 'You have already joined this tournament.'); end if;
  if jsonb_array_length(target_tournament.players_joined) >= target_tournament.max_players then return json_build_object('error', 'This tournament is already full.'); end if;
  IF user_profile.winnings_balance >= fee_remaining THEN deducted_from_winnings := fee_remaining; fee_remaining := 0;
  ELSE deducted_from_winnings := user_profile.winnings_balance; fee_remaining := fee_remaining - deducted_from_winnings; END IF;
  IF fee_remaining > 0 THEN deducted_from_deposit := fee_remaining; END IF;
  UPDATE public.profiles SET winnings_balance = winnings_balance - deducted_from_winnings, deposit_balance = deposit_balance - deducted_from_deposit WHERE id = current_user_id;
  INSERT INTO public.transactions (user_id, amount, type, status, description) VALUES (current_user_id, -target_tournament.entry_fee, 'ENTRY_FEE', 'COMPLETED', 'Entry for match: ' || target_tournament.title);
  UPDATE public.tournaments SET players_joined = players_joined || jsonb_build_object('id', current_user_id, 'name', user_profile.username, 'joined_at', now()) WHERE id = tournament_id_to_join;
  
  -- Check if tournament is full after joining and activate it
  SELECT * INTO target_tournament FROM public.tournaments WHERE id = tournament_id_to_join;
  IF jsonb_array_length(target_tournament.players_joined) = target_tournament.max_players THEN
    UPDATE public.tournaments SET status = 'ACTIVE', game_code = substr(md5(random()::text), 0, 7) WHERE id = tournament_id_to_join;
    -- Create the next tournament
    SELECT max(game_number) + 1 INTO next_game_number FROM public.tournaments;
    IF next_game_number IS NULL THEN next_game_number := 1; END IF;
    INSERT INTO public.tournaments (game_number, title, entry_fee, prize_pool, max_players, status) VALUES (next_game_number, 'Match #' || next_game_number, target_tournament.entry_fee, target_tournament.prize_pool, target_tournament.max_players, 'UPCOMING');
  END IF;
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to submit a tournament result with auto-resolution logic (MODIFIED)
create or replace function public.submit_tournament_result(p_reason text, p_result text, p_screenshot_url text, p_tournament_id uuid)
returns text as $$
declare
  current_user_id uuid;
  opponent_id uuid;
  opponent_submission public.tournament_results%rowtype;
  target_tournament public.tournaments%rowtype;
  winner_id uuid;
  loser_id uuid;
  commission_percent numeric;
  actual_prize numeric;
begin
  current_user_id := auth.uid();
  select * into target_tournament from public.tournaments where id = p_tournament_id;
  if target_tournament.status <> 'ACTIVE' then return 'Error: This tournament is no longer active for result submission.'; end if;

  -- Insert/update the current user's submission
  insert into public.tournament_results(tournament_id, user_id, result, reason, screenshot_url)
  values (p_tournament_id, current_user_id, p_result, p_reason, p_screenshot_url)
  on conflict (tournament_id, user_id) do update set
    result = excluded.result,
    reason = excluded.reason,
    screenshot_url = excluded.screenshot_url,
    created_at = now();

  -- Find the opponent
  select id into opponent_id from jsonb_to_recordset(target_tournament.players_joined) as x(id uuid, name text) where id <> current_user_id;
  
  -- Check for the opponent's submission
  select * into opponent_submission from public.tournament_results where tournament_id = p_tournament_id and user_id = opponent_id;

  if not found then
    -- Opponent hasn't submitted yet
    return 'Result submitted successfully. Waiting for opponent to report.';
  else
    -- Opponent has submitted, now we compare results

    if (p_result = 'WIN' and opponent_submission.result = 'LOSE') or (p_result = 'LOSE' and opponent_submission.result = 'WIN') then
      -- Results match, process payout automatically
      if p_result = 'WIN' then
        winner_id := current_user_id;
        loser_id := opponent_id;
      else
        winner_id := opponent_id;
        loser_id := current_user_id;
      end if;

      -- Calculate prize after commission
      select (value->>'percentage')::numeric into commission_percent from public.app_settings where key = 'admin_commission_percent';
      if commission_percent is null then commission_percent := 0; end if;
      actual_prize := target_tournament.prize_pool * (1 - (commission_percent / 100.0));

      -- Award winner and update stats
      update public.profiles set wins = wins + 1, winnings_balance = winnings_balance + actual_prize where id = winner_id;
      insert into public.transactions(user_id, amount, type, status, description) values (winner_id, actual_prize, 'WINNINGS', 'COMPLETED', 'Winnings from match: ' || target_tournament.title);
      
      -- Update loser stats
      update public.profiles set losses = losses + 1 where id = loser_id;
      
      -- Finalize tournament status
      update public.tournaments set status = 'COMPLETED' where id = p_tournament_id;

      -- Grant per-match referral bonuses to referrers of both players
      PERFORM public.grant_referral_match_bonus(winner_id);
      PERFORM public.grant_referral_match_bonus(loser_id);

      return 'Match completed! The prize of ৳' || actual_prize::text || ' has been added to the winner''s winnings balance.';
    else
      -- Results conflict (WIN/WIN, LOSE/LOSE, or involving CANCELLED), mark for admin review
      update public.tournaments set status = 'UNDER_REVIEW' where id = p_tournament_id;
      return 'Result submitted. Player results conflict. An admin will review the match.';
    end if;
  end if;
end;
$$ language plpgsql security definer;

-- Function for admins to resolve a dispute (MODIFIED)
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(p_tournament_id uuid, p_winner_id uuid)
RETURNS text AS $$
DECLARE
  target_tournament public.tournaments%rowtype;
  loser_id uuid;
  commission_percent numeric;
  actual_prize numeric;
BEGIN
  IF NOT public.is_admin() THEN RETURN 'Error: Permission denied.'; END IF;
  SELECT * INTO target_tournament FROM public.tournaments WHERE id = p_tournament_id;
  
  IF NOT FOUND OR (target_tournament.status <> 'UNDER_REVIEW' AND target_tournament.status <> 'COMPLETED') THEN 
    RETURN 'Error: Tournament not found or not in a state that can be resolved.'; 
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.transactions
    WHERE type = 'WINNINGS' AND description = 'Winnings from match: ' || target_tournament.title
  ) THEN
      UPDATE public.tournaments SET status = 'COMPLETED' WHERE id = p_tournament_id;
      RETURN 'This match has already been paid out.';
  END IF;
  
  SELECT id INTO loser_id FROM jsonb_to_recordset(target_tournament.players_joined) AS x(id uuid, name text) WHERE id <> p_winner_id;
  
  -- Calculate prize after commission
  SELECT (value->>'percentage')::numeric INTO commission_percent FROM public.app_settings WHERE key = 'admin_commission_percent';
  IF commission_percent IS NULL THEN commission_percent := 0; END IF;
  actual_prize := target_tournament.prize_pool * (1 - (commission_percent / 100.0));

  -- Award winner and update stats
  UPDATE public.profiles SET wins = wins + 1, winnings_balance = winnings_balance + actual_prize WHERE id = p_winner_id;
  INSERT INTO public.transactions(user_id, amount, type, status, description) VALUES (p_winner_id, actual_prize, 'WINNINGS', 'COMPLETED', 'Winnings from match: ' || target_tournament.title);
  UPDATE public.profiles SET losses = losses + 1 WHERE id = loser_id;
  UPDATE public.tournaments SET status = 'COMPLETED' WHERE id = p_tournament_id;

  -- Grant per-match referral bonuses
  PERFORM public.grant_referral_match_bonus(p_winner_id);
  PERFORM public.grant_referral_match_bonus(loser_id);

  RETURN 'Success: Dispute resolved.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for admins to process a withdrawal
CREATE OR REPLACE FUNCTION public.process_withdrawal(transaction_id_to_process uuid, is_approved boolean)
RETURNS text AS $$
DECLARE
    target_transaction public.transactions%rowtype;
    fee_amount numeric := 5.00;
BEGIN
    IF NOT public.is_admin() THEN RETURN 'Error: Permission denied.'; END IF;
    SELECT * INTO target_transaction FROM public.transactions WHERE id = transaction_id_to_process AND type = 'WITHDRAWAL' AND status = 'PENDING';
    IF NOT FOUND THEN RETURN 'Error: Pending withdrawal transaction not found.'; END IF;
    IF is_approved THEN
        UPDATE public.transactions SET status = 'COMPLETED' WHERE id = transaction_id_to_process;
        RETURN 'Success: Withdrawal approved.';
    ELSE
        UPDATE public.profiles SET winnings_balance = winnings_balance + target_transaction.amount + fee_amount WHERE id = target_transaction.user_id;
        UPDATE public.transactions SET status = 'REJECTED' WHERE id = transaction_id_to_process;
        RETURN 'Success: Withdrawal rejected and funds returned to user.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for admins to cancel a match and refund players
CREATE OR REPLACE FUNCTION public.admin_cancel_match(p_tournament_id uuid)
RETURNS text AS $$
DECLARE
  target_tournament public.tournaments%rowtype;
  player_record jsonb;
  player_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RETURN 'Error: Permission denied.'; END IF;
  SELECT * INTO target_tournament FROM public.tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN RETURN 'Error: Tournament not found.'; END IF;
  IF target_tournament.status = 'COMPLETED' OR target_tournament.status = 'CANCELLED' THEN RETURN 'Error: This match is already finalized.'; END IF;

  FOR player_record IN SELECT * FROM jsonb_array_elements(target_tournament.players_joined) LOOP
    player_id := (player_record->>'id')::uuid;
    UPDATE public.profiles SET deposit_balance = deposit_balance + target_tournament.entry_fee WHERE id = player_id;
    INSERT INTO public.transactions (user_id, amount, type, status, description) VALUES (player_id, target_tournament.entry_fee, 'REFUND', 'COMPLETED', 'Refund for cancelled match: ' || target_tournament.title);
  END LOOP;
  UPDATE public.tournaments SET status = 'CANCELLED' WHERE id = p_tournament_id;
  RETURN 'Success: Match cancelled and players refunded.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for admins to clawback winnings
CREATE OR REPLACE FUNCTION public.admin_clawback_winnings(p_tournament_id uuid)
RETURNS text AS $$
DECLARE
  target_tournament public.tournaments%rowtype;
  winning_transaction public.transactions%rowtype;
  prize_amount numeric;
  winner_id uuid;
  loser_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RETURN 'Error: Permission denied.'; END IF;
  
  SELECT * INTO target_tournament FROM public.tournaments WHERE id = p_tournament_id;
  IF NOT FOUND OR target_tournament.status <> 'COMPLETED' THEN 
    RETURN 'Error: Tournament not found or is not in a completed state.'; 
  END IF;

  -- Find the winning transaction for this match
  SELECT * INTO winning_transaction FROM public.transactions
  WHERE type = 'WINNINGS' 
  AND description = 'Winnings from match: ' || target_tournament.title
  AND status = 'COMPLETED'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 'Error: No winning transaction found for this match. Cannot perform clawback.';
  END IF;

  prize_amount := winning_transaction.amount;
  winner_id := winning_transaction.user_id;

  -- Deduct from winner's balance
  UPDATE public.profiles SET winnings_balance = winnings_balance - prize_amount WHERE id = winner_id;

  -- Create a clawback transaction for record keeping
  INSERT INTO public.transactions(user_id, amount, type, status, description)
  VALUES (winner_id, -prize_amount, 'CLAWBACK', 'COMPLETED', 'Clawback for match: ' || target_tournament.title);
  
  -- Delete the original winning transaction to allow for re-resolution
  DELETE FROM public.transactions WHERE id = winning_transaction.id;

  -- Revert tournament status to allow for re-resolution
  UPDATE public.tournaments SET status = 'UNDER_REVIEW' WHERE id = p_tournament_id;

  -- Revert player stats
  SELECT id INTO loser_id FROM jsonb_to_recordset(target_tournament.players_joined) AS x(id uuid) WHERE id <> winner_id;
  UPDATE public.profiles SET wins = wins - 1 WHERE id = winner_id;
  IF loser_id IS NOT NULL THEN
    UPDATE public.profiles SET losses = losses - 1 WHERE id = loser_id;
  END IF;
  
  RETURN 'Success: Winnings reversed. Match is now under review again.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to send notifications
create or replace function public.send_notification(title text, content text, target_ids uuid[])
returns void as $$
begin
  if not public.is_admin() then raise exception 'Permission denied.'; end if;
  insert into public.notifications(title, content, target_user_ids) values (title, content, target_ids);
end;
$$ language plpgsql;

-- Function to mark notifications as read
create or replace function public.mark_notifications_as_read(notification_ids uuid[])
returns void as $$
begin
  insert into public.notification_read_status(notification_id, user_id)
  select unnest(notification_ids), auth.uid()
  on conflict (notification_id, user_id) do nothing;
end;
$$ language plpgsql security definer;

-- Function to claim a referral code post-signup
CREATE OR REPLACE FUNCTION public.claim_referral_code(p_referral_code text)
RETURNS text AS $$
DECLARE
  current_user_profile public.profiles;
  referrer_id uuid;
  has_deposited boolean;
BEGIN
  SELECT * INTO current_user_profile FROM public.profiles WHERE id = auth.uid();
  IF current_user_profile.referred_by IS NOT NULL THEN
    RETURN 'Error: You have already been referred or claimed a code.';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.transactions WHERE user_id = auth.uid() AND type = 'DEPOSIT') INTO has_deposited;
  IF has_deposited THEN
    RETURN 'Error: Referral codes can only be claimed before your first deposit.';
  END IF;

  SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = p_referral_code;
  IF NOT FOUND THEN
    RETURN 'Error: Invalid referral code.';
  END IF;

  IF referrer_id = auth.uid() THEN
    RETURN 'Error: You cannot use your own referral code.';
  END IF;

  UPDATE public.profiles SET referred_by = referrer_id WHERE id = auth.uid();
  RETURN 'Success! Referral code claimed.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Section 6: STORAGE BUCKETS & POLICIES
--------------------------------------------------------------------------------
-- Create bucket for result screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('result-screenshots', 'result-screenshots', true) ON CONFLICT (id) DO NOTHING;

-- Policies for screenshot bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload screenshots" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload screenshots" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'result-screenshots');
DROP POLICY IF EXISTS "Allow anyone to view public screenshots" ON storage.objects;
CREATE POLICY "Allow anyone to view public screenshots" ON storage.objects FOR SELECT USING (bucket_id = 'result-screenshots');
DROP POLICY IF EXISTS "Allow admins to manage screenshots" ON storage.objects;
CREATE POLICY "Allow admins to manage screenshots" ON storage.objects FOR ALL USING (public.is_admin());


-- Section 7: MULTI-LANGUAGE SYSTEM
--------------------------------------------------------------------------------

-- Table for storing available languages
CREATE TABLE IF NOT EXISTS public.app_languages (
    code TEXT PRIMARY KEY, -- e.g., 'en', 'bn', 'es'
    name TEXT NOT NULL,    -- e.g., 'English', 'Bengali'
    flag_icon TEXT,        -- e.g., '🇺🇸', '🇧🇩'
    is_rtl BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE
);

-- Insert default English language
INSERT INTO public.app_languages (code, name, flag_icon, is_default, active)
VALUES ('en', 'English', '🇺🇸', TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Table for storing translation keys and values
-- The 'values' column stores a JSON object: {"en": "Hello", "bn": "হ্যালো"}
CREATE TABLE IF NOT EXISTS public.app_translations (
    key_name TEXT PRIMARY KEY,
    category TEXT DEFAULT 'general', -- e.g., 'auth', 'game', 'admin'
    values JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- RLS Policies for Language System
ALTER TABLE public.app_languages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Languages are viewable by everyone" ON public.app_languages;
CREATE POLICY "Languages are viewable by everyone" ON public.app_languages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage languages" ON public.app_languages;
CREATE POLICY "Admins can manage languages" ON public.app_languages FOR ALL USING (public.is_admin());

ALTER TABLE public.app_translations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Translations are viewable by everyone" ON public.app_translations;
CREATE POLICY "Translations are viewable by everyone" ON public.app_translations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage translations" ON public.app_translations;
CREATE POLICY "Admins can manage translations" ON public.app_translations FOR ALL USING (public.is_admin());

-- Initial Seed Data for App Keys (Comprehensive List)
INSERT INTO public.app_translations (key_name, category, values) VALUES
-- Auth
('auth_welcome_back', 'auth', '{"en": "Welcome Back!", "bn": "স্বাগতম!"}'),
('auth_create_account', 'auth', '{"en": "Create an Account", "bn": "অ্যাকাউন্ট তৈরি করুন"}'),
('auth_login_subtitle', 'auth', '{"en": "Log in to continue your game.", "bn": "গেম খেলতে লগ ইন করুন।"}'),
('auth_signup_subtitle', 'auth', '{"en": "Join the fun and start playing.", "bn": "মজায় যোগ দিন এবং খেলা শুরু করুন।"}'),
('auth_btn_login', 'auth', '{"en": "Log In", "bn": "লগ ইন"}'),
('auth_btn_signup', 'auth', '{"en": "Sign Up", "bn": "সাইন আপ"}'),
('auth_input_email', 'auth', '{"en": "Email or Phone", "bn": "ইমেইল বা ফোন"}'),
('auth_input_password', 'auth', '{"en": "Password", "bn": "পাসওয়ার্ড"}'),
('auth_input_fullname', 'auth', '{"en": "Full Name", "bn": "পুরো নাম"}'),
('auth_input_phone', 'auth', '{"en": "Phone Number", "bn": "ফোন নম্বর"}'),
('auth_input_referral', 'auth', '{"en": "Referral Code (Optional)", "bn": "রেফারেল কোড (ঐচ্ছিক)"}'),
('auth_forgot_pass', 'auth', '{"en": "Forgot Password?", "bn": "পাসওয়ার্ড ভুলে গেছেন?"}'),

-- Navigation
('nav_dashboard', 'nav', '{"en": "Dashboard", "bn": "ড্যাশবোর্ড"}'),
('nav_game', 'nav', '{"en": "Game", "bn": "খেলা"}'),
('nav_wallet', 'nav', '{"en": "Wallet", "bn": "ওয়ালেট"}'),
('nav_leaderboard', 'nav', '{"en": "Leaderboard", "bn": "লিডারবোর্ড"}'),
('nav_profile', 'nav', '{"en": "Profile", "bn": "প্রোফাইল"}'),
('nav_how_to_play', 'nav', '{"en": "How To Play", "bn": "কিভাবে খেলবেন"}'),
('nav_global_chat', 'nav', '{"en": "Global Chat", "bn": "গ্লোবাল চ্যাট"}'),
('nav_more', 'nav', '{"en": "More", "bn": "আরও"}'),

-- Dashboard
('dash_wallet_balance', 'dashboard', '{"en": "Wallet Balance", "bn": "ওয়ালেট ব্যালেন্স"}'),
('dash_current_rating', 'dashboard', '{"en": "Current Rating", "bn": "বর্তমান রেটিং"}'),
('dash_games_played', 'dashboard', '{"en": "Games Played", "bn": "খেলেছেন"}'),
('dash_find_match', 'dashboard', '{"en": "Find a Match", "bn": "ম্যাচ খুঁজুন"}'),
('dash_manage_wallet', 'dashboard', '{"en": "Manage Wallet", "bn": "ওয়ালেট পরিচালনা"}'),

-- Wallet
('wallet_title', 'wallet', '{"en": "My Wallet", "bn": "আমার ওয়ালেট"}'),
('wallet_total_balance', 'wallet', '{"en": "Current Balance", "bn": "বর্তমান ব্যালেন্স"}'),
('wallet_deposit_balance', 'wallet', '{"en": "Deposit Balance", "bn": "ডিপোজিট ব্যালেন্স"}'),
('wallet_win_balance', 'wallet', '{"en": "Winnings Balance", "bn": "উইনিং ব্যালেন্স"}'),
('wallet_btn_deposit', 'wallet', '{"en": "Deposit", "bn": "ডিপোজিট"}'),
('wallet_btn_withdraw', 'wallet', '{"en": "Withdraw", "bn": "উত্তোলন"}'),
('wallet_history_title', 'wallet', '{"en": "Transaction History", "bn": "লেনদেন ইতিহাস"}'),
('wallet_min_deposit', 'wallet', '{"en": "Min Deposit", "bn": "সর্বনিম্ন ডিপোজিট"}'),
('wallet_min_withdraw', 'wallet', '{"en": "Min Withdraw", "bn": "সর্বনিম্ন উত্তোলন"}'),

-- Tournaments
('tour_tab_upcoming', 'tournament', '{"en": "UPCOMING", "bn": "আসন্ন"}'),
('tour_tab_ongoing', 'tournament', '{"en": "ONGOING", "bn": "চলমান"}'),
('tour_tab_completed', 'tournament', '{"en": "COMPLETED", "bn": "সমাপ্ত"}'),
('tour_tab_review', 'tournament', '{"en": "REVIEW", "bn": "রিভিউ"}'),
('tour_join_btn', 'tournament', '{"en": "JOIN", "bn": "যোগ দিন"}'),
('tour_joined_btn', 'tournament', '{"en": "JOINED", "bn": "যুক্ত হয়েছেন"}'),
('tour_play_btn', 'tournament', '{"en": "PLAY", "bn": "খেলুন"}'),
('tour_win_prize', 'tournament', '{"en": "Win Prize", "bn": "পুরস্কার"}'),
('tour_entry_fee', 'tournament', '{"en": "Entry Fee", "bn": "এন্ট্রি ফি"}'),

-- Profile
('prof_personal_info', 'profile', '{"en": "Personal Information", "bn": "ব্যক্তিগত তথ্য"}'),
('prof_game_stats', 'profile', '{"en": "Game Statistics", "bn": "গেম পরিসংখ্যান"}'),
('prof_change_pass', 'profile', '{"en": "Change Password", "bn": "পাসওয়ার্ড পরিবর্তন"}'),
('prof_btn_save', 'profile', '{"en": "Save Changes", "bn": "পরিবর্তন সেভ করুন"}'),
('prof_stat_matches', 'profile', '{"en": "Total Matches", "bn": "মোট ম্যাচ"}'),
('prof_stat_wins', 'profile', '{"en": "Total Wins", "bn": "মোট জয়"}'),
('prof_stat_losses', 'profile', '{"en": "Total Losses", "bn": "মোট হার"}'),
('prof_stat_winnings', 'profile', '{"en": "Total Winnings", "bn": "মোট আয়"}'),

-- Game
('game_lobby_title', 'game', '{"en": "Game Lobby", "bn": "গেম লবি"}'),
('game_waiting_msg', 'game', '{"en": "Waiting for opponent...", "bn": "প্রতিপক্ষের অপেক্ষায়..."}'),
('game_btn_leave', 'game', '{"en": "Leave Game", "bn": "গেম ত্যাগ করুন"}'),
('game_btn_start', 'game', '{"en": "Start Game", "bn": "গেম শুরু করুন"}'),
('game_roll_dice', 'game', '{"en": "Roll Dice", "bn": "ছক্কা চালুন"}'),
('game_your_turn', 'game', '{"en": "Your Turn", "bn": "আপনার চাল"}'),
('game_winner_title', 'game', '{"en": "Winner!", "bn": "বিজয়ী!"}'),
('game_over_title', 'game', '{"en": "Game Over", "bn": "খেলা শেষ"}'),

-- Global Chat
('chat_title', 'chat', '{"en": "Global Chat Room", "bn": "গ্লোবাল চ্যাট রুম"}'),
('chat_warning', 'chat', '{"en": "⚠️ Don''t use bad language", "bn": "⚠️ খারাপ ভাষা ব্যবহার করবেন না"}'),
('chat_placeholder', 'chat', '{"en": "Type a message...", "bn": "মেসেজ লিখুন..."}'),
('chat_btn_send', 'chat', '{"en": "Send", "bn": "পাঠান"}'),

-- Refer
('refer_title', 'refer', '{"en": "Refer & Earn", "bn": "রেফার ও আয়"}'),
('refer_total_refer', 'refer', '{"en": "Total Refer", "bn": "মোট রেফার"}'),
('refer_total_earn', 'refer', '{"en": "Total Refer Earn", "bn": "মোট রেফার আয়"}'),
('refer_your_code', 'refer', '{"en": "Your Referral Code", "bn": "আপনার রেফারেল কোড"}'),
('refer_copy_msg', 'refer', '{"en": "Tap to copy & share with your friends!", "bn": "কপি করতে ট্যাপ করুন এবং বন্ধুদের সাথে শেয়ার করুন!"}'),
('refer_btn_history', 'refer', '{"en": "Refer History", "bn": "রেফার ইতিহাস"}'),
('refer_btn_leaderboard', 'refer', '{"en": "Refer Leaderboard", "bn": "রেফার লিডারবোর্ড"}'),

-- Common
('btn_close', 'common', '{"en": "Close", "bn": "বন্ধ করুন"}'),
('btn_confirm', 'common', '{"en": "Confirm", "bn": "নিশ্চিত করুন"}'),
('btn_cancel', 'common', '{"en": "Cancel", "bn": "বাতিল করুন"}'),
('status_pending', 'common', '{"en": "PENDING", "bn": "অপেক্ষমান"}'),
('status_completed', 'common', '{"en": "COMPLETED", "bn": "সম্পন্ন"}'),
('status_failed', 'common', '{"en": "FAILED", "bn": "ব্যর্থ"}'),
('label_loading', 'common', '{"en": "Loading...", "bn": "লোড হচ্ছে..."}')
ON CONFLICT (key_name) DO NOTHING;


-- Create bucket for Payment Methods Logos
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-methods', 'payment-methods', true) ON CONFLICT (id) DO NOTHING;

-- Policies for payment-methods bucket
DROP POLICY IF EXISTS "Allow admins to upload payment logos" ON storage.objects;
CREATE POLICY "Allow admins to upload payment logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-methods' AND public.is_admin());
DROP POLICY IF EXISTS "Allow anyone to view payment logos" ON storage.objects;
CREATE POLICY "Allow anyone to view payment logos" ON storage.objects FOR SELECT USING (bucket_id = 'payment-methods');


-- Create bucket for Landing Page Assets
INSERT INTO storage.buckets (id, name, public) VALUES ('landing-page-assets', 'landing-page-assets', true) ON CONFLICT (id) DO NOTHING;

-- Policies for landing-page-assets bucket
DROP POLICY IF EXISTS "Allow admins to upload landing assets" ON storage.objects;
CREATE POLICY "Allow admins to upload landing assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'landing-page-assets' AND public.is_admin());
DROP POLICY IF EXISTS "Allow anyone to view landing assets" ON storage.objects;
CREATE POLICY "Allow anyone to view landing assets" ON storage.objects FOR SELECT USING (bucket_id = 'landing-page-assets');





*/