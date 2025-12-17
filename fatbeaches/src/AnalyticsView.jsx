import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { supabase } from './supabase';

const AnalyticsView = ({ session, onClose }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const last7Days = new Date();
                last7Days.setDate(last7Days.getDate() - 7);

                // Виконуємо запити
                const [workoutsRes, foodRes] = await Promise.all([
                    supabase.from('workout_entries')
                        .select('calories_burned_estimated, date_time')
                        .eq('user_id', session.user.id)
                        .gte('date_time', last7Days.toISOString()),
                    supabase.from('food_entries')
                        .select('quantity_grams, date_time, food_items(calories)')
                        .eq('user_id', session.user.id)
                        .gte('date_time', last7Days.toISOString())
                ]);

                // Створюємо порожній скелет на 7 днів
                const dailyData = {};
                for (let i = 0; i < 7; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dayStr = date.toLocaleDateString('uk-UA', { weekday: 'short' });
                    dailyData[dayStr] = { name: dayStr, consumed: 0, burned: 0 };
                }

                // Заповнюємо дані їжі
                foodRes.data?.forEach(entry => {
                    const dayStr = new Date(entry.date_time).toLocaleDateString('uk-UA', { weekday: 'short' });
                    if (dailyData[dayStr] && entry.food_items) {
                        const cals = Math.round(entry.food_items.calories * (entry.quantity_grams / 100));
                        dailyData[dayStr].consumed += cals;
                    }
                });

                // Заповнюємо дані тренувань
                workoutsRes.data?.forEach(entry => {
                    const dayStr = new Date(entry.date_time).toLocaleDateString('uk-UA', { weekday: 'short' });
                    if (dailyData[dayStr]) {
                        dailyData[dayStr].burned += (entry.calories_burned_estimated || 0);
                    }
                });

                setData(Object.values(dailyData).reverse());
            } catch (error) {
                console.error("Помилка завантаження аналітики:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [session.user.id]);

    if (loading) return (
        <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center font-medium text-slate-500">
            Завантаження аналітики...
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-50 z-[80] overflow-y-auto p-0 sm:p-4">
            <div className="max-w-md mx-auto bg-white sm:rounded-[2.5rem] shadow-xl min-h-screen sm:min-h-[auto]">
                <header className="p-6 flex items-center gap-4 border-b bg-white sticky top-0 z-10 sm:rounded-t-[2.5rem]">
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">Аналітика тижня</h2>
                </header>

                <div className="p-6 space-y-8">
                    {/* Графік тренувань */}
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.15em]">
                            Спалені калорії (ккал)
                        </p>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                        dy={10}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="burned"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        fill="url(#colorBurned)"
                                        fillOpacity={1}
                                    />
                                    <defs>
                                        <linearGradient id="colorBurned" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Додамо другий графік для їжі, щоб було корисніше */}
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.15em]">
                            Спожиті калорії (ккал)
                        </p>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                                        dy={10}
                                    />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Area
                                        type="monotone"
                                        dataKey="consumed"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        fill="url(#colorConsumed)"
                                    />
                                    <defs>
                                        <linearGradient id="colorConsumed" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsView;