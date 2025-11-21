
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
This script sets up the entire database from scratch. It's safe to run multiple
times. It creates types, tables, functions, RLS policies, and triggers.

-- Run this command in your Supabase SQL Editor.
--------------------------------------------------------------------------------

-- ... (Previous SQL content remains same) ...

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

--------------------------------------------------------------------------------
-- END OF SCRIPT
--------------------------------------------------------------------------------
*/
