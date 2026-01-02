import { eq } from "drizzle-orm";
import { Queryable } from "..";
import { profile } from "../schema";

export const userRepository = {
  getById: async (
    db: Queryable,
    userId: string,
  ): Promise<UserProfile | null> => {
    const fetchedProfile =
      (await db.query.profile.findFirst({
        where: eq(profile.userId, userId),
      })) ?? null;

    return fetchedProfile;
  },
  create: async (
    db: Queryable,
    payload: CreateUserProfile,
  ): Promise<UserProfile> => {
    const createdUser = await db.insert(profile).values(payload).returning({
      userId: profile.userId,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      bio: profile.bio,
      jobTitle: profile.jobTitle,
    });

    return createdUser[0];
  },
  update: async (db: Queryable, payload: UpdateUserProfile) => {
    await db.update(profile).set(payload);
  },
};
