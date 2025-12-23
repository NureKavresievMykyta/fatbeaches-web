import React, { useState, useEffect } from 'react';
import { Users, Utensils, Activity, Plus, Trash2, Save, X, Search } from 'lucide-react';
import { supabase } from './supabase';

const AdminDashboard = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('foods');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let query;
                if (activeTab === 'users') {
                    // ВИПРАВЛЕННЯ: Використовуємо таблицю 'users', оскільки саме там ви зберігаєте ролі в App.jsx
                    // Якщо у вас дані про імена в 'user_profiles', змініть назву таблиці тут назад.
                    query = supabase.from('users').select('*');
                } else if (activeTab === 'foods') {
                    query = supabase.from('food_items').select('*').order('name');
                } else if (activeTab === 'workouts') {
                    query = supabase.from('workout_items').select('*').order('name');
                }

                const { data, error } = await query;
                if (error) throw error;
                setItems(data || []);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeTab]);

    const handleDelete = async (id) => {
        if (!window.confirm('Ви впевнені, що хочете видалити цей запис?')) return;

        try {
            // Визначаємо правильну таблицю для видалення
            const table = activeTab === 'foods' ? 'food_items' :
                activeTab === 'workouts' ? 'workout_items' : 'users';

            // Зверніть увагу: видалення користувача з публічної таблиці не видаляє його з Auth (але це нормально для адмінки)
            const { error } = await supabase.from(table).delete().eq(activeTab === 'users' ? 'user_id' : 'id', id);

            if (error) throw error;

            // Оновлюємо стан локально, фільтруючи по правильному ID
            setItems(items.filter(item => (activeTab === 'users' ? item.user_id : item.id) !== id));
        } catch (error) {
            alert('Помилка видалення: ' + error.message);
        }
    };

    const handleAdd = async () => {
        try {
            const table = activeTab === 'foods' ? 'food_items' : 'workout_items';

            // Валідація
            if (activeTab === 'foods') {
                if (!newItem.name || !newItem.calories) {
                    alert('Будь ласка, заповніть назву та калорії');
                    return;
                }
            }

            const { data, error } = await supabase.from(table).insert([newItem]).select();

            if (error) throw error;

            setItems([...items, data[0]]);
            setIsModalOpen(false);
            setNewItem({});
        } catch (error) {
            alert('Помилка додавання: ' + error.message);
        }
    };

    // Функція для безпечного відображення імені користувача
    const getUserDisplayName = (user) => {
        if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
        if (user.full_name) return user.full_name;
        if (user.email) return user.email;
        // Якщо імені немає, показуємо частину ID
        return `User ${user.user_id?.substring(0, 8)}...`;
    };

    const filteredItems = items.filter(item => {
        const term = searchTerm.toLowerCase();
        const name = item.name || item.full_name || item.first_name || '';
        const email = item.email || '';
        return name.toLowerCase().includes(term) || email.toLowerCase().includes(term);
    });

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-500 p-2 rounded-lg">
                            <Activity size={24} className="text-white" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">FatBeaches Admin</h1>
                    </div>
                    <button onClick={onLogout} className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                        Вийти
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <TabButton active={activeTab === 'foods'} onClick={() => setActiveTab('foods')} icon={Utensils} label="Продукти" />
                    <TabButton active={activeTab === 'workouts'} onClick={() => setActiveTab('workouts')} icon={Activity} label="Вправи" />
                    <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={Users} label="Користувачі" />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Пошук..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none text-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {activeTab !== 'users' && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-blue-200"
                        >
                            <Plus size={20} /> Додати запис
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-64 text-slate-400">Завантаження...</div>
                    ) : filteredItems.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-wider">ID</th>
                                        <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-wider">Назва / Інфо</th>
                                        <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-wider">Деталі</th>
                                        <th className="p-5 text-right text-xs font-black text-slate-400 uppercase tracking-wider">Дії</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredItems.map((item) => (
                                        <tr key={item.id || item.user_id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="p-5 text-slate-400 font-mono text-xs">
                                                {(item.id || item.user_id)?.toString().slice(0, 8)}...
                                            </td>

                                            <td className="p-5 font-bold text-slate-700">
                                                {activeTab === 'users' ? getUserDisplayName(item) : (item.name || 'Без назви')}
                                            </td>

                                            <td className="p-5 text-sm text-slate-500">
                                                {activeTab === 'foods' && (
                                                    <div className="flex flex-wrap gap-2 text-xs">
                                                        <span className="text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded">{item.calories} ккал</span>
                                                        <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">Б: {item.protein || 0}</span>
                                                        <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded">Ж: {item.fat || 0}</span>
                                                        <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">В: {item.carbs || 0}</span>
                                                    </div>
                                                )}
                                                {activeTab === 'users' && (
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                                                        {item.role || 'user'}
                                                    </span>
                                                )}
                                                {activeTab === 'workouts' && 'Активність'}
                                            </td>
                                            <td className="p-5 text-right">
                                                <button
                                                    onClick={() => handleDelete(item.id || item.user_id)}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <p>Записів не знайдено</p>
                            {activeTab === 'users' && (
                                <p className="text-xs mt-2 text-slate-300">
                                    (Перевірте RLS політики в Supabase, якщо таблиця не пуста)
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">
                                {activeTab === 'foods' ? 'Додати продукт' : 'Додати вправу'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Назва</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newItem.name || ''}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                    placeholder="Назва..."
                                />
                            </div>

                            {activeTab === 'foods' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Калорії (ккал)</label>
                                        <input
                                            type="number"
                                            className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                            value={newItem.calories || ''}
                                            onChange={e => setNewItem({ ...newItem, calories: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Білки (г)</label>
                                        <input
                                            type="number"
                                            className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                            value={newItem.protein || ''}
                                            onChange={e => setNewItem({ ...newItem, protein: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Жири (г)</label>
                                        <input
                                            type="number"
                                            className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                            value={newItem.fat || ''}
                                            onChange={e => setNewItem({ ...newItem, fat: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Вуглеводи (г)</label>
                                        <input
                                            type="number"
                                            className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                            value={newItem.carbs || ''}
                                            onChange={e => setNewItem({ ...newItem, carbs: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleAdd}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-4 flex items-center justify-center gap-2 transition-all"
                            >
                                <Save size={20} /> Зберегти
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap
        ${active
                ? 'bg-slate-800 text-white shadow-lg shadow-slate-200'
                : 'bg-white text-slate-500 hover:bg-slate-100'}`}
    >
        {React.createElement(icon, { size: 18 })}
        {label}
    </button>
);

export default AdminDashboard;