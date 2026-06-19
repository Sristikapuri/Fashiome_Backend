import { SilhouetteModel, ISilhouette } from "../models/silhouette.model";

export interface ISilhouetteRepository {
  getByUserId(userId: string): Promise<ISilhouette | null>;
  create(silhouette: Partial<ISilhouette>): Promise<ISilhouette>;
  update(userId: string, data: Partial<ISilhouette>): Promise<ISilhouette | null>;
}

export class SilhouetteMongoRepository implements ISilhouetteRepository {
  async getByUserId(userId: string): Promise<ISilhouette | null> {
    const found = await SilhouetteModel.findOne({ userId });
    return found;
  }

  async create(silhouette: Partial<ISilhouette>): Promise<ISilhouette> {
    const created = await SilhouetteModel.create(silhouette);
    return created;
  }

  async update(userId: string, data: Partial<ISilhouette>): Promise<ISilhouette | null> {
    const updated = await SilhouetteModel.findOneAndUpdate({ userId }, data, { new: true });
    return updated;
  }
}
