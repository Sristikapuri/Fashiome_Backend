import { CartMongoRepository } from "../repositories/cart.repository";

const cartRepository = new CartMongoRepository();

export class CartService {
  async getCart(userId: string) {
    return await cartRepository.getByUserId(userId);
  }

  async setCart(userId: string, items: { clotheId: string; quantity: number }[]) {
    return await cartRepository.upsertUserCart(userId, items);
  }
}
