
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { AdminView } from './AdminPanel';
import { 
    UserGroupIconSVG, AdminCommissionIconSVG, TotalMatchesIconSVG, 
    AdminPendingIconSVG, WalletIconSVG, AdminCancelIconSVG
} from '../../assets/icons';

interface AdminDashboardProps {
    setView: (view: AdminView) => void;
}

interface StatCardProps {
    icon: string;
    label: string;
    value: string | number;
    breakdown?: { label: string; value: string | number }[];
    className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, breakdown, className }) => {
    return (
        <div className={`stat-card ${className || ''}`}>
            <div className="stat-card-header">
                <span className="stat-card-label">{label}</span>
                <div className="stat-card-icon" dangerouslySetInnerHTML={{ __html: icon }} />
            </div>
            <p className="stat-card-value">{value}</p>
            {breakdown && (
                <div className="stat-card-breakdown-container">
                    {breakdown.map((item, index) => (
                        <div key={index} className={`stat-breakdown-card gradient-${(index % 3) + 1}`}>
                            <span className="stat-breakdown-label">{item.label}</span>
                            <span className="stat-breakdown-value">{item.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const AdminDashboard: React.FC<AdminDashboardProps> = ({ setView }) => {
    const [stats, setStats] = useState<any>({});
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        if (!supabase) return;

        const now = new Date();
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
        const weekStartObj = new Date();
        weekStartObj.setDate(weekStartObj.getDate() - 7);
        const weekStart = weekStartObj.toISOString();
        const monthStartObj = new Date();
        monthStartObj.setMonth(monthStartObj.getMonth() - 1);
        const monthStart = monthStartObj.toISOString();

        try {
            const [
                { count: totalUserCount },
                { data: transactionsToday },
                { data: tournamentsToday },
                { data: allProfiles },
                { data: appSettings },
                { data: allWinningsTransactions },
                { data: allCancelledTournaments },
                { count: activeTournamentsCount },
                { count: pendingWithdrawalsCount },
                { data: allCompletedWithdrawals },
                { data: allDeposits },
                { count: todaySignupCount },
            ] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('transactions').select('user_id').gte('created_at', todayStart),
                supabase.from('tournaments').select('players_joined').gte('created_at', todayStart),
                supabase.from('profiles').select('deposit_balance, winnings_balance'),
                supabase.from('app_settings').select('value').eq('key', 'admin_commission_percent').single(),
                supabase.from('transactions').select('amount, created_at').eq('type', 'WINNINGS').eq('status', 'COMPLETED'),
                supabase.from('tournaments').select('created_at').eq('status', 'CANCELLED'),
                supabase.from('tournaments').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
                supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'WITHDRAWAL').eq('status', 'PENDING'),
                supabase.from('transactions').select('amount, created_at').eq('type', 'WITHDRAWAL').eq('status', 'COMPLETED'),
                supabase.from('transactions').select('amount, created_at').eq('type', 'DEPOSIT').eq('status', 'COMPLETED'),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart),
            ]);

            // Process Data
            const activeUserIds = new Set([
                ...(transactionsToday || []).map(t => t.user_id),
                ...((tournamentsToday || []).flatMap(t => t.players_joined.map((p: any) => p.id)))
            ]);

            const totalUserBalance = (allProfiles || []).reduce((acc, p) => acc + Number(p.deposit_balance) + Number(p.winnings_balance), 0);
            
            const commissionPercent = appSettings?.value?.percentage || 0;
            const winningsTransactions = allWinningsTransactions || [];

            const calculateCommissionFromWinnings = (transactions: { amount: number }[]) => {
                if (!commissionPercent || commissionPercent <= 0 || commissionPercent >= 100) return 0;
                const totalWinnings = transactions.reduce((acc, t) => acc + Number(t.amount), 0);
                return totalWinnings * commissionPercent / (100 - commissionPercent);
            };

            const todayWinnings = winningsTransactions.filter(t => new Date(t.created_at) >= new Date(todayStart));
            const weeklyWinnings = winningsTransactions.filter(t => new Date(t.created_at) >= new Date(weekStart));
            const monthlyWinnings = winningsTransactions.filter(t => new Date(t.created_at) >= new Date(monthStart));

            const totalCommission = calculateCommissionFromWinnings(winningsTransactions);
            const todayCommission = calculateCommissionFromWinnings(todayWinnings);
            const weeklyCommission = calculateCommissionFromWinnings(weeklyWinnings);
            const monthlyCommission = calculateCommissionFromWinnings(monthlyWinnings);
            
            const totalCompleted = winningsTransactions.length;
            const todayCompleted = todayWinnings.length;
            const weeklyCompleted = weeklyWinnings.length;
            const monthlyCompleted = monthlyWinnings.length;

            const allWithdrawals = allCompletedWithdrawals || [];
            const totalWithdraw = allWithdrawals.reduce((acc, t) => acc + Number(t.amount), 0);
            const todayWithdraw = allWithdrawals.filter(t => new Date(t.created_at) >= new Date(todayStart)).reduce((acc, t) => acc + Number(t.amount), 0);
            const weeklyWithdraw = allWithdrawals.filter(t => new Date(t.created_at) >= new Date(weekStart)).reduce((acc, t) => acc + Number(t.amount), 0);
            const monthlyWithdraw = allWithdrawals.filter(t => new Date(t.created_at) >= new Date(monthStart)).reduce((acc, t) => acc + Number(t.amount), 0);

            const allUserDeposits = allDeposits || [];
            const totalDeposits = allUserDeposits.reduce((acc, t) => acc + Number(t.amount), 0);
            const todayDeposit = allUserDeposits.filter(t => new Date(t.created_at) >= new Date(todayStart)).reduce((acc, t) => acc + Number(t.amount), 0);
            const weeklyDeposit = allUserDeposits.filter(t => new Date(t.created_at) >= new Date(weekStart)).reduce((acc, t) => acc + Number(t.amount), 0);
            const monthlyDeposit = allUserDeposits.filter(t => new Date(t.created_at) >= new Date(monthStart)).reduce((acc, t) => acc + Number(t.amount), 0);

            const allCancelled = allCancelledTournaments || [];
            const todayCancelled = allCancelled.filter(t => new Date(t.created_at) >= new Date(todayStart)).length;
            const weeklyCancelled = allCancelled.filter(t => new Date(t.created_at) >= new Date(weekStart)).length;
            const monthlyCancelled = allCancelled.filter(t => new Date(t.created_at) >= new Date(monthStart)).length;

            setStats({
                totalUsers: totalUserCount || 0,
                todayActiveUsers: activeUserIds.size,
                todaySignups: todaySignupCount || 0,
                totalUserBalance,
                totalCommission, todayCommission, weeklyCommission, monthlyCommission,
                totalCompleted, todayCompleted, weeklyCompleted, monthlyCompleted,
                totalCancelled: allCancelled.length,
                todayCancelled, weeklyCancelled, monthlyCancelled,
                activeTournaments: activeTournamentsCount || 0,
                pendingWithdrawals: pendingWithdrawalsCount || 0,
                totalWithdraw, todayWithdraw, weeklyWithdraw, monthlyWithdraw,
                totalDeposits, todayDeposit, weeklyDeposit, monthlyDeposit,
            });

        } catch (error) {
            console.error("Error fetching admin stats:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        // Realtime subscription for dashboard stats
        if (!supabase) return;
        const channel = supabase.channel('admin-dashboard-updates')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchStats)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, fetchStats)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchStats)
          .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [fetchStats]);

    const formatCurrency = (val: number) => `৳${(val || 0).toFixed(2)}`;
    const formatCount = (val: number) => val || 0;
    
    if (loading) return <p>Loading dashboard...</p>;

    return (
        <div>
            <h1 className="admin-page-header" style={{ fontSize: '2rem', marginBottom: '2rem', color: 'var(--text-main)' }}>Admin Dashboard</h1>
            
            <div className="admin-dashboard-grid">
                <StatCard 
                    className="gradient-1" 
                    icon={UserGroupIconSVG()} 
                    label="Total Users" 
                    value={formatCount(stats.totalUsers)} 
                    breakdown={[
                        {label: 'Today Login', value: formatCount(stats.todayActiveUsers)},
                        {label: 'Today Signup', value: formatCount(stats.todaySignups)}
                    ]} 
                />
                <StatCard 
                    className="gradient-2" 
                    icon={WalletIconSVG()} 
                    label="User Balance" 
                    value={formatCurrency(stats.totalUserBalance)} 
                />
                <StatCard 
                    className="gradient-3"
                    icon={AdminCommissionIconSVG()} 
                    label="Admin Commission" 
                    value={formatCurrency(stats.totalCommission)} 
                    breakdown={[
                        {label: 'Today', value: formatCurrency(stats.todayCommission)},
                        {label: 'Week', value: formatCurrency(stats.weeklyCommission)},
                        {label: 'Month', value: formatCurrency(stats.monthlyCommission)},
                    ]} 
                />
                <StatCard 
                    className="gradient-4"
                    icon={TotalMatchesIconSVG()} 
                    label="Completed Matches" 
                    value={formatCount(stats.totalCompleted)} 
                    breakdown={[
                        {label: 'Today', value: formatCount(stats.todayCompleted)},
                        {label: 'Week', value: formatCount(stats.weeklyCompleted)},
                        {label: 'Month', value: formatCount(stats.monthlyCompleted)},
                    ]} 
                />
                <StatCard 
                    className="gradient-5" 
                    icon={AdminCancelIconSVG()} 
                    label="Cancelled Matches" 
                    value={formatCount(stats.totalCancelled)} 
                    breakdown={[
                        {label: 'Today', value: formatCount(stats.todayCancelled)},
                        {label: 'Week', value: formatCount(stats.weeklyCancelled)},
                        {label: 'Month', value: formatCount(stats.monthlyCancelled)},
                    ]} 
                />
                <StatCard 
                    className="gradient-6" 
                    icon={WalletIconSVG()} 
                    label="Total Deposits" 
                    value={formatCurrency(stats.totalDeposits)} 
                    breakdown={[
                        {label: 'Today', value: formatCurrency(stats.todayDeposit)},
                        {label: 'Week', value: formatCurrency(stats.weeklyDeposit)},
                        {label: 'Month', value: formatCurrency(stats.monthlyDeposit)},
                    ]} 
                />
                 <StatCard 
                    className="gradient-7" 
                    icon={AdminPendingIconSVG()} 
                    label="Pending Withdrawals" 
                    value={formatCount(stats.pendingWithdrawals)} 
                />
            </div>
        </div>
    );
};

export default AdminDashboard;
