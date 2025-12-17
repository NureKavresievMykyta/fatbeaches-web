import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { ArrowLeft, Activity, TrendingDown } from 'lucide-react';
import { supabase } from '../supabase'; // перевірте шлях до вашого supabase клієнта

const AnalyticsView = ({ session, onClose }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            const last7Days = new Date();
            last7Days.setDate(last7Days.getDate() - 7);

            const [workouts, food] = await Promise.all([
                supabase.from('workout_entries')
                    .select('calories_burned_estimated, date_time')
                    .eq('user_id', session.user.id)
                    .gte('date_time', last7Days.toISOString()),
                supabase.from('food_entries')
                    .select('quantity_grams, date_time, food_items(calories)')
                    .eq('user_id', session.user.id)
                    .gte('date_time', last7Days.toISOString())
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
                if (dailyData[dayStr]) {
                    dailyData[dayStr].consumed += Math.round(entry.food_items.calories * (entry.quantity_grams / 100));
                }
            });

            workouts.data?.forEach(entry => {
                const dayStr = new Date(entry.date_time).toLocaleDateString('uk-UA', { weekday: 'short' });
                if (dailyData[dayStr]) {
                    dailyData[dayStr].burned += entry.calories_burned_estimated;
                }
            });

            setData(Object.values(dailyData).reverse());
            setLoading(false);
        };

        fetchAnalytics();
    }, [session.user.id]);

    if (loading) return <div className="fixed inset-0 bg-white flex items-center justify-center z-[70]">Завантаження...</div>;

    return (
        <div className="fixed inset-0 bg-slate-50 z-[60] overflow-y-auto animate-fade-in">
            <div className="max-w-md mx-auto min-h-screen pb-10 bg-white">
                <header className="p-6 flex items-center gap-4 border-b">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-slate-600" />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">Аналітика</h2>
                </header>

                <main className="p-6 space-y-8">
                    <section>
                        <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-4 uppercase text-xs tracking-widest">
                            <Activity size={16} className="text-blue-500" /> Спалено ккал
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="burned" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    <section>
                        <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-4 uppercase text-xs tracking-widest">
                            <TrendingDown size={16} className="text-emerald-500" /> Спожито ккал
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="consumed" radius={[4, 4, 0, 0]}>
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.consumed > 2000 ? '#ef4444' : '#10b981'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default AnalyticsView;