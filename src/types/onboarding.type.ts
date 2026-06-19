export interface OnboardingType {
  userId: string;
  completed: boolean;
  completedAt?: Date;
  preferences?: {
    style?: string;
    size?: string;
    color?: string;
  };
}
