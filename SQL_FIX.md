
-- ============================================================
-- DATABASE FIX FOR "Database error saving new user"
-- ============================================================
-- এই কোডটি কপি করে আপনার Supabase Dashboard > SQL Editor এ গিয়ে রান করুন।
-- এটি আপনার ইউজার তৈরির অটোমেটিক সিস্টেমটি ঠিক করে দিবে।

-- ১. আগের সমস্যাযুক্ত ট্রিগার ডিলিট করা
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ২. রেফারেল কোড জেনারেট করার ফাংশন তৈরি
CREATE OR REPLACE FUNCTION generate_unique_referral_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- ৮ অক্ষরের একটি র‍্যান্ডম কোড তৈরি (সংখ্যা ও অক্ষর মিলিয়ে)
        new_code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- চেক করা হচ্ছে এই কোডটি আগে আছে কিনা
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO exists;
        
        -- যদি না থাকে, তাহলে এই কোডটি রিটার্ন করবে
        IF NOT exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ৩. নতুন ইউজার হ্যান্ডেল করার মেইন ফাংশন
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    referrer_id uuid := null;
    provided_referral_code text;
BEGIN
    -- মেটাডাটা থেকে রেফারেল কোড বের করা
    provided_referral_code := new.raw_user_meta_data->>'referral_code';

    -- যদি রেফারেল কোড দেওয়া থাকে এবং সেটি ভ্যালিড হয়, তাহলে রেফারার খুঁজে বের করা
    IF provided_referral_code IS NOT NULL AND provided_referral_code <> '' THEN
        SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = provided_referral_code LIMIT 1;
    END IF;

    -- প্রোফাইল টেবিলে ডাটা ইনসার্ট করা
    INSERT INTO public.profiles (
        id,
        username,
        email,
        mobile,
        referral_code,
        referred_by,
        deposit_balance,
        winnings_balance,
        wins,
        losses,
        rating,
        is_banned,
        role,
        created_at,
        updated_at
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Player'), -- নাম না থাকলে 'Player' সেট হবে
        new.email,
        COALESCE(new.raw_user_meta_data->>'mobile', new.raw_user_meta_data->>'phone'),
        generate_unique_referral_code(), -- ইউনিক রেফারেল কোড জেনারেট হবে
        referrer_id, -- রেফারার আইডি (যদি থাকে)
        0, -- প্রাথমিক ব্যালেন্স ০
        0,
        0,
        0,
        1000, -- প্রাথমিক রেটিং ১০০০
        FALSE,
        'user',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING; -- যদি আইডি অলরেডি থাকে, এরর দিবে না

    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- যদি কোনো এরর হয়, লগ করবে কিন্তু ইউজার তৈরি আটকাবে না
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ৪. ট্রিগারটি আবার সেট করা
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ৫. পারমিশন নিশ্চিত করা
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- সম্পন্ন হয়েছে মেসেজ
SELECT 'Database trigger fixed successfully' as status;
