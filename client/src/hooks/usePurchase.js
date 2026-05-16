import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { purchasesAPI } from '../services/api';

/**
 * usePurchase — Manages the full async purchase flow:
 * 1. POST /api/purchases → get jobId
 * 2. Poll GET /api/purchases/status/:jobId with exponential backoff
 * 3. Resolve with success/failure result
 * 4. Show Sonner toast based on outcome
 */
const usePurchase = () => {
  const [purchasing, setPurchasing] = useState({}); // itemId → boolean
  const pollTimers = useRef({});

  const pollForResult = useCallback((jobId, itemId, resolve) => {
    let attempts = 0;
    const maxAttempts = 30; // 30 * ~300ms avg = ~9s max wait

    const poll = async () => {
      attempts++;
      try {
        const { data } = await purchasesAPI.getStatus(jobId);

        if (data.status === 'completed' || data.status === 'failed') {
          const result = data.result;
          resolve(result);

          // Show appropriate toast
          if (result.success) {
            toast.success(result.message, {
              description: 'Check your order history for details.',
              duration: 5000,
            });
          } else {
            switch (result.reason) {
              case 'sold_out':
                toast.error('Sold Out!', {
                  description: result.message,
                  duration: 5000,
                });
                break;
              case 'already_purchased':
                toast.warning('Already Purchased', {
                  description: result.message,
                  duration: 4000,
                });
                break;
              case 'event_not_live':
                toast.error('Event Closed', {
                  description: result.message,
                  duration: 4000,
                });
                break;
              default:
                toast.error('Purchase Failed', {
                  description: result.message || 'Something went wrong. Please try again.',
                  duration: 4000,
                });
            }
          }
          return; // Done
        }

        // Still processing — poll again
        if (attempts >= maxAttempts) {
          resolve({ success: false, reason: 'timeout', message: 'Purchase timed out. Please check your order history.' });
          toast.error('Request Timed Out', {
            description: 'Your purchase is taking too long. Please check your order history.',
            duration: 5000,
          });
          return;
        }

        // Exponential backoff: 200ms, 300ms, 400ms... capped at 1s
        const delay = Math.min(200 + attempts * 100, 1000);
        pollTimers.current[itemId] = setTimeout(poll, delay);
      } catch (err) {
        resolve({ success: false, reason: 'error', message: 'Network error during purchase.' });
        toast.error('Network Error', { description: 'Could not verify purchase status.' });
      }
    };

    poll();
  }, []);

  const purchase = useCallback(async (eventId, itemId) => {
    if (purchasing[itemId]) return; // Prevent double-click

    setPurchasing((prev) => ({ ...prev, [itemId]: true }));

    try {
      const { data } = await purchasesAPI.initiate({ eventId, itemId });

      if (!data.success) {
        // Pre-flight rejection (sold out, already purchased, etc.)
        toast.error('Purchase Rejected', { description: data.message });
        return { success: false };
      }

      const toastId = toast.loading('Securing your item...', { description: 'Processing your purchase request.' });

      return new Promise((resolve) => {
        pollForResult(data.jobId, itemId, (result) => {
          toast.dismiss(toastId);
          resolve(result);
        });
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Purchase failed. Please try again.';
      const reason = err.response?.data?.reason;

      if (reason === 'sold_out') {
        toast.error('Sold Out!', { description: msg });
      } else if (reason === 'already_purchased') {
        toast.warning('Already Purchased', { description: msg });
      } else if (err.response?.status === 429) {
        toast.error('Slow Down!', { description: 'Too many attempts. Please wait a moment.' });
      } else {
        toast.error('Purchase Failed', { description: msg });
      }
      return { success: false };
    } finally {
      setPurchasing((prev) => ({ ...prev, [itemId]: false }));
    }
  }, [purchasing, pollForResult]);

  return { purchase, purchasing };
};

export default usePurchase;