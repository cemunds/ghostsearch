<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({
  layout: "auth",
});

useSeoMeta({
  title: "Login",
  description: "Login to your account to continue",
});

const supabase = useSupabaseClient();
const toast = useToast();
const router = useRouter();

const fields = [
  {
    name: "email",
    type: "text" as const,
    label: "Email",
    placeholder: "Enter your email",
    required: true,
  },
  {
    name: "password",
    label: "Password",
    type: "password" as const,
    placeholder: "Enter your password",
  },
  {
    name: "remember",
    label: "Remember me",
    type: "checkbox" as const,
  },
];

const providers = [
  {
    label: "Google",
    icon: "i-simple-icons-google",
    onClick: async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) {
        toast.add({
          title: "Error",
          description: error.message,
          color: "error",
        });
      }
    },
  },
  {
    label: "GitHub",
    icon: "i-simple-icons-github",
    onClick: async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
      });
      if (error) {
        toast.add({
          title: "Error",
          description: error.message,
          color: "error",
        });
      }
    },
  },
];

const schema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(8, "Must be at least 8 characters"),
});

type Schema = z.output<typeof schema>;

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: payload.data.email,
      password: payload.data.password,
    });

    if (error) {
      toast.add({ title: "Error", description: error.message, color: "error" });
      return;
    }

    toast.add({
      title: "Success",
      description: "Logged in successfully",
      color: "success",
    });
    await router.push("/");
  } catch (error) {
    console.error("Login error:", error);
    toast.add({
      title: "Error",
      description: "An unexpected error occurred",
      color: "error",
    });
  }
}
</script>

<template>
  <UAuthForm
    :fields="fields"
    :schema="schema"
    :providers="providers"
    title="Welcome back"
    icon="i-lucide-lock"
    @submit="onSubmit"
  >
    <template #description>
      Don't have an account?
      <ULink to="/signup" class="text-primary font-medium">Sign up</ULink>.
    </template>

    <template #password-hint>
      <ULink to="/" class="text-primary font-medium" tabindex="-1"
        >Forgot password?</ULink
      >
    </template>

    <template #footer>
      By signing in, you agree to our
      <ULink to="/" class="text-primary font-medium">Terms of Service</ULink>.
    </template>
  </UAuthForm>
</template>
