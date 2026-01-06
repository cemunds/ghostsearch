import { serverSupabaseClient } from "#supabase/server";
import { z } from "zod";

export const LoginDTO = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export type LoginDTO = z.infer<typeof LoginDTO>;

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const loginData = LoginDTO.safeParse(body);
  if (!loginData.success) {
    throw createError({ statusCode: 400, statusMessage: "Bad Request" });
  }

  const client = await serverSupabaseClient(event);
  const { data, error } = await client.auth.signInWithPassword({
    email: loginData.data.email,
    password: loginData.data.password,
  });

  if (error) {
    throw createError({
      statusCode: 401,
      statusMessage: error.message,
    });
  }

  return {
    user: data.user,
    session: data.session,
  };
});
