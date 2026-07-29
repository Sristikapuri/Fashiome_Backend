import { QueryFilter } from "mongoose";
import { UserModel, IUser } from "../models/user.model";

export interface IUserRepository {
  getUserByEmail(email: string): Promise<IUser | null>;
  getUserByUsername(username: string): Promise<IUser | null>;
  createUser(user: Partial<IUser>): Promise<IUser>;
  getUserById(id: string): Promise<IUser | null>;
  getAll(): Promise<IUser[]>;
  update(id: string, user: Partial<IUser>): Promise<IUser | null>;
  delete(id: string): Promise<boolean>;
  getPaginatedUsers(page: number, limit: number, search?: string): Promise<{ users: IUser[]; total: number }>;
}

export class UserMongoRepository implements IUserRepository {
  async getUserById(id: string): Promise<IUser | null> {
    const found = await UserModel.findOne({ _id: id });
    return found;
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    const cleanEmail = email.trim();
    const found = await UserModel.findOne({
      email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    return found;
  }

  async getUserByUsername(username: string): Promise<IUser | null> {
    const found = await UserModel.findOne({ username });
    return found;
  }

  async createUser(user: Partial<IUser>): Promise<IUser> {
    const created = await UserModel.create(user);
    return created;
  }

  async getAll(): Promise<IUser[]> {
    const found = await UserModel.find();
    return found;
  }

  async update(id: string, user: Partial<IUser>): Promise<IUser | null> {
    const updated = await UserModel.findByIdAndUpdate(id, user, { returnDocument: 'after' });
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await UserModel.findByIdAndDelete(id);
    return !!deleted;
  }

  async getPaginatedUsers(page: number, limit: number, search?: string): Promise<{ users: IUser[]; total: number }> {
    const skip = (page - 1) * limit;
    
    let query: QueryFilter<IUser> = {};
    if (search) {
      query = {
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ]
      };
    }

    const [users, total] = await Promise.all([
      UserModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      UserModel.countDocuments(query)
    ]);

    return { users, total };
  }
}
