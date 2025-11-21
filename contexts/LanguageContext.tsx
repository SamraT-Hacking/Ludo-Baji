
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

export interface Language {
    code: string;
    name: string;
    flag_icon: string;
    is_rtl: boolean;
    is_default: boolean;
    active: boolean;
}

interface LanguageContextType {
    currentLang: string;
    languages: Language[];
    changeLanguage: (code: string) => void;
    t: (key: string, defaultText?: string) => string;
    loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentLang, setCurrentLang] = useState<string>('en');
    const [languages, setLanguages] = useState<Language[]>([]);
    const [translations, setTranslations] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);

    // 1. Load Languages and Translations on Mount
    useEffect(() => {
        const initLanguage = async () => {
            if (!supabase) return;
            setLoading(true);
            
            // Fetch active languages
            const { data: langs } = await supabase
                .from('app_languages')
                .select('*')
                .eq('active', true);
            
            if (langs) {
                setLanguages(langs);
                // Determine initial language (Saved in LS -> Default in DB -> 'en')
                const savedLang = localStorage.getItem('app_language');
                if (savedLang && langs.some(l => l.code === savedLang)) {
                    setCurrentLang(savedLang);
                    updateDirection(savedLang, langs);
                } else {
                    const defaultLang = langs.find(l => l.is_default)?.code || 'en';
                    setCurrentLang(defaultLang);
                    updateDirection(defaultLang, langs);
                }
            }

            // Fetch all translations (Optimized: Fetch once and cache in memory)
            // In a huge app, we might fetch by category or lazy load, but for this size, fetching all is faster.
            const { data: transData } = await supabase
                .from('app_translations')
                .select('key_name, values');
            
            if (transData) {
                const transMap: Record<string, any> = {};
                transData.forEach(item => {
                    transMap[item.key_name] = item.values;
                });
                setTranslations(transMap);
            }
            
            setLoading(false);
        };

        initLanguage();
        
        // Realtime Subscription for updates (Admin edits -> User sees immediately)
        const channel = supabase?.channel('public:app_translations')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_translations' }, async (payload) => {
                // Refresh specific key or reload all? Let's just patch the state for efficiency
                const newItem = payload.new as any;
                if (newItem && newItem.key_name) {
                    setTranslations(prev => ({
                        ...prev,
                        [newItem.key_name]: newItem.values
                    }));
                }
            })
            .subscribe();
            
        return () => { supabase?.removeChannel(channel); };
    }, []);

    const updateDirection = (code: string, langs: Language[]) => {
        const lang = langs.find(l => l.code === code);
        if (lang?.is_rtl) {
            document.documentElement.setAttribute('dir', 'rtl');
        } else {
            document.documentElement.setAttribute('dir', 'ltr');
        }
    };

    const changeLanguage = (code: string) => {
        setCurrentLang(code);
        localStorage.setItem('app_language', code);
        updateDirection(code, languages);
    };

    const t = useCallback((key: string, defaultText?: string) => {
        if (!translations[key]) return defaultText || key;
        
        const val = translations[key][currentLang];
        // Fallback to English if translation missing in current language
        if (!val) return translations[key]['en'] || defaultText || key;
        
        return val;
    }, [translations, currentLang]);

    return (
        <LanguageContext.Provider value={{ currentLang, languages, changeLanguage, t, loading }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
};
