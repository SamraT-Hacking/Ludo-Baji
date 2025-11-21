
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { TrashIconSVG, PlusIconSVG } from '../../assets/icons';
import { Language } from '../../contexts/LanguageContext';

type Tab = 'languages' | 'translations';

interface TranslationRow {
    key_name: string;
    category: string;
    values: Record<string, string>;
}

// Comprehensive list of keys with English and Bengali translations
const DEFAULT_KEYS = [
    // --- Auth ---
    { key: 'auth_welcome_back', category: 'auth', en: 'Welcome Back!', bn: 'স্বাগতম!' },
    { key: 'auth_create_account', category: 'auth', en: 'Create an Account', bn: 'অ্যাকাউন্ট তৈরি করুন' },
    { key: 'auth_login_subtitle', category: 'auth', en: 'Log in to continue your game.', bn: 'গেম খেলতে লগ ইন করুন।' },
    { key: 'auth_signup_subtitle', category: 'auth', en: 'Join the fun and start playing.', bn: 'মজায় যোগ দিন এবং খেলা শুরু করুন।' },
    { key: 'auth_btn_login', category: 'auth', en: 'Log In', bn: 'লগ ইন' },
    { key: 'auth_btn_signup', category: 'auth', en: 'Sign Up', bn: 'সাইন আপ' },
    { key: 'auth_input_email', category: 'auth', en: 'Email or Phone', bn: 'ইমেইল বা ফোন' },
    { key: 'auth_input_password', category: 'auth', en: 'Password', bn: 'পাসওয়ার্ড' },
    { key: 'auth_input_fullname', category: 'auth', en: 'Full Name', bn: 'পুরো নাম' },
    { key: 'auth_input_phone', category: 'auth', en: 'Phone Number', bn: 'ফোন নম্বর' },
    { key: 'auth_input_referral', category: 'auth', en: 'Referral Code (Optional)', bn: 'রেফারেল কোড (ঐচ্ছিক)' },
    { key: 'auth_forgot_pass', category: 'auth', en: 'Forgot Password?', bn: 'পাসওয়ার্ড ভুলে গেছেন?' },
    { key: 'ban_notice_title', category: 'auth', en: 'Account Suspended', bn: 'অ্যাকাউন্ট সাসপেন্ড করা হয়েছে' },
    { key: 'ban_notice_p1', category: 'auth', en: 'Your account has been suspended due to a violation of our terms of service. If you believe this is a mistake, please contact our support team.', bn: 'আমাদের পরিষেবার শর্ত লঙ্ঘনের কারণে আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে। যদি আপনি মনে করেন এটি একটি ভুল, অনুগ্রহ করে আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন।' },
    { key: 'ban_notice_p2_1', category: 'auth', en: 'Support Email:', bn: 'সাপোর্ট ইমেল:' },
    { key: 'ban_notice_btn', category: 'auth', en: 'Try another account', bn: 'অন্য অ্যাকাউন্ট দিয়ে চেষ্টা করুন' },
    
    // --- Navigation ---
    { key: 'nav_dashboard', category: 'nav', en: 'Dashboard', bn: 'ড্যাশবোর্ড' },
    { key: 'nav_game', category: 'nav', en: 'Game', bn: 'খেলা' },
    { key: 'nav_wallet', category: 'nav', en: 'My Wallet', bn: 'আমার ওয়ালেট' },
    { key: 'nav_leaderboard', category: 'nav', en: 'Leaderboard', bn: 'লিডারবোর্ড' },
    { key: 'nav_profile', category: 'nav', en: 'Profile', bn: 'প্রোফাইল' },
    { key: 'nav_how_to_play', category: 'nav', en: 'How To Play', bn: 'কিভাবে খেলবেন' },
    { key: 'nav_global_chat', category: 'nav', en: 'Global Chat', bn: 'গ্লোবাল চ্যাট' },
    { key: 'nav_more', category: 'nav', en: 'More', bn: 'আরও' },
    { key: 'nav_support', category: 'nav', en: 'Support Chat', bn: 'সাপোর্ট চ্যাট' },

    // --- Dashboard ---
    { key: 'dash_wallet_balance', category: 'dashboard', en: 'Wallet Balance', bn: 'ওয়ালেট ব্যালেন্স' },
    { key: 'dash_current_rating', category: 'dashboard', en: 'Current Rating', bn: 'বর্তমান রেটিং' },
    { key: 'dash_games_played', category: 'dashboard', en: 'Games Played', bn: 'ম্যাচ খেলেছেন' },
    { key: 'dash_find_match', category: 'dashboard', en: 'Find a Match', bn: 'ম্যাচ খুঁজুন' },
    { key: 'dash_manage_wallet', category: 'dashboard', en: 'Manage Wallet', bn: 'ওয়ালেট পরিচালনা' },
    { key: 'dash_view_leaderboard', category: 'dashboard', en: 'View Leaderboard', bn: 'লিডারবোর্ড দেখুন' },

    // --- Wallet ---
    { key: 'wallet_title', category: 'wallet', en: 'My Wallet', bn: 'আমার ওয়ালেট' },
    { key: 'wallet_total_balance', category: 'wallet', en: 'Current Balance', bn: 'বর্তমান ব্যালেন্স' },
    { key: 'wallet_deposit_balance', category: 'wallet', en: 'Deposit Balance', bn: 'ডিপোজিট ব্যালেন্স' },
    { key: 'wallet_win_balance', category: 'wallet', en: 'Winnings Balance', bn: 'উইনিং ব্যালেন্স' },
    { key: 'wallet_btn_deposit', category: 'wallet', en: 'Deposit', bn: 'ডিপোজিট' },
    { key: 'wallet_btn_withdraw', category: 'wallet', en: 'Withdraw', bn: 'উত্তোলন' },
    { key: 'wallet_manage_funds', category: 'wallet', en: 'Manage Funds', bn: 'তহবিল পরিচালনা' },
    { key: 'wallet_history_title', category: 'wallet', en: 'Transaction History', bn: 'লেনদেন ইতিহাস' },
    { key: 'wallet_min_deposit_info', category: 'wallet', en: 'Min Deposit', bn: 'সর্বনিম্ন ডিপোজিট' },
    { key: 'wallet_min_withdraw_info', category: 'wallet', en: 'Min Withdraw', bn: 'সর্বনিম্ন উত্তোলন' },
    { key: 'wallet_no_transactions', category: 'wallet', en: 'No transactions yet.', bn: 'কোনো লেনদেন পাওয়া যায়নি।' },
    // Wallet Modal - Withdraw
    { key: 'wallet_req_withdraw', category: 'wallet', en: 'Request Withdrawal', bn: 'উত্তোলনের অনুরোধ' },
    { key: 'wallet_method', category: 'wallet', en: 'Withdrawal Method', bn: 'উত্তোলনের মাধ্যম' },
    { key: 'wallet_acc_number', category: 'wallet', en: 'Account Number', bn: 'অ্যাকাউন্ট নম্বর' },
    { key: 'wallet_amount', category: 'wallet', en: 'Amount', bn: 'পরিমাণ' },
    { key: 'wallet_available', category: 'wallet', en: 'Available', bn: 'উপলব্ধ' },
    { key: 'wallet_fee_info', category: 'wallet', en: 'Transaction Fee', bn: 'ট্রানজেকশন ফি' },
    { key: 'wallet_submit_req', category: 'wallet', en: 'Submit Request', bn: 'অনুরোধ জমা দিন' },
    // Wallet Modal - Deposit
    { key: 'wallet_add_funds', category: 'wallet', en: 'Add Funds', bn: 'ফান্ড যোগ করুন' },
    { key: 'wallet_sel_method', category: 'wallet', en: 'Select Payment Method', bn: 'পেমেন্ট মেথড সিলেক্ট করুন' },
    { key: 'wallet_send_money_to', category: 'wallet', en: 'Send Money To', bn: 'টাকা পাঠান এই নম্বরে' },
    { key: 'wallet_personal_agent', category: 'wallet', en: 'Personal/Agent', bn: 'পার্সোনাল/এজেন্ট' },
    { key: 'wallet_sender_num', category: 'wallet', en: 'Sender Number', bn: 'প্রেরকের নম্বর' },
    { key: 'wallet_trx_id', category: 'wallet', en: 'Transaction ID (TrxID)', bn: 'ট্রানজেকশন আইডি (TrxID)' },
    { key: 'wallet_verify_pay', category: 'wallet', en: 'Verify Payment', bn: 'পেমেন্ট যাচাই করুন' },
    { key: 'wallet_proceed_pay', category: 'wallet', en: 'Proceed to Pay', bn: 'পেমেন্ট করতে এগিয়ে যান' },
    { key: 'wallet_redirect_msg', category: 'wallet', en: 'You will be redirected to...', bn: 'আপনাকে রিডাইরেক্ট করা হবে...' },

    // --- Tournaments ---
    { key: 'tour_tab_upcoming', category: 'tournament', en: 'UPCOMING', bn: 'আসন্ন' },
    { key: 'tour_tab_ongoing', category: 'tournament', en: 'ONGOING', bn: 'চলমান' },
    { key: 'tour_tab_completed', category: 'tournament', en: 'COMPLETED', bn: 'সমাপ্ত' },
    { key: 'tour_tab_review', category: 'tournament', en: 'REVIEW', bn: 'রিভিউ' },
    { key: 'tour_join_btn', category: 'tournament', en: 'JOIN', bn: 'যোগ দিন' },
    { key: 'tour_joining', category: 'tournament', en: 'JOINING...', bn: 'যুক্ত হচ্ছে...' },
    { key: 'tour_joined_btn', category: 'tournament', en: 'JOINED', bn: 'যুক্ত হয়েছেন' },
    { key: 'tour_play_btn', category: 'tournament', en: 'PLAY', bn: 'খেলুন' },
    { key: 'tour_win_prize', category: 'tournament', en: 'Win Prize', bn: 'জেতার পুরস্কার' },
    { key: 'tour_entry_fee', category: 'tournament', en: 'Entry Fee', bn: 'এন্ট্রি ফি' },
    { key: 'tour_joined_count', category: 'tournament', en: 'joined', bn: 'জন যুক্ত' },
    { key: 'tour_loading', category: 'tournament', en: 'Loading tournaments...', bn: 'টুর্নামেন্ট লোড হচ্ছে...' },
    { key: 'tour_no_data', category: 'tournament', en: 'No matches found.', bn: 'কোনো ম্যাচ পাওয়া যায়নি।' },
    { key: 'tour_tag_single', category: 'tournament', en: 'SINGLE', bn: 'সিঙ্গেল' },
    { key: 'tour_tag_live', category: 'tournament', en: 'LIVE', bn: 'লাইভ' },
    { key: 'tour_tag_canceled', category: 'tournament', en: 'Canceled', bn: 'বাতিল' },
    { key: 'tour_play_now', category: 'tournament', en: 'PLAY NOW', bn: 'এখনই খেলুন' },

    // --- Contest Details ---
    { key: 'contest_title', category: 'contest', en: 'Contest Details', bn: 'ম্যাচের বিবরণ' },
    { key: 'contest_win_prize', category: 'contest', en: 'WINNING PRIZE', bn: 'বিজয়ী পুরস্কার' },
    { key: 'contest_submit_result', category: 'contest', en: 'Submit Result', bn: 'ফলাফল জমা দিন' },
    { key: 'contest_your_result', category: 'contest', en: 'Your Result', bn: 'আপনার ফলাফল' },
    { key: 'contest_result_win', category: 'contest', en: 'WIN', bn: 'জয়' },
    { key: 'contest_result_lose', category: 'contest', en: 'LOSE', bn: 'পরাজয়' },
    { key: 'contest_result_cancelled', category: 'contest', en: 'CANCELLED', bn: 'বাতিল' },
    { key: 'contest_upload_screenshot', category: 'contest', en: 'Upload Screenshot Proof', bn: 'স্ক্রিনশট প্রমাণ আপলোড করুন' },
    { key: 'contest_change_screenshot', category: 'contest', en: 'Change Screenshot', bn: 'স্ক্রিনশট পরিবর্তন করুন' },
    { key: 'contest_reason_placeholder', category: 'contest', en: 'Please provide a reason for cancellation...', bn: 'বাতিলের কারণ লিখুন...' },
    { key: 'contest_submit_btn', category: 'contest', en: 'Submit', bn: 'জমা দিন' },
    { key: 'contest_submitting', category: 'contest', en: 'Submitting...', bn: 'জমা হচ্ছে...' },
    { key: 'contest_rules_policy', category: 'contest', en: 'Rules & Policy', bn: 'নিয়ম ও নীতি' },
    { key: 'contest_waiting_review', category: 'contest', en: 'Waiting for opponent or admin review.', bn: 'প্রতিপক্ষ বা অ্যাডমিন রিভিউর অপেক্ষায়।' },
    { key: 'contest_inactive_msg', category: 'contest', en: 'This match is no longer active for result submission.', bn: 'ফলাফল জমা দেওয়ার জন্য এই ম্যাচটি আর সক্রিয় নয়।' },

    // --- Profile ---
    { key: 'prof_personal_info', category: 'profile', en: 'Personal Information', bn: 'ব্যক্তিগত তথ্য' },
    { key: 'prof_game_stats', category: 'profile', en: 'Game Statistics', bn: 'গেম পরিসংখ্যান' },
    { key: 'prof_change_pass', category: 'profile', en: 'Change Password', bn: 'পাসওয়ার্ড পরিবর্তন' },
    { key: 'prof_btn_save', category: 'profile', en: 'Save Changes', bn: 'পরিবর্তন সেভ করুন' },
    { key: 'prof_btn_update_pass', category: 'profile', en: 'Update Password', bn: 'পাসওয়ার্ড আপডেট করুন' },
    { key: 'prof_saving', category: 'profile', en: 'Saving...', bn: 'সেভ হচ্ছে...' },
    { key: 'prof_stat_matches', category: 'profile', en: 'Total Matches', bn: 'মোট ম্যাচ' },
    { key: 'prof_stat_wins', category: 'profile', en: 'Total Wins', bn: 'মোট জয়' },
    { key: 'prof_stat_losses', category: 'profile', en: 'Total Losses', bn: 'মোট হার' },
    { key: 'prof_stat_winnings', category: 'profile', en: 'Total Winnings', bn: 'মোট আয়' },
    { key: 'prof_old_pass', category: 'profile', en: 'Old Password', bn: 'পুরাতন পাসওয়ার্ড' },
    { key: 'prof_new_pass', category: 'profile', en: 'New Password', bn: 'নতুন পাসওয়ার্ড' },
    { key: 'prof_confirm_pass', category: 'profile', en: 'Confirm New Password', bn: 'নতুন পাসওয়ার্ড নিশ্চিত করুন' },

    // --- Game ---
    { key: 'game_lobby_title', category: 'game', en: 'Game Lobby', bn: 'গেম লবি' },
    { key: 'game_waiting_msg', category: 'game', en: 'Waiting for opponent...', bn: 'প্রতিপক্ষের অপেক্ষায়...' },
    { key: 'game_btn_leave', category: 'game', en: 'Leave Game', bn: 'গেম ত্যাগ করুন' },
    { key: 'game_btn_start', category: 'game', en: 'Start Game', bn: 'গেম শুরু করুন' },
    { key: 'game_roll_dice', category: 'game', en: 'Roll Dice', bn: 'ছক্কা চালুন' },
    { key: 'game_your_turn', category: 'game', en: 'Your Turn', bn: 'আপনার চাল' },
    { key: 'game_winner_title', category: 'game', en: 'Winner!', bn: 'বিজয়ী!' },
    { key: 'game_over_title', category: 'game', en: 'Game Over', bn: 'খেলা শেষ' },
    
    // --- Global Chat ---
    { key: 'chat_title', category: 'chat', en: 'Global Chat Room', bn: 'গ্লোবাল চ্যাট রুম' },
    { key: 'chat_warning', category: 'chat', en: "⚠️ Don't use bad language", bn: "⚠️ খারাপ ভাষা ব্যবহার করবেন না" },
    { key: 'chat_placeholder', category: 'chat', en: 'Type a message...', bn: 'মেসেজ লিখুন...' },
    { key: 'chat_btn_send', category: 'chat', en: 'Send', bn: 'পাঠান' },
    { key: 'chat_unavailable', category: 'chat', en: 'Unavailable', bn: 'অনুপলব্ধ' },
    { key: 'chat_disabled_msg', category: 'chat', en: 'Group Chat is currently disabled.', bn: 'গ্রুপ চ্যাট বর্তমানে বন্ধ আছে।' },
    { key: 'chat_loading', category: 'chat', en: 'Loading chat...', bn: 'চ্যাট লোড হচ্ছে...' },

    // --- Refer ---
    { key: 'refer_title', category: 'refer', en: 'Refer & Earn', bn: 'রেফার ও আয়' },
    { key: 'refer_total_refer', category: 'refer', en: 'Total Refer', bn: 'মোট রেফার' },
    { key: 'refer_total_earn', category: 'refer', en: 'Total Refer Earn', bn: 'মোট রেফার আয়' },
    { key: 'refer_your_code', category: 'refer', en: 'Your Referral Code', bn: 'আপনার রেফারেল কোড' },
    { key: 'refer_copy_msg', category: 'refer', en: 'Tap to copy & share with your friends!', bn: 'কপি করতে ট্যাপ করুন এবং বন্ধুদের সাথে শেয়ার করুন!' },
    { key: 'refer_btn_history', category: 'refer', en: 'Refer History', bn: 'রেফার ইতিহাস' },
    { key: 'refer_btn_leaderboard', category: 'refer', en: 'Refer Leaderboard', bn: 'রেফার লিডারবোর্ড' },
    { key: 'refer_claim_title', category: 'refer', en: 'Claim Referral Code', bn: 'রেফারেল কোড ক্লেইম করুন' },
    { key: 'refer_claim_subtitle', category: 'refer', en: 'Did a friend refer you? Enter their code below to claim your reward.', bn: 'বন্ধু কি রেফার করেছে? নিচে কোড দিয়ে পুরস্কার নিন।' },
    { key: 'refer_btn_claim', category: 'refer', en: 'Claim', bn: 'ক্লেইম করুন' },
    { key: 'refer_history_title', category: 'refer', en: 'Refer History', bn: 'রেফার ইতিহাস' },
    { key: 'refer_no_history', category: 'refer', en: "You haven't referred anyone yet.", bn: 'আপনি এখনও কাউকে রেফার করেননি।' },
    { key: 'refer_leaderboard_title', category: 'refer', en: 'Refer Leaderboard', bn: 'রেফার লিডারবোর্ড' },
    { key: 'refer_filter_all_time', category: 'refer', en: 'All Time', bn: 'সর্বকালের' },
    { key: 'refer_filter_monthly', category: 'refer', en: 'Monthly', bn: 'মাসিক' },
    { key: 'refer_filter_weekly', category: 'refer', en: 'Weekly', bn: 'সাপ্তাহিক' },
    { key: 'refer_no_data', category: 'refer', en: 'No referral data found for this period.', bn: 'এই সময়ের জন্য কোনো রেফারেল ডেটা পাওয়া যায়নি।' },

    // --- Leaderboard ---
    { key: 'lb_title', category: 'leaderboard', en: 'Leaderboard', bn: 'লিডারবোর্ড' },
    { key: 'lb_weekly', category: 'leaderboard', en: 'Weekly', bn: 'সাপ্তাহিক' },
    { key: 'lb_monthly', category: 'leaderboard', en: 'Monthly', bn: 'মাসিক' },
    { key: 'lb_all_time', category: 'leaderboard', en: 'All Time', bn: 'সর্বকালের' },
    { key: 'lb_loading', category: 'leaderboard', en: 'Loading leaderboard...', bn: 'লিডারবোর্ড লোড হচ্ছে...' },
    { key: 'lb_no_data', category: 'leaderboard', en: 'No data available for this period.', bn: 'এই সময়ের জন্য কোনো তথ্য নেই।' },

    // --- More Menu ---
    { key: 'menu_about', category: 'menu', en: 'About Us', bn: 'আমাদের সম্পর্কে' },
    { key: 'menu_faq', category: 'menu', en: 'FAQ', bn: 'প্রশ্নাবলী' },
    { key: 'menu_privacy', category: 'menu', en: 'Privacy Policy', bn: 'গোপনীয়তা নীতি' },
    { key: 'menu_terms', category: 'menu', en: 'Terms & Conditions', bn: 'শর্তাবলী' },
    { key: 'menu_admin', category: 'menu', en: 'Admin Panel', bn: 'অ্যাডমিন প্যানেল' },
    { key: 'menu_logout', category: 'menu', en: 'Logout', bn: 'লগআউট' },
    { key: 'menu_theme_dark', category: 'menu', en: 'Dark Mode', bn: 'ডার্ক মোড' },
    { key: 'menu_theme_light', category: 'menu', en: 'Light Mode', bn: 'লাইট মোড' },
    { key: 'menu_support', category: 'menu', en: 'Support Chat', bn: 'সাপোর্ট চ্যাট' },
    { key: 'menu_profile', category: 'menu', en: 'Profile', bn: 'প্রোফাইল' },
    { key: 'menu_wallet', category: 'menu', en: 'My Wallet', bn: 'আমার ওয়ালেট' },
    { key: 'menu_history', category: 'menu', en: 'Transaction History', bn: 'লেনদেন ইতিহাস' },
    { key: 'menu_refer', category: 'menu', en: 'Refer & Earn', bn: 'রেফার ও আয়' },
    { key: 'menu_leaderboard', category: 'menu', en: 'Leaderboard', bn: 'লিডারবোর্ড' },
    { key: 'menu_language', category: 'menu', en: 'Language', bn: 'ভাষা' },

    // --- Support Chat ---
    { key: 'support_title', category: 'support', en: 'Admin Support', bn: 'অ্যাডমিন সাপোর্ট' },
    { key: 'support_online', category: 'support', en: 'Admin is online', bn: 'অ্যাডমিন অনলাইনে আছে' },
    { key: 'support_offline', category: 'support', en: 'Admin is offline', bn: 'অ্যাডমিন অফলাইনে আছে' },

    // --- Common ---
    { key: 'btn_close', category: 'common', en: 'Close', bn: 'বন্ধ করুন' },
    { key: 'btn_confirm', category: 'common', en: 'Confirm', bn: 'নিশ্চিত করুন' },
    { key: 'btn_cancel', category: 'common', en: 'Cancel', bn: 'বাতিল করুন' },
    { key: 'status_pending', category: 'common', en: 'PENDING', bn: 'অপেক্ষমান' },
    { key: 'status_completed', category: 'common', en: 'COMPLETED', bn: 'সম্পন্ন' },
    { key: 'status_failed', category: 'common', en: 'FAILED', bn: 'ব্যর্থ' },
    { key: 'label_loading', category: 'common', en: 'Loading...', bn: 'লোড হচ্ছে...' },
    { key: 'col_date', category: 'common', en: 'Date', bn: 'তারিখ' },
    { key: 'col_type', category: 'common', en: 'Type', bn: 'ধরন' },
    { key: 'col_amount', category: 'common', en: 'Amount', bn: 'পরিমাণ' },
    { key: 'col_status', category: 'common', en: 'Status', bn: 'অবস্থা' },
];

const LanguageManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('translations');
    const [loading, setLoading] = useState(false);
    const [languages, setLanguages] = useState<Language[]>([]);
    const [translations, setTranslations] = useState<TranslationRow[]>([]);
    
    // Language Form State
    const [newLangCode, setNewLangCode] = useState('');
    const [newLangName, setNewLangName] = useState('');
    const [newLangFlag, setNewLangFlag] = useState('');
    
    // Translation Form State
    const [newKey, setNewKey] = useState('');
    const [searchKey, setSearchKey] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    
    const [seeding, setSeeding] = useState(false);

    const fetchLanguages = useCallback(async () => {
        if (!supabase) return;
        const { data } = await supabase.from('app_languages').select('*').order('code');
        setLanguages(data || []);
    }, []);

    const fetchTranslations = useCallback(async () => {
        if (!supabase) return;
        setLoading(true);
        let query = supabase.from('app_translations').select('*').order('key_name');
        
        if (searchKey) {
            query = query.ilike('key_name', `%${searchKey}%`);
        }
        if (activeCategory !== 'all') {
            query = query.eq('category', activeCategory);
        }

        const { data } = await query;
        setTranslations(data || []);
        setLoading(false);
    }, [searchKey, activeCategory]);

    useEffect(() => {
        fetchLanguages();
        fetchTranslations();
    }, [fetchLanguages, fetchTranslations]);

    // --- Language Actions ---
    const handleAddLanguage = async () => {
        if (!newLangCode || !newLangName) return alert("Code and Name required");
        if (!supabase) return;
        
        const { error } = await supabase.from('app_languages').insert({
            code: newLangCode.toLowerCase(),
            name: newLangName,
            flag_icon: newLangFlag,
            active: true
        });
        
        if (error) alert(error.message);
        else {
            setNewLangCode('');
            setNewLangName('');
            setNewLangFlag('');
            fetchLanguages();
        }
    };
    
    const handleToggleLangActive = async (code: string, currentStatus: boolean) => {
        if (!supabase) return;
        await supabase.from('app_languages').update({ active: !currentStatus }).eq('code', code);
        fetchLanguages();
    };

    // --- Translation Actions ---
    const handleAddKey = async () => {
        if (!newKey) return;
        if (!supabase) return;
        
        // Snake case validation
        const formattedKey = newKey.toLowerCase().replace(/\s+/g, '_');
        
        const { error } = await supabase.from('app_translations').insert({
            key_name: formattedKey,
            values: {} // Empty initially
        });
        
        if (error) alert(error.message);
        else {
            setNewKey('');
            fetchTranslations();
        }
    };

    const handleUpdateTranslation = async (key: string, langCode: string, value: string, currentValues: any) => {
        if (!supabase) return;
        
        const newValues = { ...currentValues, [langCode]: value };
        
        // Optimistic UI update
        setTranslations(prev => prev.map(row => 
            row.key_name === key ? { ...row, values: newValues } : row
        ));

        // Debounced save could be implemented here, but direct save for now
        await supabase.from('app_translations').update({
            values: newValues
        }).eq('key_name', key);
    };
    
    const handleDeleteKey = async (key: string) => {
        if (!confirm("Delete this key?")) return;
        if (!supabase) return;
        await supabase.from('app_translations').delete().eq('key_name', key);
        fetchTranslations();
    };
    
    const handleSeedKeys = async () => {
        if (!supabase) return;
        if (!confirm(`This will check and add ${DEFAULT_KEYS.length} default keys to the database. Existing keys won't be overwritten. Continue?`)) return;
        
        setSeeding(true);
        let addedCount = 0;

        try {
            for (const item of DEFAULT_KEYS) {
                const { data } = await supabase.from('app_translations').select('key_name').eq('key_name', item.key).single();
                if (!data) {
                    // Insert if not exists with both English and Bengali
                    await supabase.from('app_translations').insert({
                        key_name: item.key,
                        category: item.category,
                        values: { en: item.en, bn: item.bn }
                    });
                    addedCount++;
                }
            }
            alert(`Successfully added ${addedCount} new keys.`);
            fetchTranslations();
        } catch (e: any) {
            alert(`Error seeding keys: ${e.message}`);
        } finally {
            setSeeding(false);
        }
    };

    // --- Styles ---
    const containerStyle: React.CSSProperties = { padding: '1rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' };
    const tabBtnStyle = (active: boolean): React.CSSProperties => ({
        padding: '0.75rem 1.5rem', cursor: 'pointer', border: 'none', background: 'none',
        borderBottom: active ? '3px solid #4299e1' : '3px solid transparent',
        fontWeight: active ? 'bold' : 'normal', fontSize: '1rem'
    });
    const inputStyle: React.CSSProperties = { padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', marginRight: '0.5rem' };
    const btnStyle: React.CSSProperties = { padding: '0.5rem 1rem', backgroundColor: '#48bb78', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' };

    return (
        <div>
            <h1 className="admin-page-header">Language & Translation Manager</h1>
            
            <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '1.5rem' }}>
                <button onClick={() => setActiveTab('translations')} style={tabBtnStyle(activeTab === 'translations')}>Translation Editor</button>
                <button onClick={() => setActiveTab('languages')} style={tabBtnStyle(activeTab === 'languages')}>Languages</button>
            </div>

            {activeTab === 'languages' && (
                <div style={containerStyle}>
                    <h3>Add New Language</h3>
                    <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <input placeholder="Code (e.g. bn)" value={newLangCode} onChange={e => setNewLangCode(e.target.value)} style={inputStyle} maxLength={5} />
                        <input placeholder="Name (e.g. Bengali)" value={newLangName} onChange={e => setNewLangName(e.target.value)} style={inputStyle} />
                        <input placeholder="Flag Emoji (🇧🇩)" value={newLangFlag} onChange={e => setNewLangFlag(e.target.value)} style={inputStyle} />
                        <button onClick={handleAddLanguage} style={btnStyle}>Add Language</button>
                    </div>

                    <table className="responsive-admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f7fafc', textAlign: 'left' }}>
                                <th style={{ padding: '10px' }}>Icon</th>
                                <th style={{ padding: '10px' }}>Code</th>
                                <th style={{ padding: '10px' }}>Name</th>
                                <th style={{ padding: '10px' }}>Status</th>
                                <th style={{ padding: '10px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {languages.map(lang => (
                                <tr key={lang.code} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px', fontSize: '1.5rem' }}>{lang.flag_icon}</td>
                                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{lang.code}</td>
                                    <td style={{ padding: '10px' }}>{lang.name}</td>
                                    <td style={{ padding: '10px' }}>
                                        <span style={{ 
                                            padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem',
                                            background: lang.active ? '#c6f6d5' : '#fed7d7', color: lang.active ? '#22543d' : '#822727'
                                        }}>
                                            {lang.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        <button 
                                            onClick={() => handleToggleLangActive(lang.code, lang.active)}
                                            style={{ fontSize: '0.8rem', padding: '4px 8px', cursor: 'pointer', marginRight: '5px' }}
                                        >
                                            {lang.active ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'translations' && (
                <div style={containerStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                             <input 
                                placeholder="Search keys..." 
                                value={searchKey} 
                                onChange={e => setSearchKey(e.target.value)} 
                                style={inputStyle} 
                            />
                            <select 
                                value={activeCategory} 
                                onChange={e => setActiveCategory(e.target.value)}
                                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                            >
                                <option value="all">All Categories</option>
                                <option value="nav">Navigation</option>
                                <option value="auth">Auth</option>
                                <option value="dashboard">Dashboard</option>
                                <option value="wallet">Wallet</option>
                                <option value="tournament">Tournaments</option>
                                <option value="profile">Profile</option>
                                <option value="game">Game</option>
                                <option value="refer">Referral</option>
                                <option value="chat">Chat</option>
                                <option value="menu">Menu</option>
                                <option value="contest">Contest Details</option>
                                <option value="support">Support</option>
                                <option value="leaderboard">Leaderboard</option>
                                <option value="common">Common</option>
                            </select>
                            <button onClick={() => fetchTranslations()} style={{ ...btnStyle, background: '#4299e1' }}>Search</button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                                onClick={handleSeedKeys} 
                                disabled={seeding}
                                style={{ ...btnStyle, backgroundColor: '#ed8936' }}
                                title="Populate database with default keys"
                            >
                                {seeding ? 'Seeding...' : 'Seed Default Keys (with BN)'}
                            </button>
                            <div style={{width: '1px', background: '#eee', margin: '0 5px'}}></div>
                            <input 
                                placeholder="New Key (e.g. login_btn)" 
                                value={newKey} 
                                onChange={e => setNewKey(e.target.value)} 
                                style={inputStyle} 
                            />
                            <button onClick={handleAddKey} style={btnStyle}>+ Add Key</button>
                        </div>
                    </div>

                    {loading ? <p>Loading translations...</p> : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ background: '#edf2f7', textAlign: 'left' }}>
                                        <th style={{ padding: '12px', width: '200px' }}>Key Name</th>
                                        {languages.filter(l => l.active).map(lang => (
                                            <th key={lang.code} style={{ padding: '12px' }}>
                                                {lang.flag_icon} {lang.name}
                                            </th>
                                        ))}
                                        <th style={{ padding: '12px', width: '50px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {translations.map(row => (
                                        <tr key={row.key_name} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: '600', color: '#2d3748' }}>
                                                {row.key_name}
                                                <div style={{ fontSize: '0.7rem', color: '#a0aec0' }}>{row.category}</div>
                                            </td>
                                            {languages.filter(l => l.active).map(lang => (
                                                <td key={lang.code} style={{ padding: '10px' }}>
                                                    <textarea 
                                                        defaultValue={row.values[lang.code] || ''}
                                                        onBlur={(e) => handleUpdateTranslation(row.key_name, lang.code, e.target.value, row.values)}
                                                        style={{ 
                                                            width: '100%', minHeight: '40px', padding: '8px', 
                                                            border: '1px solid #e2e8f0', borderRadius: '4px',
                                                            fontSize: '0.9rem', fontFamily: lang.code === 'bn' ? 'Hind Siliguri, sans-serif' : 'inherit'
                                                        }}
                                                        placeholder={`Enter ${lang.name} text...`}
                                                    />
                                                </td>
                                            ))}
                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                <button 
                                                    onClick={() => handleDeleteKey(row.key_name)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e' }}
                                                    title="Delete Key"
                                                >
                                                    <div dangerouslySetInnerHTML={{__html: TrashIconSVG()}} style={{width: '16px'}} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LanguageManagement;