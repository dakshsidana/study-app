
import React, { useState, useEffect } from 'react';
import { DailyTasks, AppState, AppStreaks } from './types';
import { INITIAL_TASKS, REWARDS, PENALTIES, TOTAL_DAYS } from './constants';
import { getTodayISTString, getISTDate, getDaysDifference, formatCurrency, playChime, playPenalty, playSlip, playTick, getPaydayCountdown } from './utils';
import { CountUp } from './components/CountUp';

const INITIAL_STREAKS: AppStreaks = {
  study: 0,
  water: 0,
  zeroSugar: 0,
  skin: 0,
  posture: 0,
  gym: 0,
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('lock-in-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate older states that don't have streaks
      if (!parsed.streaks) {
        parsed.streaks = { ...INITIAL_STREAKS };
      }
      return parsed;
    }
    return {
      vault: 0,
      wallet: 0,
      startDate: new Date().toISOString(),
      lastAuditDate: getTodayISTString(),
      dailyTasks: { ...INITIAL_TASKS },
      streaks: { ...INITIAL_STREAKS },
    };
  });

  const [countdown, setCountdown] = useState("");

  // Update countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getPaydayCountdown(state.startDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [state.startDate]);

  // Persist state
  useEffect(() => {
    localStorage.setItem('lock-in-state', JSON.stringify(state));
  }, [state]);

  // Midnight Sweep (IST)
  useEffect(() => {
    const checkDate = () => {
      const today = getTodayISTString();
      if (state.lastAuditDate !== today) {
        // Calculate penalties and streaks for the day that just ended
        let penaltyTotal = 0;
        const tasks = state.dailyTasks;
        const currentStreaks = { ...state.streaks };

        // 1. Study Check
        const studyDone = tasks.study.every(s => s);
        if (!studyDone) penaltyTotal += PENALTIES.STUDY_MISSED;
        currentStreaks.study = studyDone ? currentStreaks.study + 1 : 0;

        // 2. Water Check
        const waterDone = tasks.water >= 20;
        if (!waterDone) penaltyTotal += PENALTIES.WATER_MISSED;
        currentStreaks.water = waterDone ? currentStreaks.water + 1 : 0;

        // 3. Sugar Check
        if (!tasks.zeroSugar) penaltyTotal += PENALTIES.SUGAR_MISSED;
        currentStreaks.zeroSugar = tasks.zeroSugar ? currentStreaks.zeroSugar + 1 : 0;

        // 4. Skin Check
        if (!tasks.skin) penaltyTotal += PENALTIES.SKIN_MISSED;
        currentStreaks.skin = tasks.skin ? currentStreaks.skin + 1 : 0;

        // 5. Posture Check
        const postureDone = tasks.posture >= 3;
        if (!postureDone) penaltyTotal += PENALTIES.POSTURE_MISSED;
        currentStreaks.posture = postureDone ? currentStreaks.posture + 1 : 0;

        // 6. Gym Check
        if (!tasks.gym) penaltyTotal += PENALTIES.GYM_MISSED;
        currentStreaks.gym = tasks.gym ? currentStreaks.gym + 1 : 0;

        // Settlement: Daily Vault - Total Penalties
        const settlement = state.vault - penaltyTotal;
        
        if (settlement < 0) {
          playPenalty();
        } else {
          playChime();
        }

        setState(prev => ({
          ...prev,
          wallet: prev.wallet + settlement,
          vault: 0,
          lastAuditDate: today,
          dailyTasks: { ...INITIAL_TASKS },
          streaks: currentStreaks
        }));
      }
    };

    const interval = setInterval(checkDate, 10000);
    checkDate();
    return () => clearInterval(interval);
  }, [state.lastAuditDate, state.dailyTasks, state.vault, state.streaks]);

  const updateTask = (updater: (tasks: DailyTasks) => { newTasks: DailyTasks, reward: number }) => {
    setState(prev => {
      const { newTasks, reward } = updater(prev.dailyTasks);
      
      if (reward > 0) playChime();
      else playTick();

      return {
        ...prev,
        vault: prev.vault + reward,
        dailyTasks: newTasks
      };
    });
  };

  const handleStudyToggle = (index: number) => {
    updateTask(tasks => {
      const current = tasks.study[index];
      const newStudy = [...tasks.study];
      newStudy[index] = !current;
      return {
        newTasks: { ...tasks, study: newStudy },
        reward: !current ? REWARDS.STUDY_HOUR : -REWARDS.STUDY_HOUR
      };
    });
  };

  const handleWaterClick = (index: number) => {
    updateTask(tasks => {
      if (index === tasks.water) {
        return {
          newTasks: { ...tasks, water: tasks.water + 1 },
          reward: REWARDS.WATER_GLASS
        };
      } else if (index === tasks.water - 1) {
        return {
          newTasks: { ...tasks, water: tasks.water - 1 },
          reward: -REWARDS.WATER_GLASS
        };
      }
      return { newTasks: tasks, reward: 0 };
    });
  };

  const handlePostureClick = () => {
    updateTask(tasks => {
      if (tasks.posture >= 3) return { newTasks: tasks, reward: 0 };
      const nextPosture = tasks.posture + 1;
      return {
        newTasks: { ...tasks, posture: nextPosture },
        reward: nextPosture === 3 ? REWARDS.POSTURE : 0
      };
    });
  };

  const handleToggle = (key: keyof Pick<DailyTasks, 'zeroSugar' | 'skin' | 'gym'>, rewardAmount: number) => {
    updateTask(tasks => {
      const current = tasks[key];
      return {
        newTasks: { ...tasks, [key]: !current },
        reward: !current ? rewardAmount : -rewardAmount
      };
    });
  };

  const handleSlipUp = () => {
    playSlip();
    setState(prev => ({ ...prev, wallet: prev.wallet - PENALTIES.SLIP_UP }));
  };

  const dayNumber = getDaysDifference(state.startDate, getISTDate().toISOString()) + 1;
  const progressPercent = (dayNumber / TOTAL_DAYS) * 100;
  const isDebt = state.wallet < 0;

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto px-6 pt-10 pb-8 overflow-hidden bg-black text-white">
      {/* Permanent Wallet */}
      <div className="flex justify-center items-center gap-2 mb-4 bg-[#1C1C1E] py-2 px-4 rounded-full self-center">
        <span className="text-xl">🏦</span>
        <span className={`text-lg font-bold tracking-tight ${isDebt ? 'text-[#ff0000]' : 'text-gray-300'}`}>
          {state.wallet < 0 ? '-' : ''}${Math.abs(state.wallet).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Daily Vault */}
      <div className="text-center mb-6">
        <p className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-1">Daily Vault</p>
        <h1 className="text-6xl font-black tracking-tight flex items-center justify-center">
          <span className="text-gray-500 mr-1 text-4xl">$</span>
          <CountUp value={state.vault} />
        </h1>
        
        <div className="mt-8 mb-2 flex justify-between items-end">
          <p className="text-sm font-semibold">Day {dayNumber} of {TOTAL_DAYS}</p>
          <p className="text-xs text-gray-500">{Math.round(progressPercent)}%</p>
        </div>
        <div className="h-1.5 w-full bg-[#1C1C1E] rounded-full overflow-hidden">
          <div 
            className="h-full bg-white transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Task Sections */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-40 pr-1">
        <div className="apple-card p-5 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">7hr Study</h3>
              {state.streaks.study > 0 && (
                <span className="text-orange-500 font-bold text-sm">🔥 {state.streaks.study}</span>
              )}
            </div>
            <span className="text-xs text-gray-500">$2/hr</span>
          </div>
          <div className="flex justify-between gap-1.5">
            {state.dailyTasks.study.map((done, i) => (
              <button
                key={i}
                onClick={() => handleStudyToggle(i)}
                className={`flex-1 h-12 rounded-xl transition-all duration-300 font-bold text-sm ${
                  done ? 'bg-white text-black scale-95' : 'bg-[#2C2C2E] text-gray-400'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="apple-card p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">Water Intake</h3>
              {state.streaks.water > 0 && (
                <span className="text-orange-500 font-bold text-sm">🔥 {state.streaks.water}</span>
              )}
            </div>
            <span className="text-xs text-gray-500">{state.dailyTasks.water}/20 • +$0.10/ea</span>
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                onClick={() => handleWaterClick(i)}
                className={`h-6 rounded-md cursor-pointer transition-all duration-200 ${
                  i < state.dailyTasks.water ? 'bg-blue-500 scale-90' : 'bg-[#2C2C2E]'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <TaskToggle 
            label="Zero Sugar/Snacks" 
            reward="+ $4" 
            active={state.dailyTasks.zeroSugar} 
            streak={state.streaks.zeroSugar}
            onClick={() => handleToggle('zeroSugar', REWARDS.SUGAR)} 
          />
          <TaskToggle 
            label="Skin/Creams Routine" 
            reward="+ $2" 
            active={state.dailyTasks.skin} 
            streak={state.streaks.skin}
            onClick={() => handleToggle('skin', REWARDS.SKIN)} 
          />
          <TaskToggle 
            label="Gym / 100 Pushups" 
            reward="+ $5" 
            active={state.dailyTasks.gym} 
            streak={state.streaks.gym}
            onClick={() => handleToggle('gym', REWARDS.GYM)} 
          />
        </div>

        <div className="apple-card p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">Posture Wall Resets</h3>
              {state.streaks.posture > 0 && (
                <span className="text-orange-500 font-bold text-sm">🔥 {state.streaks.posture}</span>
              )}
            </div>
            <span className="text-xs text-gray-500">{state.dailyTasks.posture}/3 Done</span>
          </div>
          <div className="flex gap-3">
             {Array.from({ length: 3 }).map((_, i) => (
              <button
                key={i}
                disabled={state.dailyTasks.posture > i && i !== state.dailyTasks.posture - 1}
                onClick={handlePostureClick}
                className={`flex-1 h-11 rounded-xl font-bold transition-all ${
                  i < state.dailyTasks.posture 
                    ? 'bg-green-500 text-white' 
                    : 'bg-[#2C2C2E] text-gray-500'
                }`}
              >
                {i < state.dailyTasks.posture ? '✓' : `Reset ${i+1}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Sticky */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-6 bg-black bg-opacity-90 backdrop-blur-xl safe-area-bottom border-t border-white/5">
        <div className="text-center mb-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">30-Day Payday in:</p>
          <p className="text-sm font-mono text-white tracking-widest">{countdown}</p>
        </div>
        <button
          onClick={handleSlipUp}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-[22px] shadow-2xl transition-transform active:scale-95 uppercase tracking-widest text-sm"
        >
          SOCIAL / YT SLIP (-$10)
        </button>
      </div>
    </div>
  );
};

interface TaskToggleProps {
  label: string;
  reward: string;
  active: boolean;
  streak: number;
  onClick: () => void;
}

const TaskToggle: React.FC<TaskToggleProps> = ({ label, reward, active, streak, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full apple-card p-5 flex justify-between items-center active:scale-[0.98] transition-all border border-transparent hover:border-white/5"
    >
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg text-left">{label}</h3>
          {streak > 0 && (
            <span className="text-orange-500 font-bold text-sm">🔥 {streak}</span>
          )}
        </div>
        <p className="text-xs text-gray-500 text-left">{reward} Reward</p>
      </div>
      <div className={`w-14 h-8 rounded-full transition-colors relative ${active ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-[#2C2C2E]'}`}>
        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-md ${active ? 'left-7' : 'left-1'}`} />
      </div>
    </button>
  );
};

export default App;
