import { z } from "zod";

export const UserProfile = z.object({
  userId: z.uuid(),
  fullName: z.string(),
  avatarUrl: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  bio: z.string().nullable(),
  jobTitle: z.string().nullable(),
});

export const CreateUserProfile = UserProfile.pick({
  userId: true,
  fullName: true,
});

export const UpdateUserProfile = UserProfile.pick({
  fullName: true,
  bio: true,
  jobTitle: true,
}).partial();
