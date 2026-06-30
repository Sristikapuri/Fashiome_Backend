export interface SilhouetteType {
  userId: string;
  gender?: string;
  bodyType?: string;
  height?: number;
  weight?: number;
  skinTone?: string;
  skinToneHex?: string;
  faceShape?: string;
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    shoulders?: number;
  };
  stylePreferences?: string[];
  completed: boolean;
}
