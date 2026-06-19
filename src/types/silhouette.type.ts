export interface SilhouetteType {
  userId: string;
  bodyType?: string;
  height?: number;
  weight?: number;
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    shoulders?: number;
  };
  stylePreferences?: string[];
  completed: boolean;
}
