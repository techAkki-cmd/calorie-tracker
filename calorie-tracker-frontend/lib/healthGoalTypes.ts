export type HealthGoal = {
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  targetWeight: number | null;
};

export type HealthGoalResponse = HealthGoal & {
  id: string;
  userId: string;
};

export type HealthGoalDraft = {
  dailyCalorieTarget: string;
  proteinTarget: string;
  carbTarget: string;
  fatTarget: string;
  targetWeight: string;
};

export type HealthGoalFieldErrors = Partial<Record<keyof HealthGoalDraft, string>>;
