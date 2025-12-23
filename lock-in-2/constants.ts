
export const INITIAL_TASKS = {
  study: [false, false, false, false, false, false, false],
  water: 0,
  zeroSugar: false,
  skin: false,
  posture: 0,
  gym: false,
};

export const REWARDS = {
  STUDY_HOUR: 2,
  SUGAR: 4,
  SKIN: 2,
  POSTURE: 3,
  GYM: 5,
  WATER_GLASS: 0.10
};

export const PENALTIES = {
  STUDY_MISSED: 14,
  WATER_MISSED: 5,
  SUGAR_MISSED: 10,
  SKIN_MISSED: 2,
  POSTURE_MISSED: 5,
  GYM_MISSED: 5,
  SLIP_UP: 10
};

export const TOTAL_DAYS = 30;
