import { QueryFilter } from "mongoose";
import { IOrder, IOrderCreateInput, OrderModel } from "../models/order.model";

export class OrderMongoRepository {
  async create(order: IOrderCreateInput): Promise<IOrder> {
    return await OrderModel.create(order);
  }

  async getByUserId(userId: string): Promise<IOrder[]> {
    return await OrderModel.find({ userId }).sort({ createdAt: -1 });
  }

  async getById(id: string): Promise<IOrder | null> {
    return await OrderModel.findById(id);
  }

  async updateById(id: string, update: Partial<IOrder>): Promise<IOrder | null> {
    return await OrderModel.findByIdAndUpdate(id, update, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await OrderModel.findByIdAndDelete(id);
    return !!deleted;
  }

  /** Admin: all orders, paginated, optionally filtered */
  async getAllPaginated(
    page: number,
    limit: number,
    status?: string,
    paymentMethod?: string
  ): Promise<{ orders: IOrder[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: QueryFilter<IOrder> = {};
    if (status) query.status = status as IOrder["status"];
    if (paymentMethod) query.paymentMethod = paymentMethod;
    const [orders, total] = await Promise.all([
      OrderModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      OrderModel.countDocuments(query),
    ]);
    return { orders, total };
  }

  /** Admin: revenue + count stats */
  async getStats(): Promise<{
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    paidOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    esewaOrders: number;
    codOrders: number;
  }> {
    const [counts, revenueAgg] = await Promise.all([
      OrderModel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
            paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
            shipped: { $sum: { $cond: [{ $eq: ["$status", "shipped"] }, 1, 0] } },
            delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
            esewa: { $sum: { $cond: [{ $eq: ["$paymentMethod", "esewa"] }, 1, 0] } },
            cod: { $sum: { $cond: [{ $eq: ["$paymentMethod", "cod"] }, 1, 0] } },
          },
        },
      ]),
      OrderModel.aggregate([
        { $match: { status: { $in: ["paid", "shipped", "delivered"] } } },
        { $group: { _id: null, revenue: { $sum: "$total" } } },
      ]),
    ]);
    const c = counts[0] || {};
    return {
      totalOrders: c.total ?? 0,
      totalRevenue: revenueAgg[0]?.revenue ?? 0,
      pendingOrders: c.pending ?? 0,
      paidOrders: c.paid ?? 0,
      shippedOrders: c.shipped ?? 0,
      deliveredOrders: c.delivered ?? 0,
      cancelledOrders: c.cancelled ?? 0,
      esewaOrders: c.esewa ?? 0,
      codOrders: c.cod ?? 0,
    };
  }
}
