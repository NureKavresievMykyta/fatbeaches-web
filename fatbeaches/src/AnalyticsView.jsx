import React, { useEffect, useState } from 'react';
import { ArrowLeft, Activity, Utensils, Clock, Calendar, TrendingUp, Zap } from 'lucide-react';
import { supabase } from './supabase';

const AnalyticsView = ({ session, onClose }) => {
    const [dailyStats, setDailyStats] = useState([]);
    const [workoutList, setWorkoutList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const last7Days = new Date();
                last7Days.setHours(0, 0, 0, 0);
                last7Days.setDate(last7Days.getDate() - 6);

                const [workoutsRes, foodRes] = await Promise.all([
                    supabase.from('workout_entries')
                        .select('calories_burned_estimated, date_time, duration_minutes, workout_items(name)')
                        .eq('user_id', session.user.id)
                        .gte('date_time', last7Days.toISOString())
                        .order('date_time', { ascending: false }),
                    supabase.from('food_entries')
                        .select('quantity_grams, date_time, food_items(calories)')
                        .eq('user_id', session.user.id)
                        .gte('date_time', last7Days.toISOString())
                ]);

                const statsMap = {};
                const daysUA = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

                for (let i = 0; i < 7; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateKey = date.toISOString().split('T')[0];
                    statsMap[dateKey] = {
                        name: daysUA[date.getDay()],
                        date: date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }),
                        consumed: 0,
                        burned: 0
                    };
                }

                foodRes.data?.forEach(entry => {
                    const key = entry.date_time.split('T')[0];
                    if (statsMap[key] && entry.food_items) {
                        statsMap[key].consumed += Math.round(entry.food_items.calories * (entry.quantity_grams / 100));
                    }
                });

                workoutsRes.data?.forEach(entry => {
                    const key = entry.date_time.split('T')[0];
                    if (statsMap[key]) {
                        statsMap[key].burned += (entry.calories_burned_estimated || 0);
                    }
                });

                setDailyStats(Object.values(statsMap).reverse());
                setWorkoutList(workoutsRes.data || []);
            } catch (error) {
                console.error("Помилка:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [session.user.id]);

    if (loading) return (
        <div className="fixed inset-0 bg-slate-50 z-[100] flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium animate-pulse">Аналізуємо ваші успіхи...</p>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-50 z-[80] overflow-y-auto animate-fade-in">
            {/* Навігація */}
            <nav className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-10 px-4 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all group">
                            <ArrowLeft size={24} className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Аналітика прогресу</h1>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                        <Zap size={18} className="text-emerald-500 fill-emerald-500" />
                        <span className="text-sm font-bold text-emerald-700">Останні 7 днів</span>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-12">
                {/* Секція графіків */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Activity className="text-emerald-500" size={20} />
                            Денна активність
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                        {dailyStats.map((day, idx) => {
                            const maxVal = Math.max(day.consumed, day.burned, 2500);
                            return (
                                <div key={idx} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                    <div className="text-center mb-6">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{day.name}</p>
                                        <p className="text-sm font-medium text-slate-500">{day.date}</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="relative pt-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <Utensils size={14} className="text-emerald-500" />
                                                <span className="text-xs font-bold text-emerald-600">+{day.consumed}</span>
                                            </div>
                                            <div className="overflow-hidden h-3 text-xs flex rounded-full bg-emerald-50">
                                                <div style={{ width: `${(day.consumed / maxVal) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000"></div>
                                            </div>
                                        </div>

                                        <div className="relative pt-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <Activity size={14} className="text-blue-500" />
                                                <span className="text-xs font-bold text-blue-600">-{day.burned}</span>
                                            </div>
                                            <div className="overflow-hidden h-3 text-xs flex rounded-full bg-blue-50">
                                                <div style={{ width: `${(day.burned / maxVal) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-1000"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Секція тренувань */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <TrendingUp className="text-blue-500" size={20} />
                            Журнал тренувань
                        </h2>
                        <span className="text-sm font-medium text-slate-400">{workoutList.length} занять</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {workoutList.length > 0 ? (
                            workoutList.map((w, i) => (
                                <div key={i} className="group bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:border-blue-200 transition-all">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="bg-blue-50 p-4 rounded-3xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                            <Activity size={28} />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-slate-800 leading-none">-{w.calories_burned_estimated}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ккал спалено</p>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-slate-800 mb-4 capitalize">
                                        {w.workout_items?.name || 'Тренування'}
                                    </h3>

                                    <div className="flex items-center gap-4 py-4 border-t border-slate-50">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Clock size={16} />
                                            <span className="text-sm font-bold">{w.duration_minutes} хв</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Calendar size={16} />
                                            <span className="text-sm font-bold">
                                                {new Date(w.date_time).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
                                <Activity size={48} className="text-slate-200 mb-4" />
                                <p className="text-slate-400 font-bold">На цьому тижні активностей ще не було</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default AnalyticsView;