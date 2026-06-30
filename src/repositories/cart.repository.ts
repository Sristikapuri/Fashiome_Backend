import { CartModel, ICart } from "../models/cart.model";

export class CartMongoRepository {
  async getByUserId(userId: string): Promise<ICart | null> {
    return await CartModel.findOne({ userId });
  }

  async upsertUserCart(userId: string, items: { clotheId: string; quantity: number }[]): Promise<ICart> {
    return await CartModel.findOneAndUpdate(
      { userId },
      { userId, items },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}
