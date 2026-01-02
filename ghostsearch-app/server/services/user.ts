import { DB } from "../db";
import { userRepository } from "../db/repositories/user";

export const userService = {
  getById: async (db: DB, userId: string): Promise<UserProfile | null> => {
    return await userRepository.getById(db, userId);
  },
  create: async (db: DB, payload: CreateUserProfile): Promise<UserProfile> => {
    return await userRepository.create(db, payload);
  },
  update: async (db: DB, payload: UpdateUserProfile) => {
    await userRepository.update(db, payload);
  },
  list: async (db: DB) => {},
};
