import { ClothesModel, IClothe } from "../models/clothes.model";

export interface IClothesRepository {
  getById(id: string): Promise<IClothe | null>;
  create(item: Partial<IClothe>): Promise<IClothe>;
  update(id: string, item: Partial<IClothe>): Promise<IClothe | null>;
  delete(id: string): Promise<boolean>;
  getPaginated(
    page: number,
    limit: number,
    search?: string,
    category?: string,
    status?: string
  ): Promise<{ items: IClothe[]; total: number }>;
}

export class ClothesMongoRepository implements IClothesRepository {
  async getById(id: string): Promise<IClothe | null> {
    return await ClothesModel.findById(id);
  }

  async create(item: Partial<IClothe>): Promise<IClothe> {
    return await ClothesModel.create(item);
  }

  async update(id: string, item: Partial<IClothe>): Promise<IClothe | null> {
    return await ClothesModel.findByIdAndUpdate(id, item, { returnDocument: "after" });
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await ClothesModel.findByIdAndDelete(id);
    return !!deleted;
  }

  async getPaginated(
    page: number,
    limit: number,
    search?: string,
    category?: string,
    status?: string
  ): Promise<{ items: IClothe[]; total: number }> {
    const skip = (page - 1) * limit;
    let query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { color: { $regex: search, $options: "i" } },
        { size: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    const [items, total] = await Promise.all([
      ClothesModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      ClothesModel.countDocuments(query),
    ]);

    return { items, total };
  }

  async getLowStock(threshold: number = 5): Promise<IClothe[]> {
    return await ClothesModel.find({ stock: { $lte: threshold }, status: "active" })
      .sort({ stock: 1 })
      .limit(20);
  }
}
