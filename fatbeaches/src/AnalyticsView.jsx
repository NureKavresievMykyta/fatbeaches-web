import React, { useEffect, useState } from 'react';
import { ArrowLeft, Activity, Utensils, Clock, Calendar } from 'lucide-react';
import { supabase } from './supabase';

const AnalyticsView = ({ session, onClose }) => {
    const [dailyStats, setDailyStats] = useState([]);
    const [workoutList, setWorkoutList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Функция для перевода типов тренировок
    const translateWorkout = (type) => {
        const types = {
            'strength': 'Силовая',
            'run': 'Бег',
            'yoga': 'Йога',
            'cardio': 'Кардио',
            'cycling': 'Вело',
            'swimming': 'Плавание'
        };
        return types[type?.toLowerCase()] || 'Тренировка';
    };

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const last7Days = new Date();
                last7Days.setHours(0, 0, 0, 0);
                last7Days.setDate(last7Days.getDate() - 6);

                // Загружаем тренировки и еду
                const [workoutsRes, foodRes] = await Promise.all([
                    supabase.from('workout_entries')
                        .select('calories_burned_estimated, date_time, workout_type, duration_minutes')
                        .eq('user_id', session.user.id)
                        .gte('date_time', last7Days.toISOString())
                        .order('date_time', { ascending: false }),
                    supabase.from('food_entries')
                        .select('quantity_grams, date_time, food_items(calories)')
                        .eq('user_id', session.user.id)
                        .gte('date_time', last7Days.toISOString())
                ]);

                // 1. Формируем данные для графиков (7 дней)
                const statsMap = {};
                for (let i = 0; i < 7; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateKey = date.toISOString().split('T')[0];
                    const dayLabel = date.toLocaleDateString('ru-RU', { weekday: 'short' });
                    statsMap[dateKey] = { name: dayLabel, consumed: 0, burned: 0 };
                }

                foodRes.data?.forEach(entry => {
                    const key = entry.date_time.split('T')[0];
                    if (statsMap[key] && entry.food_items) {
                        const cals = Math.round(entry.food_items.calories * (entry.quantity_grams / 100));
                        statsMap[key].consumed += cals;
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
                console.error("Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [session.user.id]);

    if (loading) return (
        <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center font-bold text-slate-400">
            Загрузка...
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-50 z-[80] overflow-y-auto">
            <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl pb-10">
                {/* Header */}
                <header className="p-6 flex items-center gap-4 border-b sticky top-0 bg-white z-10">
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">Аналитика</h2>
                </header>

                <div className="p-6 space-y-8">
                    {/* Графики калорий */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Баланс за 7 дней</h3>
                        <div className="space-y-4">
                            {dailyStats.map((day, idx) => {
                                const maxVal = Math.max(day.consumed, day.burned, 2500);
                                return (
                                    <div key={idx} className="bg-slate-50 p-4 rounded-[2rem] border border-slate-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="font-bold text-slate-700 capitalize">{day.name}</span>
                                            <div className="flex gap-3 text-[10px] font-black">
                                                <span className="text-emerald-500">+{day.consumed}</span>
                                                <span className="text-blue-500">-{day.burned}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${(day.consumed / maxVal) * 100}%` }} />
                                            </div>
                                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-400 transition-all duration-1000" style={{ width: `${(day.burned / maxVal) * 100}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Детализация тренировок */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Тренировки недели</h3>
                        <div className="space-y-3">
                            {workoutList.length > 0 ? (
                                workoutList.map((w, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                                                <Activity size={24} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{translateWorkout(w.workout_type)}</p>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                                    <Calendar size={10} />
                                                    <span>{new Date(w.date_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                                                    <Clock size={10} className="ml-1" />
                                                    <span>{w.duration_minutes} мин</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-700">-{w.calories_burned_estimated}</p>
                                            <p className="text-[9px] text-slate-400 uppercase font-bold">ккал</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                    <p className="text-slate-400 text-sm font-medium">На этой неделе еще не было тренировок</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsView;