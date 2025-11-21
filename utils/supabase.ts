
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

-- 1. CLEANUP (Optional - Use strictly for a fresh start)
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;

-- 2. ENUMS
--------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE public.tournament_status AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'UNDER_REVIEW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'ENTRY_FEE', 'WINNINGS', 'REFUND', 'CLAWBACK', 'REFERRAL_BONUS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.transaction_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLES
--------------------------------------------------------------------------------

-- Profiles (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ,
    username TEXT,
    mobile TEXT,
    avatar_url TEXT,
    deposit_balance NUMERIC(12, 2) DEFAULT 0.00,
    winnings_balance NUMERIC(12, 2) DEFAULT 0.00,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    rating INTEGER DEFAULT 1000,
    role TEXT DEFAULT 'user', -- 'user' or 'admin'
    is_banned BOOLEAN DEFAULT FALSE,
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournaments (Matches)
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    game_number SERIAL,
    title TEXT NOT NULL,
    entry_fee NUMERIC(10, 2) NOT NULL,
    prize_pool NUMERIC(10, 2) NOT NULL,
    max_players INTEGER DEFAULT 2,
    status public.tournament_status DEFAULT 'UPCOMING',
    players_joined JSONB DEFAULT '[]'::jsonb, -- Array of {id, name, joined_at}
    game_code TEXT
);

-- Tournament Results (User Submissions)
CREATE TABLE IF NOT EXISTS public.tournament_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    result TEXT NOT NULL, -- 'WIN', 'LOSE', 'CANCELLED'
    reason TEXT,
    screenshot_url TEXT,
    UNIQUE(tournament_id, user_id)
);

-- Transactions (Wallet History)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    type public.transaction_type NOT NULL,
    status public.transaction_status DEFAULT 'COMPLETED',
    description TEXT,
    source_user_id UUID -- For referral bonuses
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_user_ids UUID[] -- NULL for all users, else specific IDs
);

-- Notification Read Status
CREATE TABLE IF NOT EXISTS public.notification_read_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, notification_id)
);

-- App Settings (Dynamic Config)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support Chats
CREATE TABLE IF NOT EXISTS public.support_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    username TEXT,
    message_text TEXT NOT NULL,
    sent_by_admin BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE
);

-- Group Chat Messages
CREATE TABLE IF NOT EXISTS public.group_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    username TEXT,
    message_text TEXT NOT NULL
);

-- Game Logs (Chat & Turns)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID,
    username TEXT,
    message_text TEXT
);

CREATE TABLE IF NOT EXISTS public.game_turn_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID,
    username TEXT,
    description TEXT
);

-- Videos
CREATE TABLE IF NOT EXISTS public.how_to_play_videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    youtube_url TEXT NOT NULL
);

-- Payment Gateway Logs
CREATE TABLE IF NOT EXISTS public.deposit_gateway_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    transaction_id UUID,
    invoice_id TEXT,
    gateway TEXT,
    payment_method TEXT,
    sender_number TEXT,
    raw_response JSONB
);

-- Languages
CREATE TABLE IF NOT EXISTS public.app_languages (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    flag_icon TEXT,
    is_rtl BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE
);

