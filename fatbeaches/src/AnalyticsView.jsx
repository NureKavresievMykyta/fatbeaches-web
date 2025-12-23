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
                        fullDate: date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }),
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
            <p className="text-slate-500 font-medium">Завантаження аналітики...</p>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-50 z-[80] overflow-y-auto animate-fade-in">
            {/* Навігаційна панель на всю ширину */}
            <nav className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 z-10 px-6 py-4">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all group">
                            <ArrowLeft size={24} className="text-slate-600 group-hover:-translate-x-1" />
                        </button>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Аналітика прогресу</h1>
                    </div>
                    <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                        <Zap size={18} className="text-emerald-500 fill-emerald-500" />
                        <span className="text-sm font-bold text-emerald-700">Останні 7 днів</span>
                    </div>
                </div>
            </nav>

            <div className="max-w-[1600px] mx-auto px-6 py-10 space-y-12">
                {/* Секція графіків (сітка 7 колонок для ПК) */}
                <section>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-emerald-500 rounded-lg text-white shadow-lg shadow-emerald-200">
                            <Activity size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800">Денний баланс калорій</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
                        {dailyStats.map((day, idx) => {
                            const maxVal = Math.max(day.consumed, day.burned, 2500);
                            return (
                                <div key={idx} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                    <div className="text-center mb-6">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{day.name}</p>
                                        <p className="text-sm font-bold text-slate-800">{day.fullDate}</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="relative">
                                            <div className="flex items-center justify-between mb-2">
                                                <Utensils size={14} className="text-emerald-500" />
                                                <span className="text-xs font-black text-emerald-600">+{day.consumed}</span>
                                            </div>
                                            <div className="h-2.5 bg-emerald-50 rounded-full overflow-hidden">
                                                <div
                                                    style={{ width: `${(day.consumed / maxVal) * 100}%` }}
                                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000"
                                                />
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <div className="flex items-center justify-between mb-2">
                                                <Activity size={14} className="text-blue-500" />
                                                <span className="text-xs font-black text-blue-600">-{day.burned}</span>
                                            </div>
                                            <div className="h-2.5 bg-blue-50 rounded-full overflow-hidden">
                                                <div
                                                    style={{ width: `${(day.burned / maxVal) * 100}%` }}
                                                    className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-1000"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Секція тренувань (широка сітка) */}
                <section>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 rounded-lg text-white shadow-lg shadow-blue-200">
                                <TrendingUp size={20} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Журнал тренувань</h2>
                        </div>
                        <span className="bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full text-sm font-bold">
                            {workoutList.length} активностей
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {workoutList.length > 0 ? (
                            workoutList.map((w, i) => (
                                <div key={i} className="group bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:border-blue-200 transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-blue-50 rounded-[1.8rem] flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-inner">
                                            <Activity size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800 capitalize mb-1">
                                                {w.workout_items?.name || 'Тренування'}
                                            </h3>
                                            <div className="flex items-center gap-4 text-slate-400">
                                                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-tight">
                                                    <Calendar size={14} />
                                                    {new Date(w.date_time).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500/70 uppercase tracking-tight">
                                                    <Clock size={14} />
                                                    {w.duration_minutes} хв
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-slate-800 leading-none">-{w.calories_burned_estimated}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">ккал</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center">
                                <Activity size={48} className="text-slate-200 mb-4" />
                                <p className="text-slate-400 font-bold">На цьому тижні активностей ще не було</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AnalyticsView;