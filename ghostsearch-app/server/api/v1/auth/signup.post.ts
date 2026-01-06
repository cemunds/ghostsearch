import { serverSupabaseClient } from "#supabase/server";
import consola from "consola";
import { z } from "zod";
import { db } from "~~/server/db";
import { userService } from "~~/server/services/user";

export const CreateUserProfileDTO = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email(),
  password: z.string().min(8),
});

export type CreateUserProfileDTO = z.infer<typeof CreateUserProfileDTO>;

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const user = CreateUserProfileDTO.safeParse(body);
  if (!user.success) {
    consola.log(user.error);
    throw createError({ statusCode: 400, statusMessage: "Bad Request" });
  }

  const client = await serverSupabaseClient(event);
  const supabaseUser = await client.auth.signUp({
    email: user.data.email,
    password: user.data.password,
    options: {
      data: {
        full_name: user.data.name,
      },
    },
  });

  if (supabaseUser.error) {
    consola.log(supabaseUser.error);
    throw createError({
      statusCode: 400,
      statusMessage: supabaseUser.error.message,
    });
  }

  if (!supabaseUser.data.user) {
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }

  const userId = supabaseUser.data.user.id;

  return await userService.create(db, {
    userId,
    fullName: user.data.name,
  });
});
