import { OrderMongoRepository } from "../repositories/order.repository";
import { IOrder } from "../models/order.model";

const orderRepository = new OrderMongoRepository();

export class OrderService {
  async create(order: {
    userId: string;
    items: { clotheId: string; quantity: number; price: number }[];
    shippingAddress: string;
    customerName?: string;
    customerEmail?: string;
    phone?: string;
    city?: string;
    postalCode?: string;
    paymentMethod?: string;
    esewaTransactionId?: string;
    subtotal: number;
    tax: number;
    total: number;
  }) {
    return await orderRepository.create(order as any);
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

  async getAllOrders(page: number, limit: number, status?: string, paymentMethod?: string) {
    return await orderRepository.getAllPaginated(page, limit, status, paymentMethod);
  }

  async getStats() {
    return await orderRepository.getStats();
  }
}
