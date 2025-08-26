// src/App.js
import React, { useState, useEffect } from 'react';
import { saveStreakData, loadStreakData, subscribeToStreakData, getUserId } from './firebase';

export default function App() {
  const [streak, setStreak] = useState(0);
  const [lastCompleted, setLastCompleted] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationText, setCelebrationText] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load data from Firebase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await loadStreakData();
        setStreak(data.streak || 0);
        setLastCompleted(data.lastCompleted || null);
      } catch (error) {
        console.error('Failed to load data:', error);
        // Fallback to localStorage
        const savedStreak = localStorage.getItem('streakTracker_streak');
        const savedLastCompleted = localStorage.getItem('streakTracker_lastCompleted');
        setStreak(savedStreak ? parseInt(savedStreak) : 0);
        setLastCompleted(savedLastCompleted || null);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Subscribe to real-time updates (optional - for multi-device sync)
  useEffect(() => {
    if (!loading && online) {
      const unsubscribe = subscribeToStreakData((data) => {
        if (data.streak !== streak || data.lastCompleted !== lastCompleted) {
          setStreak(data.streak || 0);
          setLastCompleted(data.lastCompleted || null);
        }
      });
      return unsubscribe;
    }
  }, [loading, online, streak, lastCompleted]);

  // Save to Firebase whenever streak or lastCompleted changes
  useEffect(() => {
    if (!loading && online) {
      const saveData = async () => {
        try {
          setSyncing(true);
          await saveStreakData({ streak, lastCompleted });
          
          // Also save to localStorage as backup
          localStorage.setItem('streakTracker_streak', streak.toString());
          if (lastCompleted) {
            localStorage.setItem('streakTracker_lastCompleted', lastCompleted);
          } else {
            localStorage.removeItem('streakTracker_lastCompleted');
          }
        } catch (error) {
          console.error('Failed to save data:', error);
          // Still save to localStorage
          localStorage.setItem('streakTracker_streak', streak.toString());
          if (lastCompleted) {
            localStorage.setItem('streakTracker_lastCompleted', lastCompleted);
          }
        } finally {
          setSyncing(false);
        }
      };
      saveData();
    }
  }, [streak, lastCompleted, loading, online]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Check for auto-reset when time updates
  useEffect(() => {
    if (lastCompleted && !loading) {
      const now = currentTime.getTime();
      const lastTime = new Date(lastCompleted).getTime();
      const hoursSince = (now - lastTime) / (1000 * 60 * 60);
      
      if (hoursSince > 24 && streak > 0) {
        setStreak(0);
        setLastCompleted(null);
      }
    }
  }, [currentTime, lastCompleted, streak, loading]);

  const getMilestoneText = (day) => {
    const milestones = {
      1: 'day one',
      7: 'one week',
      30: 'thirty days',
      50: 'fifty days',
      100: 'one hundred',
      200: 'two hundred',
      365: 'one year',
      500: 'five hundred',
      750: 'seven fifty',
      1000: 'one thousand'
    };
    return milestones[day];
  };

  const showMilestoneCelebration = (day) => {
    const text = getMilestoneText(day);
    if (text) {
      setCelebrationText(text);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }
  };

  const canCompleteToday = () => {
    if (!lastCompleted) return true;
    
    const today = new Date();
    const lastDate = new Date(lastCompleted);
    
    return today.toDateString() !== lastDate.toDateString();
  };

  const completeDay = async () => {
    if (!canCompleteToday() || loading) return;
    
    const newStreak = streak + 1;
    const now = new Date();
    
    setStreak(newStreak);
    setLastCompleted(now.toISOString());
    showMilestoneCelebration(newStreak);
  };

  const resetStreak = async () => {
    if (loading) return;
    const confirm = window.confirm('Are you sure you want to reset your streak? This cannot be undone.');
    if (confirm) {
      setStreak(0);
      setLastCompleted(null);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }).toLowerCase();
  };

  const progressPercentage = Math.min((streak / 1000) * 100, 100);
  const userId = getUserId();

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-mono flex items-center justify-center">
        <div className="text-xl tracking-wider">loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center relative overflow-hidden">
      {/* Celebration Overlay */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="text-4xl md:text-6xl font-mono tracking-[0.4em] text-white">
            {celebrationText}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="absolute top-8 text-xs uppercase tracking-widest text-gray-500">
        1000 days
      </div>

      {/* Connection Status */}
      <div className="absolute top-8 right-8 flex items-center space-x-2 text-xs">
        <div className={`w-2 h-2 rounded-full ${
          !online ? 'bg-red-500' : syncing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
        }`}></div>
        <span className="text-gray-500">
          {!online ? 'offline' : syncing ? 'syncing...' : 'synced'}
        </span>
      </div>

      {/* User ID */}
      <div className="absolute top-16 right-8 text-xs text-gray-600 font-mono">
        id: {userId.slice(-8)}
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center space-y-12">
        {/* Streak Counter */}
        <div className="flex flex-col items-center">
          <div className="text-8xl md:text-9xl font-mono tracking-[0.2em] text-white">
            {streak.toString().padStart(3, '0')}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-80 md:w-96 h-px bg-gray-800 relative">
          <div 
            className="h-full bg-white transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Action Button */}
        <button
          onClick={completeDay}
          disabled={!canCompleteToday() || loading}
          className={`
            px-8 py-3 text-sm font-mono tracking-[0.3em] border transition-all duration-200
            ${canCompleteToday() && !loading
              ? 'text-white border-white hover:bg-white hover:text-black' 
              : 'text-gray-500 border-gray-500 cursor-not-allowed'
            }
          `}
        >
          {loading ? 'loading...' : canCompleteToday() ? 'complete' : 'done'}
        </button>

        {/* Status Text */}
        <div className="text-center space-y-2">
          {lastCompleted && (
            <div className="text-xs text-gray-400 tracking-wider">
              last: {formatDate(lastCompleted)}
            </div>
          )}
          {!canCompleteToday() && !loading && (
            <div className="text-xs text-gray-500 tracking-wider">
              return tomorrow
            </div>
          )}
          {!online && (
            <div className="text-xs text-yellow-500 tracking-wider">
              offline mode - will sync when online
            </div>
          )}
        </div>
      </div>

      {/* Reset Button */}
      {streak > 0 && !loading && (
        <button
          onClick={resetStreak}
          className="absolute bottom-8 text-xs text-gray-600 hover:text-gray-400 tracking-wider transition-colors duration-200"
        >
          reset
        </button>
      )}

      {/* Database info */}
      <div className="absolute bottom-8 left-8 text-xs text-gray-600">
        🔥 firebase connected
      </div>
    </div>
  );
}