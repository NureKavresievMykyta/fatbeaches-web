import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { ArrowLeft, Activity, TrendingDown } from 'lucide-react';
import { supabase } from './supabase'; // Перевір, щоб шлях до supabase.js був правильним

const AnalyticsView = ({ session, onClose }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            const last7Days = new Date();
            last7Days.setDate(last7Days.getDate() - 7);

            const [workouts, food] = await Promise.all([
                supabase.from('workout_entries').select('calories_burned_estimated, date_time').eq('user_id', session.user.id).gte('date_time', last7Days.toISOString()),
                supabase.from('food_entries').select('quantity_grams, date_time, food_items(calories)').eq('user_id', session.user.id).gte('date_time', last7Days.toISOString())
            ]);

            const dailyData = {};
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dayStr = date.toLocaleDateString('uk-UA', { weekday: 'short' });
                dailyData[dayStr] = { name: dayStr, consumed: 0, burned: 0 };
            }

            food.data?.forEach(entry => {
                const dayStr = new Date(entry.date_time).toLocaleDateString('uk-UA', { weekday: 'short' });
                if (dailyData[dayStr]) dailyData[dayStr].consumed += Math.round(entry.food_items.calories * (entry.quantity_grams / 100));
            });

            workouts.data?.forEach(entry => {
                const dayStr = new Date(entry.date_time).toLocaleDateString('uk-UA', { weekday: 'short' });
                if (dailyData[dayStr]) dailyData[dayStr].burned += entry.calories_burned_estimated;
            });

            setData(Object.values(dailyData).reverse());
            setLoading(false);
        };
        fetchAnalytics();
    }, [session.user.id]);

    if (loading) return <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center">Завантаження...</div>;

    return (
        <div className="fixed inset-0 bg-slate-50 z-[80] overflow-y-auto p-4">
            <div className="max-w-md mx-auto bg-white rounded-[2rem] shadow-xl min-h-screen">
                <header className="p-6 flex items-center gap-4 border-b">
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><ArrowLeft size={20} /></button>
                    <h2 className="text-xl font-bold">Аналітика тижня</h2>
                </header>
                <div className="p-6 space-y-10">
                    <div className="h-64">
                        <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">Активність (ккал)</p>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <Tooltip />
                                <Area type="monotone" dataKey="burned" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsView;