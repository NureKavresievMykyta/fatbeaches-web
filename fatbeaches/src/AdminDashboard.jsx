import React, { useState, useEffect } from 'react';
import { Users, Utensils, Activity, Plus, Trash2, Save, X, Search, Eye } from 'lucide-react';
import { supabase } from './supabase';

const AdminDashboard = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState('foods');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Стан для модального вікна додавання
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newItem, setNewItem] = useState({});

    // Стан для перегляду детальної інформації про користувача
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let query;
                if (activeTab === 'users') {
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
            const table = activeTab === 'foods' ? 'food_items' :
                activeTab === 'workouts' ? 'workout_items' : 'users';

            const idColumn = activeTab === 'users' ? 'user_id' : 'id';

            const { error } = await supabase.from(table).delete().eq(idColumn, id);

            if (error) throw error;
            setItems(items.filter(item => item[idColumn] !== id));
        } catch (error) {
            alert('Помилка видалення: ' + error.message);
        }
    };

    const handleAdd = async () => {
        try {
            const table = activeTab === 'foods' ? 'food_items' : 'workout_items';

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

    // --- ФУНКЦІЯ: Перегляд деталей користувача ---
    const handleViewUser = async (user) => {
        setSelectedUser(user);
        setIsUserModalOpen(true);
        setLoadingProfile(true);
        setUserProfile(null);

        try {
            // Робимо запит до user_profiles
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', user.user_id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (data) {
                setUserProfile(data);
            }
        } catch (error) {
            console.error("Помилка завантаження профілю:", error);
        } finally {
            setLoadingProfile(false);
        }
    };

    const getUserDisplayName = (user) => {
        if (user.name) return user.name;
        if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
        if (user.full_name) return user.full_name;
        if (user.email) return user.email;
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
                                        <th className="p-5 text-xs font-black text-slate-400 uppercase tracking-wider">Назва / Email</th>
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
                                                {activeTab === 'users' && item.email && (
                                                    <div className="text-xs text-slate-400 font-normal mt-1">{item.email}</div>
                                                )}
                                            </td>

                                            <td className="p-5 text-sm text-slate-500">
                                                {activeTab === 'foods' && (
                                                    <div className="flex flex-wrap gap-2 text-xs">
                                                        <span className="text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded">{item.calories} ккал</span>
                                                        <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded">Б: {item.protein || 0}</span>
                                                    </div>
                                                )}
                                                {activeTab === 'users' && (
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                                                            {item.role || 'user'}
                                                        </span>
                                                    </div>
                                                )}
                                                {activeTab === 'workouts' && 'Активність'}
                                            </td>
                                            <td className="p-5 text-right flex justify-end gap-2">
                                                {activeTab === 'users' && (
                                                    <button
                                                        onClick={() => handleViewUser(item)}
                                                        className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Повна інформація"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleDelete(item.id || item.user_id)}
                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Видалити"
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
                        </div>
                    )}
                </div>
            </main>

            {/* Модальне вікно додавання */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Додати запис</h3>
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
                                />
                            </div>

                            {activeTab === 'foods' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Калорії</label>
                                        <input
                                            type="number"
                                            className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                            value={newItem.calories || ''}
                                            onChange={e => setNewItem({ ...newItem, calories: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Білки</label>
                                        <input
                                            type="number"
                                            className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                            value={newItem.protein || ''}
                                            onChange={e => setNewItem({ ...newItem, protein: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Жири</label>
                                        <input
                                            type="number"
                                            className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                            value={newItem.fat || ''}
                                            onChange={e => setNewItem({ ...newItem, fat: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Вуглеводи</label>
                                        <input
                                            type="number"
                                            className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                            value={newItem.carbs || ''}
                                            onChange={e => setNewItem({ ...newItem, carbs: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            <button onClick={handleAdd} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-4 flex items-center justify-center gap-2">
                                <Save size={20} /> Зберегти
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- МОДАЛЬНЕ ВІКНО: ІНФОРМАЦІЯ ПРО КОРИСТУВАЧА --- */}
            {isUserModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-fade-in relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-500 to-emerald-500 opacity-10" />

                        <div className="relative">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800">
                                        {getUserDisplayName(selectedUser)}
                                    </h3>
                                    <p className="text-slate-500 font-medium">{selectedUser.email}</p>
                                    <div className="mt-2 inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider">
                                        {selectedUser.role || 'User'}
                                    </div>
                                </div>
                                <button onClick={() => setIsUserModalOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            {loadingProfile ? (
                                <div className="py-10 text-center text-slate-400">Завантаження даних...</div>
                            ) : userProfile ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Вік</p>
                                        <p className="text-2xl font-black text-slate-800">{userProfile.age || '-'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Стать</p>
                                        <p className="text-2xl font-black text-slate-800 capitalize">
                                            {userProfile.gender === 'male' ? 'Чол' : userProfile.gender === 'female' ? 'Жін' : '-'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Зріст</p>
                                        {/* ВИПРАВЛЕНО: height -> height_cm */}
                                        <p className="text-2xl font-black text-slate-800">{userProfile.height_cm || '-'} <span className="text-sm text-slate-400 font-medium">см</span></p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Вага</p>
                                        {/* ВИПРАВЛЕНО: weight -> weight_kg */}
                                        <p className="text-2xl font-black text-slate-800">{userProfile.weight_kg || '-'} <span className="text-sm text-slate-400 font-medium">кг</span></p>
                                    </div>

                                    <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Ціль</p>
                                        <p className="text-lg font-bold text-slate-800 capitalize">
                                            {userProfile.goal === 'lose_weight' ? 'Схуднення' :
                                                userProfile.goal === 'gain_muscle' ? 'Набір маси' :
                                                    userProfile.goal === 'maintenance' ? 'Підтримка форми' :
                                                        userProfile.goal || 'Не вказано'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 font-medium">Користувач ще не заповнив профіль</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// React.createElement для обходу помилки лінтера
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