import React, { useEffect, useState } from 'react';
import { ArrowLeft, Activity, TrendingUp, Utensils } from 'lucide-react';
import { supabase } from './supabase';

const AnalyticsView = ({ session, onClose }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const last7Days = new Date();
                last7Days.setDate(last7Days.getDate() - 7);

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

                const dailyData = {};
                for (let i = 0; i < 7; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dayStr = date.toLocaleDateString('uk-UA', { weekday: 'short' });
                    dailyData[dayStr] = { name: dayStr, consumed: 0, burned: 0 };
                }

                foodRes.data?.forEach(entry => {
                    const dayStr = new Date(entry.date_time).toLocaleDateString('uk-UA', { weekday: 'short' });
                    if (dailyData[dayStr] && entry.food_items) {
                        const cals = Math.round(entry.food_items.calories * (entry.quantity_grams / 100));
                        dailyData[dayStr].consumed += cals;
                    }
                });

                workoutsRes.data?.forEach(entry => {
                    const dayStr = new Date(entry.date_time).toLocaleDateString('uk-UA', { weekday: 'short' });
                    if (dailyData[dayStr]) {
                        dailyData[dayStr].burned += (entry.calories_burned_estimated || 0);
                    }
                });

                setData(Object.values(dailyData).reverse());
            } catch (error) {
                console.error("Помилка:", error);
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
            <div className="max-w-md mx-auto bg-white sm:rounded-[2.5rem] shadow-xl min-h-screen">
                <header className="p-6 flex items-center gap-4 border-b sticky top-0 bg-white z-10 sm:rounded-t-[2.5rem]">
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">Аналітика тижня</h2>
                </header>

                <div className="p-6 space-y-6">
                    {data.map((day, idx) => {
                        const maxCals = Math.max(...data.map(d => Math.max(d.consumed, d.burned)), 1);
                        return (
                            <div key={idx} className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="font-bold text-slate-700 capitalize">{day.name}</span>
                                    <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        <span className="text-emerald-500">+{day.consumed}</span>
                                        <span className="text-blue-500">-{day.burned}</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {/* Шкала їжі */}
                                    <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="absolute h-full bg-emerald-400 rounded-full transition-all duration-500"
                                            style={{ width: `${(day.consumed / maxCals) * 100}%` }}
                                        />
                                    </div>
                                    {/* Шкала спорту */}
                                    <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="absolute h-full bg-blue-400 rounded-full transition-all duration-500"
                                            style={{ width: `${(day.burned / maxCals) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsView;