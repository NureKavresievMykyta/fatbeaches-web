import React, { useEffect, useState } from 'react';
import { ArrowLeft, Activity, Utensils } from 'lucide-react';
import { supabase } from './supabase';

const AnalyticsView = ({ session, onClose }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Масив назв днів латиницею, щоб уникнути помилок кодування, 
    // з подальшим перетворенням в українську через switch
    const getDayName = (date) => {
        const days = ['Nd', 'Pn', 'Vt', 'Sr', 'Cht', 'Pt', 'Sb'];
        const dayIndex = date.getDay();
        const namesUA = {
            'Nd': 'Нд', 'Pn': 'Пн', 'Vt': 'Вт', 'Sr': 'Ср',
            'Cht': 'Чт', 'Pt': 'Пт', 'Sb': 'Сб'
        };
        return namesUA[days[dayIndex]];
    };

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const last7Days = new Date();
                last7Days.setHours(0, 0, 0, 0);
                last7Days.setDate(last7Days.getDate() - 6);

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
                // Створюємо масив за останні 7 днів (включаючи сьогодні)
                for (let i = 0; i < 7; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateKey = date.toISOString().split('T')[0];
                    dailyData[dateKey] = {
                        name: getDayName(date),
                        consumed: 0,
                        burned: 0
                    };
                }

                // Обробка їжі
                foodRes.data?.forEach(entry => {
                    const entryKey = entry.date_time.split('T')[0];
                    if (dailyData[entryKey] && entry.food_items) {
                        const cals = Math.round(entry.food_items.calories * (entry.quantity_grams / 100));
                        dailyData[entryKey].consumed += cals;
                    }
                });

                // Обробка тренувань
                workoutsRes.data?.forEach(entry => {
                    const entryKey = entry.date_time.split('T')[0];
                    if (dailyData[entryKey]) {
                        dailyData[entryKey].burned += (entry.calories_burned_estimated || 0);
                    }
                });

                setData(Object.values(dailyData).reverse());
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [session.user.id]);

    if (loading) return (
        <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center font-medium text-slate-500">
            Завантаження...
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-100 z-[80] overflow-y-auto p-0 sm:p-4">
            <div className="max-w-md mx-auto bg-white sm:rounded-[2.5rem] shadow-2xl min-h-screen">
                <header className="p-6 flex items-center gap-4 border-b sticky top-0 bg-white z-10 sm:rounded-t-[2.5rem]">
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <h2 className="text-xl font-bold text-slate-800">Аналітика тижня</h2>
                </header>

                <div className="p-6 space-y-4 text-slate-800">
                    {data.map((day, idx) => {
                        const maxVal = Math.max(day.consumed, day.burned, 2000);

                        return (
                            <div key={idx} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="font-bold text-slate-700 text-lg">{day.name}</span>
                                    <div className="flex gap-4 text-xs font-bold uppercase">
                                        <div className="flex flex-col items-end">
                                            <span className="text-emerald-600">+{day.consumed}</span>
                                            <span className="text-[10px] text-slate-400 font-medium tracking-tight">ккал</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-blue-600">-{day.burned}</span>
                                            <span className="text-[10px] text-slate-400 font-medium tracking-tight">ккал</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Utensils size={14} className="text-emerald-500 shrink-0" />
                                        <div className="relative flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="absolute h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                                                style={{ width: `${Math.min((day.consumed / maxVal) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Activity size={14} className="text-blue-500 shrink-0" />
                                        <div className="relative flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="absolute h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
                                                style={{ width: `${Math.min((day.burned / maxVal) * 100, 100)}%` }}
                                            />
                                        </div>
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