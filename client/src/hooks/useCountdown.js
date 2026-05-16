import { useState, useEffect } from 'react';

/**
 * useCountdown — Returns remaining time until a target date.
 * Updates every second. Returns null fields when time is up.
 */
const useCountdown = (targetDate) => {
  const getTimeLeft = () => {
    const now = Date.now();
    const target = new Date(targetDate).getTime();
    const diff = target - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalMs: 0 };
    }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      isExpired: false,
      totalMs: diff,
    };
  };

  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    if (!targetDate) return;

    // Check immediately
    const initial = getTimeLeft();
    setTimeLeft(initial);
    if (initial.isExpired) return;

    const interval = setInterval(() => {
      const next = getTimeLeft();
      setTimeLeft(next);
      if (next.isExpired) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
};

export default useCountdown;