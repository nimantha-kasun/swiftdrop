import { useState, useEffect, useRef } from 'react';
import { eventsAPI } from '../services/api';
import EventCard from '../components/EventCard';
import { Zap, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

const FILTERS = ['All', 'Live', 'Locked', 'Closed'];

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const { onEventStatusChange } = useSocket();
  const navigate = useNavigate();
  const eventsRef = useRef([]);

  useEffect(() => {
    eventsAPI.getAll()
      .then(({ data }) => {
        setEvents(data.events);
        eventsRef.current = data.events;
      })
      .catch(() => toast.error('Failed to load events.'))
      .finally(() => setLoading(false));
  }, []);

  // Listen for real-time status changes globally
  useEffect(() => {
    if (!onEventStatusChange) return;
    const cleanup = onEventStatusChange(({ eventId, status }) => {
      // Update local state so card reflects the new status live
      setEvents(prev => prev.map(e =>
        e._id === eventId ? { ...e, status } : e
      ));

      // Show toast + browser notification when a Locked event goes Live
      if (status === 'Live') {
        const liveEvent = eventsRef.current.find(e => e._id === eventId);
        const name = liveEvent?.name || 'A flash sale';

        toast.success(`🔥 ${name} just went LIVE!`, {
          description: 'Hurry! Stock is limited.',
          duration: 8000,
          action: {
            label: 'Shop Now',
            onClick: () => navigate(`/events/${eventId}`),
          },
        });

        // Browser push notification (if permission granted)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`⚡ ${name} is LIVE!`, {
            body: 'Flash sale just started! Limited stock available.',
            icon: '/favicon.ico',
          });
        }
      }

      if (status === 'Closed') {
        const closedEvent = eventsRef.current.find(e => e._id === eventId);
        toast.info(`${closedEvent?.name || 'Event'} has closed.`, { duration: 4000 });
      }

      // Keep ref in sync
      eventsRef.current = eventsRef.current.map(e =>
        e._id === eventId ? { ...e, status } : e
      );
    });
    return cleanup;
  }, [onEventStatusChange, navigate]);

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const filtered = events.filter((e) => {
    const matchFilter = filter === 'All' || e.status === filter;
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const liveCount = events.filter((e) => e.status === 'Live').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-display text-4xl font-bold text-white">Flash Sales</h1>
          {liveCount > 0 && (
            <div className="badge-live animate-fade-in">
              <span className="live-dot" />
              {liveCount} Live Now
            </div>
          )}
        </div>
        <p className="text-zinc-400">Limited items. Lowest prices. Act fast.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                filter === f
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-72 animate-pulse bg-zinc-900" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Zap className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 text-lg">No events found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}