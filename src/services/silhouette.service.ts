import { SilhouetteMongoRepository } from "../repositories/silhouette.repository";
import { ISilhouette } from "../models/silhouette.model";
import { SilhouetteType } from "../types/silhouette.type";
import { HttpException } from "../exceptions/http-exception";

const silhouetteRepository = new SilhouetteMongoRepository();

export class SilhouetteService {
  async getSilhouetteProfile(userId: string): Promise<ISilhouette> {
    const silhouette = await silhouetteRepository.getByUserId(userId);

    if (!silhouette) {
      return silhouetteRepository.create({
        userId,
        completed: false,
      });
    }

    return silhouette;
  }

  async saveSilhouetteProfile(
    userId: string,
    profileData: Partial<SilhouetteType>
  ): Promise<ISilhouette> {
    const silhouette = await silhouetteRepository.getByUserId(userId);

    if (silhouette) {

      const updated = await silhouetteRepository.update(userId, {
        ...profileData,
        completed: true,
      });
      
      if (!updated) {
        throw new HttpException(500, "Failed to update silhouette profile");
      }
      
      return updated;
    } else {
  
      const created = await silhouetteRepository.create({
        userId,
        ...profileData,
        completed: true,
      });
      
      return created;
    }
  }

  async clearSilhouetteProfile(userId: string): Promise<boolean> {
    const silhouette = await silhouetteRepository.getByUserId(userId);
    
    if (!silhouette) {
      throw new HttpException(404, "Silhouette profile not found");
    }
    

    const updated = await silhouetteRepository.update(userId, {
      bodyType: undefined,
      height: undefined,
      weight: undefined,
      measurements: undefined,
      stylePreferences: undefined,
      completed: false,
    });
    
    return !!updated;
  }
}
