import { OrderMongoRepository } from "../repositories/order.repository";
import { IOrder, IOrderCreateInput } from "../models/order.model";

const orderRepository = new OrderMongoRepository();

export class OrderService {
  async create(order: IOrderCreateInput) {
    return await orderRepository.create(order);
  }

  async getOrdersByUserId(userId: string) {
    return await orderRepository.getByUserId(userId);
  }

  async getById(id: string): Promise<IOrder | null> {
    return await orderRepository.getById(id);
  }

  async updateById(id: string, update: Partial<IOrder>): Promise<IOrder | null> {
    return await orderRepository.updateById(id, update);
  }

  async delete(id: string): Promise<boolean> {
    return await orderRepository.delete(id);
  }

  async getAllOrders(page: number, limit: number, status?: string, paymentMethod?: string) {
    return await orderRepository.getAllPaginated(page, limit, status, paymentMethod);
  }

  async getStats() {
    return await orderRepository.getStats();
  }
}
