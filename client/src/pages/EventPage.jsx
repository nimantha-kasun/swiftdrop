import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsAPI, purchasesAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import useCountdown from '../hooks/useCountdown';
import usePurchase from '../hooks/usePurchase';
import ItemCard from '../components/ItemCard';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ArrowLeft, Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react';

const pad = (n) => String(n).padStart(2, '0');

// ── Countdown Block Component ─────────────────────────────────────────────────
const CountdownBlock = ({ label, value }) => (
  <div className="flex flex-col items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 min-w-[80px]">
    <span className="countdown-digit">{pad(value)}</span>
    <span className="text-zinc-500 text-xs uppercase tracking-widest font-medium">{label}</span>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function EventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinEvent, leaveEvent, onStockUpdate, onEventStatusChange, connected } = useSocket();

  const [event, setEvent] = useState(null);
  const [items, setItems] = useState([]);
  const [purchasedItems, setPurchasedItems] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const countdown = useCountdown(event?.status === 'Locked' ? event.goLiveTime : null);
  const { purchase, purchasing } = usePurchase();

  // ── Load event ──────────────────────────────────────────────────────────────
  const loadEvent = useCallback(async () => {
    try {
      const { data } = await eventsAPI.getOne(id);
      setEvent(data.event);
      setItems(data.event.items || []);
    } catch {
      toast.error('Failed to load event.');
      navigate('/events');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  // Load event + user's existing orders for this event
  useEffect(() => {
    loadEvent();

    // Check which items this user has already purchased
    purchasesAPI.getMyOrders().then(({ data }) => {
      const purchased = new Set(
        data.orders
          .filter((o) => o.eventId?._id === id && ['Reserved', 'Confirmed'].includes(o.status))
          .map((o) => o.itemId?._id)
      );
      setPurchasedItems(purchased);
    }).catch(() => {});
  }, [id, loadEvent]);

  // ── Socket.io: join room, listen for updates ─────────────────────────────
  useEffect(() => {
    if (!id) return;
    joinEvent(id);

    const offStock = onStockUpdate(({ itemId, currentStock }) => {
      setItems((prev) =>
        prev.map((item) =>
          item._id === itemId ? { ...item, currentStock } : item
        )
      );
    });

    const offStatus = onEventStatusChange(({ eventId, status }) => {
      if (eventId === id) {
        setEvent((prev) => prev ? { ...prev, status } : prev);
        if (status === 'Live') {
          toast.success('🔥 Event is now Live!', { description: 'Purchasing is now open. Act fast!' });
        } else if (status === 'Closed') {
          toast.info('Event has closed.', { description: 'All items have been sold out.' });
        }
      }
    });

    return () => {
      leaveEvent(id);
      offStock();
      offStatus();
    };
  }, [id, joinEvent, leaveEvent, onStockUpdate, onEventStatusChange]);

  // ── Auto-transition Locked→Live when countdown expires ───────────────────
  useEffect(() => {
    if (event?.status === 'Locked' && countdown?.isExpired) {
      setEvent((prev) => ({ ...prev, status: 'Live' }));
      toast.success('🔥 Event just went Live!', { description: 'The sale is now open!' });
    }
  }, [countdown?.isExpired, event?.status]);

  // ── Buy handler ─────────────────────────────────────────────────────────
  const handleBuy = async (itemId) => {
    const result = await purchase(event._id, itemId);
    if (result?.success) {
      setPurchasedItems((prev) => new Set([...prev, itemId]));
      // Optimistically update stock in UI
      setItems((prev) =>
        prev.map((item) =>
          item._id === itemId
            ? { ...item, currentStock: Math.max(0, item.currentStock - 1) }
            : item
        )
      );
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-64 bg-zinc-900 rounded-2xl" />
          <div className="h-8 bg-zinc-900 rounded-xl w-2/3" />
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64 bg-zinc-900 rounded-2xl" />
            <div className="h-64 bg-zinc-900 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const statusColors = {
    Live: 'text-green-400',
    Locked: 'text-zinc-400',
    Closed: 'text-red-400',
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Back */}
      <button
        onClick={() => navigate('/events')}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to events
      </button>

      {/* Cover + Header */}
      <div className="card overflow-hidden mb-8">
        {event.coverPhoto && (
          <div className="h-56 overflow-hidden">
            <img src={event.coverPhoto} alt={event.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              {event.status === 'Live' && (
                <div className="badge-live mb-3">
                  <span className="live-dot" /> Live Now
                </div>
              )}
              {event.status === 'Locked' && (
                <div className="badge-locked mb-3">
                  <Clock className="w-3 h-3" /> Upcoming
                </div>
              )}
              {event.status === 'Closed' && (
                <div className="badge-closed mb-3">Closed</div>
              )}
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">{event.name}</h1>
              <p className="text-zinc-500 mt-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {format(new Date(event.goLiveTime), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            {/* Socket connection indicator */}
            <div className={`flex items-center gap-1.5 text-xs font-medium ${connected ? 'text-green-400' : 'text-zinc-600'}`}>
              {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {connected ? 'Real-time' : 'Offline'}
            </div>
          </div>
        </div>
      </div>

      {/* ── COUNTDOWN (Locked events) ───────────────────────────────────────── */}
      {event.status === 'Locked' && !countdown?.isExpired && (
        <div className="card p-8 mb-8 text-center">
          <p className="text-zinc-400 text-sm uppercase tracking-widest font-medium mb-6">Sale opens in</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {countdown.days > 0 && <CountdownBlock label="Days" value={countdown.days} />}
            <CountdownBlock label="Hours" value={countdown.hours} />
            <div className="text-zinc-600 font-display text-3xl font-bold pb-4">:</div>
            <CountdownBlock label="Min" value={countdown.minutes} />
            <div className="text-zinc-600 font-display text-3xl font-bold pb-4">:</div>
            <CountdownBlock label="Sec" value={countdown.seconds} />
          </div>
          <p className="text-zinc-600 text-sm mt-6">
            Items and prices visible below. Purchasing opens the moment the clock hits zero.
          </p>
        </div>
      )}

      {/* ── LIVE banner ─────────────────────────────────────────────────────── */}
      {event.status === 'Live' && (
        <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 rounded-2xl px-5 py-4 mb-8">
          <div className="live-dot flex-shrink-0" />
          <div>
            <p className="text-green-400 font-semibold font-display">Sale is Live!</p>
            <p className="text-zinc-500 text-sm">Stock is being claimed in real time. Purchase buttons are live.</p>
          </div>
        </div>
      )}

      {/* ── CLOSED banner ───────────────────────────────────────────────────── */}
      {event.status === 'Closed' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 mb-8 text-center">
          <p className="text-zinc-400 font-semibold">This event has closed. All items have sold out.</p>
        </div>
      )}

      {/* ── Items Grid ──────────────────────────────────────────────────────── */}
      <div>
        <h2 className="font-display text-xl font-bold text-white mb-5">
          Items · <span className="text-zinc-500">{items.length}</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <ItemCard
              key={item._id}
              item={item}
              eventStatus={event.status}
              onBuy={handleBuy}
              isPurchasing={!!purchasing[item._id]}
              hasPurchased={purchasedItems.has(item._id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}