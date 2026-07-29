import {
  ClothesCreateDTOType,
  ClothesUpdateDTOType,
} from "../dtos/clothes.dto";
import { IClothe } from "../models/clothes.model";
import { ClothesMongoRepository } from "../repositories/clothes.repository";

const clothesRepository = new ClothesMongoRepository();

export class ClothesService {
  async getById(id: string): Promise<IClothe | null> {
    return await clothesRepository.getById(id);
  }

  async create(payload: ClothesCreateDTOType): Promise<IClothe> {
    return await clothesRepository.create(payload);
  }

  async update(id: string, payload: ClothesUpdateDTOType): Promise<IClothe | null> {
    return await clothesRepository.update(id, payload);
  }

  async delete(id: string): Promise<boolean> {
    return await clothesRepository.delete(id);
  }

  async getPaginated(
    page: number,
    limit: number,
    search?: string,
    category?: string,
    status?: string
  ) {
    return await clothesRepository.getPaginated(page, limit, search, category, status);
  }

  async getLowStock(threshold: number = 5) {
    return await clothesRepository.getLowStock(threshold);
  }
}