-- Translations
CREATE TABLE IF NOT EXISTS public.app_translations (
    key_name TEXT PRIMARY KEY,
    category TEXT DEFAULT 'general',
    values JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 4. FUNCTIONS & TRIGGERS
--------------------------------------------------------------------------------

-- Helper: Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Generate random alphanumeric code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text AS $$
DECLARE
  chars text[] := '{A,B,C,D,E,F,G,H,J,K,L,M,N,P,Q,R,S,T,U,V,W,X,Y,Z,2,3,4,5,6,7,8,9}';
  result text := '';
  i integer := 0;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || chars[1+random()*(array_length(chars, 1)-1)];
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Handle New User
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  ref_code text;
BEGIN
  LOOP
    ref_code := generate_referral_code();
    BEGIN
        INSERT INTO public.profiles (id, username, email, mobile, referral_code)
        VALUES (
            new.id, 
            new.raw_user_meta_data->>'full_name', 
            new.email, 
            COALESCE(new.phone, new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'mobile'),
            ref_code
        );
        EXIT; -- Exit loop if insert succeeds
    EXCEPTION WHEN unique_violation THEN
        -- Try again if referral code exists
    END;
  END LOOP;
  
  -- Handle referral if code provided during signup
  IF new.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
      PERFORM public.claim_referral_code_internal(new.id, new.raw_user_meta_data->>'referral_code');
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Setup trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Helper: Internal Referral Claim
CREATE OR REPLACE FUNCTION public.claim_referral_code_internal(user_id uuid, code text)
RETURNS void AS $$
DECLARE
  referrer_id uuid;
BEGIN
  SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = code;
  IF referrer_id IS NOT NULL AND referrer_id != user_id THEN
      UPDATE public.profiles SET referred_by = referrer_id WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- User Function: Join Tournament
CREATE OR REPLACE FUNCTION public.join_tournament(tournament_id_to_join uuid)
RETURNS json AS $$
DECLARE
  tournament_record record;
  user_profile record;
  current_players jsonb;
  new_player jsonb;
BEGIN
  -- Get Tournament
  SELECT * INTO tournament_record FROM public.tournaments WHERE id = tournament_id_to_join FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Tournament not found');
  END IF;

  IF tournament_record.status != 'UPCOMING' THEN
    RETURN json_build_object('error', 'Tournament is not open for joining');
  END IF;

  current_players := tournament_record.players_joined;
  
  IF jsonb_array_length(current_players) >= tournament_record.max_players THEN
    RETURN json_build_object('error', 'Tournament is full');
  END IF;

  -- Check if already joined
  IF current_players @> jsonb_build_array(jsonb_build_object('id', auth.uid())) THEN
     RETURN json_build_object('error', 'You have already joined this tournament');
  END IF;

  -- Get User Profile
  SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();

  -- Check Balance
  IF (user_profile.deposit_balance + user_profile.winnings_balance) < tournament_record.entry_fee THEN
    RETURN json_build_object('error', 'Insufficient balance', 'redirect', 'wallet');
  END IF;

  -- Deduct Fee (Prioritize Deposit Balance)
  DECLARE
    fee numeric := tournament_record.entry_fee;
    deduct_deposit numeric := 0;
    deduct_winnings numeric := 0;
  BEGIN
    IF user_profile.deposit_balance >= fee THEN
        deduct_deposit := fee;
    ELSE
        deduct_deposit := user_profile.deposit_balance;
        deduct_winnings := fee - deduct_deposit;
    END IF;

    UPDATE public.profiles 
    SET deposit_balance = deposit_balance - deduct_deposit,
        winnings_balance = winnings_balance - deduct_winnings
    WHERE id = auth.uid();
    
    INSERT INTO public.transactions (user_id, amount, type, status, description)
    VALUES (auth.uid(), -fee, 'ENTRY_FEE', 'COMPLETED', 'Joined ' || tournament_record.title);
  END;

  -- Add Player
  new_player := jsonb_build_object(
    'id', auth.uid(), 
    'name', COALESCE(user_profile.username, 'Player'),
    'joined_at', now()
  );
  
  UPDATE public.tournaments 
  SET players_joined = players_joined || new_player
  WHERE id = tournament_id_to_join;

  -- Start if full
  IF jsonb_array_length(current_players) + 1 >= tournament_record.max_players THEN
      UPDATE public.tournaments 
      SET status = 'ACTIVE', game_code = substring(id::text from 1 for 8)
      WHERE id = tournament_id_to_join;
  END IF;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User Function: Submit Result
CREATE OR REPLACE FUNCTION public.submit_tournament_result(
    p_tournament_id uuid, 
    p_result text, 
    p_reason text DEFAULT NULL, 
    p_screenshot_url text DEFAULT NULL
)
RETURNS text AS $$
DECLARE
  t_status text;
BEGIN
  SELECT status INTO t_status FROM public.tournaments WHERE id = p_tournament_id;
  
  IF t_status NOT IN ('ACTIVE', 'UNDER_REVIEW') THEN
      RETURN 'Match is not active for submission.';
  END IF;

  INSERT INTO public.tournament_results (tournament_id, user_id, result, reason, screenshot_url)
  VALUES (p_tournament_id, auth.uid(), p_result, p_reason, p_screenshot_url)
  ON CONFLICT (tournament_id, user_id) 
  DO UPDATE SET 
    result = EXCLUDED.result, 
    reason = EXCLUDED.reason, 
    screenshot_url = EXCLUDED.screenshot_url,
    created_at = NOW();

  -- Check if both submitted
  IF (SELECT count(*) FROM public.tournament_results WHERE tournament_id = p_tournament_id) >= 2 THEN
      UPDATE public.tournaments SET status = 'UNDER_REVIEW' WHERE id = p_tournament_id AND status = 'ACTIVE';
  END IF;

  RETURN 'Result submitted successfully.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User Function: Request Withdrawal
CREATE OR REPLACE FUNCTION public.request_withdrawal(amount_to_withdraw numeric, method text, account_number text)
RETURNS void AS $$
DECLARE
  u_balance numeric;
  fee numeric := 5.00; -- Fixed fee
BEGIN
  SELECT winnings_balance INTO u_balance FROM public.profiles WHERE id = auth.uid();
  
  IF u_balance < (amount_to_withdraw + fee) THEN
      RAISE EXCEPTION 'Insufficient winnings balance.';
  END IF;

  -- Deduct from balance immediately (hold funds)
  UPDATE public.profiles SET winnings_balance = winnings_balance - (amount_to_withdraw + fee) WHERE id = auth.uid();

  INSERT INTO public.transactions (user_id, amount, type, status, description)
  VALUES (
      auth.uid(), 
      -(amount_to_withdraw + fee), 
      'WITHDRAWAL', 
      'PENDING', 
      'Withdrawal request via ' || method || ' to ' || account_number || '. Fee: ' || fee
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User Function: Request Offline Deposit
CREATE OR REPLACE FUNCTION public.request_offline_deposit(amount_to_deposit numeric, transaction_details text)
RETURNS text AS $$
BEGIN
  INSERT INTO public.transactions (user_id, amount, type, status, description)
  VALUES (
      auth.uid(), 
      amount_to_deposit, 
      'DEPOSIT', 
      'PENDING', 
      'Offline Deposit Request. Details: ' || transaction_details
  );
  RETURN 'Deposit request submitted. Please wait for admin approval.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User Function: Claim Referral Code
CREATE OR REPLACE FUNCTION public.claim_referral_code(p_referral_code text)
RETURNS text AS $$
DECLARE
  referrer_id uuid;
  my_id uuid := auth.uid();
  my_referred_by uuid;
  has_deposited boolean;
BEGIN
  SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = p_referral_code;
  SELECT referred_by INTO my_referred_by FROM public.profiles WHERE id = my_id;
  
  IF referrer_id IS NULL THEN RETURN 'Error: Invalid referral code.'; END IF;
  IF referrer_id = my_id THEN RETURN 'Error: You cannot refer yourself.'; END IF;
  IF my_referred_by IS NOT NULL THEN RETURN 'Error: You have already been referred.'; END IF;
  
  -- Check deposits
  SELECT EXISTS(SELECT 1 FROM public.transactions WHERE user_id = my_id AND type = 'DEPOSIT') INTO has_deposited;
  IF has_deposited THEN RETURN 'Error: You cannot claim a code after making a deposit.'; END IF;

  UPDATE public.profiles SET referred_by = referrer_id WHERE id = my_id;
  RETURN 'Referral code claimed successfully!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin Function: Process Withdrawal
CREATE OR REPLACE FUNCTION public.process_withdrawal(transaction_id_to_process uuid, is_approved boolean)
RETURNS void AS $$
DECLARE
  trans_record record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT * INTO trans_record FROM public.transactions WHERE id = transaction_id_to_process;
  
  IF trans_record.status != 'PENDING' THEN RAISE EXCEPTION 'Transaction already processed'; END IF;

  IF is_approved THEN
      UPDATE public.transactions SET status = 'COMPLETED' WHERE id = transaction_id_to_process;
      -- Funds already deducted on request
  ELSE
      -- Refund balance
      UPDATE public.transactions SET status = 'REJECTED' WHERE id = transaction_id_to_process;
      UPDATE public.profiles SET winnings_balance = winnings_balance + abs(trans_record.amount) WHERE id = trans_record.user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin Function: Process Deposit
CREATE OR REPLACE FUNCTION public.process_deposit(transaction_id_to_process uuid, is_approved boolean)
RETURNS text AS $$
DECLARE
  trans_record record;
  referrer_uid uuid;
  ref_bonus numeric;
  referee_bonus numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT * INTO trans_record FROM public.transactions WHERE id = transaction_id_to_process;
  IF trans_record.status != 'PENDING' THEN RETURN 'Error: Already processed'; END IF;

  IF is_approved THEN
      -- 1. Mark completed
      UPDATE public.transactions SET status = 'COMPLETED' WHERE id = transaction_id_to_process;
      -- 2. Add funds
      UPDATE public.profiles SET deposit_balance = deposit_balance + trans_record.amount WHERE id = trans_record.user_id;
      
      -- 3. Check Referral Bonus (First deposit only)
      IF (SELECT count(*) FROM public.transactions WHERE user_id = trans_record.user_id AND type = 'DEPOSIT' AND status = 'COMPLETED') = 1 THEN
          SELECT referred_by INTO referrer_uid FROM public.profiles WHERE id = trans_record.user_id;
          
          IF referrer_uid IS NOT NULL THEN
              -- Get amounts from settings
              SELECT (value->>'amount')::numeric INTO ref_bonus FROM public.app_settings WHERE key = 'referral_bonus_amount';
              SELECT (value->>'amount')::numeric INTO referee_bonus FROM public.app_settings WHERE key = 'referee_bonus_amount';
              
              IF ref_bonus > 0 THEN
                  UPDATE public.profiles SET deposit_balance = deposit_balance + ref_bonus WHERE id = referrer_uid;
                  INSERT INTO public.transactions (user_id, amount, type, status, description, source_user_id)
                  VALUES (referrer_uid, ref_bonus, 'REFERRAL_BONUS', 'COMPLETED', 'Referral Bonus', trans_record.user_id);
              END IF;
              
              IF referee_bonus > 0 THEN
                  UPDATE public.profiles SET deposit_balance = deposit_balance + referee_bonus WHERE id = trans_record.user_id;
                  INSERT INTO public.transactions (user_id, amount, type, status, description)
                  VALUES (trans_record.user_id, referee_bonus, 'REFERRAL_BONUS', 'COMPLETED', 'Sign-up Bonus');
              END IF;
          END IF;
      END IF;
      
      RETURN 'Deposit approved and processed.';
  ELSE
      UPDATE public.transactions SET status = 'REJECTED' WHERE id = transaction_id_to_process;
      RETURN 'Deposit rejected.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin Function: Resolve Dispute / Finalize Match
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(p_tournament_id uuid, p_winner_id uuid)
RETURNS text AS $$
DECLARE
  t_record record;
  loser_id uuid;
  admin_fee_percent numeric;
  prize_amount numeric;
  referrer_uid uuid;
  match_ref_bonus numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT * INTO t_record FROM public.tournaments WHERE id = p_tournament_id;
  IF t_record.status = 'COMPLETED' THEN RETURN 'Error: Already completed'; END IF;

  -- Calculate Prize
  SELECT (value->>'percentage')::numeric INTO admin_fee_percent FROM public.app_settings WHERE key = 'admin_commission_percent';
  prize_amount := t_record.prize_pool * (1 - (COALESCE(admin_fee_percent, 0) / 100));

  -- 1. Update Winner Wallet & Stats
  UPDATE public.profiles 
  SET winnings_balance = winnings_balance + prize_amount,
      wins = wins + 1
  WHERE id = p_winner_id;

  INSERT INTO public.transactions (user_id, amount, type, status, description)
  VALUES (p_winner_id, prize_amount, 'WINNINGS', 'COMPLETED', 'Won match ' || t_record.title);

  -- 2. Update Loser Stats (Assuming 1v1 for simplicity, finding the other player)
  -- Find a player in players_joined who is NOT the winner
  SELECT (player->>'id')::uuid INTO loser_id 
  FROM jsonb_array_elements(t_record.players_joined) player 
  WHERE (player->>'id')::uuid != p_winner_id LIMIT 1;

  IF loser_id IS NOT NULL THEN
      UPDATE public.profiles SET losses = losses + 1 WHERE id = loser_id;
  END IF;

  -- 3. Tournament Status
  UPDATE public.tournaments SET status = 'COMPLETED' WHERE id = p_tournament_id;
  
  -- 4. Referral Match Bonus (If winner was referred)
  SELECT referred_by INTO referrer_uid FROM public.profiles WHERE id = p_winner_id;
  IF referrer_uid IS NOT NULL THEN
      SELECT (value->>'amount')::numeric INTO match_ref_bonus FROM public.app_settings WHERE key = 'referral_match_bonus';
      IF match_ref_bonus > 0 THEN
          UPDATE public.profiles SET winnings_balance = winnings_balance + match_ref_bonus WHERE id = referrer_uid;
          INSERT INTO public.transactions (user_id, amount, type, status, description, source_user_id)
          VALUES (referrer_uid, match_ref_bonus, 'REFERRAL_BONUS', 'COMPLETED', 'Match Win Bonus from Referral', p_winner_id);
      END IF;
  END IF;

  RETURN 'Match resolved successfully.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin Function: Cancel Match
CREATE OR REPLACE FUNCTION public.admin_cancel_match(p_tournament_id uuid)
RETURNS text AS $$
DECLARE
  t_record record;
  player jsonb;
  pid uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  
  SELECT * INTO t_record FROM public.tournaments WHERE id = p_tournament_id;
  IF t_record.status = 'CANCELLED' THEN RETURN 'Error: Already cancelled'; END IF;

  -- Refund everyone
  FOR player IN SELECT * FROM jsonb_array_elements(t_record.players_joined)
  LOOP
    pid := (player->>'id')::uuid;
    UPDATE public.profiles SET deposit_balance = deposit_balance + t_record.entry_fee WHERE id = pid;
    INSERT INTO public.transactions (user_id, amount, type, status, description)
    VALUES (pid, t_record.entry_fee, 'REFUND', 'COMPLETED', 'Refund for ' || t_record.title);
  END LOOP;

  UPDATE public.tournaments SET status = 'CANCELLED' WHERE id = p_tournament_id;
  RETURN 'Match cancelled and refunded.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin Function: Clawback
CREATE OR REPLACE FUNCTION public.admin_clawback_winnings(p_tournament_id uuid)
RETURNS text AS $$
DECLARE
  t_record record;
  winnings_trx record;
  winner_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  
  SELECT * INTO t_record FROM public.tournaments WHERE id = p_tournament_id;
  IF t_record.status != 'COMPLETED' THEN RETURN 'Error: Match not completed'; END IF;

  -- Find the winnings transaction linked to this match
  -- Note: We rely on description pattern matching or time proximity. Better design: link trx to tournament_id.
  -- For this template, we assume we find the WINNINGS transaction for one of the players created recently.
  
  -- Simplification: Find user who won based on stats update? No, let's query transaction.
  SELECT * INTO winnings_trx FROM public.transactions 
  WHERE description = 'Won match ' || t_record.title AND type = 'WINNINGS' 
  ORDER BY created_at DESC LIMIT 1;
  
  IF winnings_trx IS NULL THEN RETURN 'Error: Winnings transaction not found'; END IF;
  
  winner_id := winnings_trx.user_id;
  
  -- Reverse money
  UPDATE public.profiles SET winnings_balance = winnings_balance - winnings_trx.amount WHERE id = winner_id;
  
  INSERT INTO public.transactions (user_id, amount, type, status, description)
  VALUES (winner_id, -winnings_trx.amount, 'CLAWBACK', 'COMPLETED', 'Reversal of winnings for ' || t_record.title);
  
  -- Reset status
  UPDATE public.tournaments SET status = 'UNDER_REVIEW' WHERE id = p_tournament_id;
  
  -- Revert stats
  UPDATE public.profiles SET wins = wins - 1 WHERE id = winner_id;
  
  RETURN 'Clawback successful. Match set to Under Review.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notification Functions
CREATE OR REPLACE FUNCTION public.send_notification(title text, content text, target_ids uuid[] DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  INSERT INTO public.notifications (title, content, target_user_ids) VALUES (title, content, target_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.mark_notifications_as_read(notification_ids uuid[])
RETURNS void AS $$
DECLARE
  nid uuid;
BEGIN
  FOREACH nid IN ARRAY notification_ids
  LOOP
    INSERT INTO public.notification_read_status (user_id, notification_id) 
    VALUES (auth.uid(), nid) 
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Get Valid Referrals Count
CREATE OR REPLACE FUNCTION public.get_valid_referral_count(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  count integer;
BEGIN
  -- Count users referred by p_user_id who have at least one COMPLETED deposit
  SELECT count(DISTINCT p.id) INTO count
  FROM public.profiles p
  JOIN public.transactions t ON p.id = t.user_id
  WHERE p.referred_by = p_user_id 
    AND t.type = 'DEPOSIT' 
    AND t.status = 'COMPLETED';
    
  RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: Get Referral Leaderboard
CREATE OR REPLACE FUNCTION public.get_referral_leaderboard(period text DEFAULT 'all_time')
RETURNS TABLE (id uuid, username text, total_refers bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, 
    p.username, 
    COUNT(ref.id) as total_refers
  FROM public.profiles p
  JOIN public.profiles ref ON p.id = ref.referred_by
  WHERE 
    CASE 
      WHEN period = 'weekly' THEN ref.created_at >= (now() - interval '7 days')
      WHEN period = 'monthly' THEN ref.created_at >= (now() - interval '1 month')
      ELSE true
    END
  GROUP BY p.id, p.username
  ORDER BY total_refers DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin: Get User List (Secure)
CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS TABLE (
  id uuid,
  username text,
  email text,
  phone text,
  deposit_balance numeric,
  winnings_balance numeric,
  is_banned boolean,
  created_at timestamptz,
  last_sign_in_at timestamptz
) SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY
  SELECT 
    p.id, p.username, au.email::text,
    COALESCE(au.phone, au.raw_user_meta_data->>'phone', au.raw_user_meta_data->>'mobile')::text as phone,
    p.deposit_balance, p.winnings_balance, p.is_banned, p.created_at, au.last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_user_email_phone(user_id uuid)
RETURNS TABLE (email text, phone text, last_sign_in_at timestamptz) SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY SELECT au.email::text, COALESCE(au.phone, au.raw_user_meta_data->>'phone', au.raw_user_meta_data->>'mobile')::text, au.last_sign_in_at
  FROM auth.users au WHERE au.id = user_id;
END;
$$ LANGUAGE plpgsql;

-- 5. RLS POLICIES
--------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tournaments viewable by everyone" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "Admins can update tournaments" ON public.tournaments FOR ALL USING (public.is_admin());

ALTER TABLE public.tournament_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View results" ON public.tournament_results FOR SELECT USING (true);
CREATE POLICY "Submit results" ON public.tournament_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own results" ON public.tournament_results FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admins manage transactions" ON public.transactions FOR ALL USING (public.is_admin());

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View notifications" ON public.notifications FOR SELECT USING (target_user_ids IS NULL OR auth.uid() = ANY(target_user_ids) OR public.is_admin());
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL USING (public.is_admin());

ALTER TABLE public.notification_read_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage own read status" ON public.notification_read_status FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins update settings" ON public.app_settings FOR ALL USING (public.is_admin());

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read chat" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Insert chat" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin delete chat" ON public.chat_messages FOR DELETE USING (public.is_admin());

ALTER TABLE public.game_turn_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read turns" ON public.game_turn_history FOR SELECT USING (true);
CREATE POLICY "Insert turns" ON public.game_turn_history FOR INSERT WITH CHECK (true); -- Game server/function should insert

ALTER TABLE public.how_to_play_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read videos" ON public.how_to_play_videos FOR SELECT USING (true);
CREATE POLICY "Admin manage videos" ON public.how_to_play_videos FOR ALL USING (public.is_admin());

ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User view own support" ON public.support_chats FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "User insert support" ON public.support_chats FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Update support" ON public.support_chats FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View group chat" ON public.group_chat_messages FOR SELECT USING (true);
CREATE POLICY "Insert group chat" ON public.group_chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manage group chat" ON public.group_chat_messages FOR DELETE USING (public.is_admin());

ALTER TABLE public.deposit_gateway_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin view logs" ON public.deposit_gateway_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "Insert logs" ON public.deposit_gateway_logs FOR INSERT WITH CHECK (true);

ALTER TABLE public.app_languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Languages are viewable by everyone" ON public.app_languages FOR SELECT USING (true);
CREATE POLICY "Admins can manage languages" ON public.app_languages FOR ALL USING (public.is_admin());

ALTER TABLE public.app_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Translations are viewable by everyone" ON public.app_translations FOR SELECT USING (true);
CREATE POLICY "Admins can manage translations" ON public.app_translations FOR ALL USING (public.is_admin());

-- 6. SEEDING INITIAL DATA
--------------------------------------------------------------------------------
INSERT INTO public.app_settings (key, value) VALUES
('admin_status', '{"status": "offline"}'),
('admin_commission_percent', '{"percentage": 10}'),
('group_chat_status', '{"enabled": true, "block_links": false, "banned_words": []}'),
('app_config', '{"title": "Dream Ludo", "currencySymbol": "৳"}'),
('deposit_gateway_settings', '{"active_gateway": "offline", "offline": {"methods": [], "instructions": ""}}')
ON CONFLICT DO NOTHING;

-- Insert default English language
INSERT INTO public.app_languages (code, name, flag_icon, is_default, active)
VALUES ('en', 'English', '🇺🇸', TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

*/
