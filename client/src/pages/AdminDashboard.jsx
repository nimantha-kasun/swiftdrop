import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsAPI, usersAPI } from '../services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, TrendingUp, Users, Package, DollarSign, LayoutDashboard, RefreshCw, ShieldOff, ShieldCheck } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, accent }) => (
  <div className="card p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className="font-display text-2xl font-bold text-white">{value}</p>
    </div>
  </div>
);

export default function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events');

  const load = async () => {
    setLoading(true);
    try {
      const [evRes, usRes] = await Promise.all([
        eventsAPI.getAdminAll(),
        usersAPI.getAll({ limit: 50 }),
      ]);
      setEvents(evRes.data.events);
      setUsers(usRes.data.users);
    } catch {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (eventId, status) => {
    try {
      await eventsAPI.updateStatus(eventId, status);
      toast.success(`Event ${status === 'Live' ? 'opened' : 'closed'}.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed.');
    }
  };

  const handleToggleUser = async (userId) => {
    try {
      const { data } = await usersAPI.toggleStatus(userId);
      toast.success(data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  const totalRevenue = events.reduce((s, e) => s + e.totalRevenue, 0);
  const totalSold = events.reduce((s, e) => s + e.totalUnitsSold, 0);
  const liveCount = events.filter((e) => e.status === 'Live').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <LayoutDashboard className="w-6 h-6 text-orange-500" />
            <h1 className="font-display text-3xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <p className="text-zinc-500">Manage events, monitor sales, control the platform.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="btn-secondary flex items-center gap-2 py-2.5 px-4 text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link to="/admin/events/new" className="btn-primary flex items-center gap-2 py-2.5 text-sm">
            <Plus className="w-4 h-4" /> New Event
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Package} label="Total Events" value={events.length} accent="bg-blue-600" />
        <StatCard icon={TrendingUp} label="Live Now" value={liveCount} accent="bg-green-600" />
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${totalRevenue.toFixed(0)}`} accent="bg-orange-600" />
        <StatCard icon={Users} label="Customers" value={users.length} accent="bg-purple-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800 mb-6 w-fit">
        {[{ id: 'events', label: 'Events' }, { id: 'users', label: 'Users' }].map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-100'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Events tab */}
      {activeTab === 'events' && (
        <div className="space-y-3">
          {loading ? [...Array(3)].map((_, i) => <div key={i} className="card h-24 animate-pulse" />) :
           events.length === 0 ? (
            <div className="card p-12 text-center">
              <Package className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No events yet.</p>
              <Link to="/admin/events/new" className="btn-primary inline-flex mt-4 text-sm py-2.5">Create first event</Link>
            </div>
          ) : events.map((event) => (
            <div key={event.id} className="card p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  event.status === 'Live' ? 'bg-green-400 animate-pulse' :
                  event.status === 'Locked' ? 'bg-zinc-500' : 'bg-red-400'
                }`} />
                <div>
                  <p className="font-display font-semibold text-white">{event.name}</p>
                  <p className="text-zinc-500 text-sm">
                    {format(new Date(event.goLiveTime), 'MMM d, yyyy · h:mm a')} ·{' '}
                    <span className="text-orange-400">${event.totalRevenue.toFixed(2)}</span>{' '}
                    <span className="text-zinc-600">· {event.totalUnitsSold} sold</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {event.status === 'Locked' && (
                  <button onClick={() => handleStatusChange(event.id, 'Live')}
                    className="bg-green-600 hover:bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                    Force Open
                  </button>
                )}
                {event.status === 'Live' && (
                  <button onClick={() => handleStatusChange(event.id, 'Closed')}
                    className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                    Force Close
                  </button>
                )}
                {event.status === 'Locked' && (
                  <Link to={`/admin/events/${event.id}/edit`}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border border-zinc-700">
                    Edit
                  </Link>
                )}
                <span className={`text-xs font-mono px-2 py-1 rounded-md ${
                  event.status === 'Live' ? 'bg-green-500/10 text-green-400' :
                  event.status === 'Locked' ? 'bg-zinc-800 text-zinc-400' :
                  'bg-red-500/10 text-red-400'
                }`}>{event.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Users tab */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          {loading ? [...Array(5)].map((_, i) => <div key={i} className="card h-16 animate-pulse" />) :
           users.map((u) => (
            <div key={u._id} className="card px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-zinc-800 rounded-full flex items-center justify-center font-display font-bold text-zinc-400">
                  {u.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{u.name}</p>
                  <p className="text-zinc-500 text-xs">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  u.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>{u.status}</span>
                <button onClick={() => handleToggleUser(u._id)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-zinc-300">
                  {u.status === 'active' ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}