<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent, AuthFormField } from "@nuxt/ui";

const toast = useToast();

const fields: AuthFormField[] = [
  {
    name: "fullName",
    type: "text",
    label: "Full name",
    placeholder: "Enter your name",
    required: true,
  },
  {
    name: "email",
    type: "email",
    label: "Email",
    placeholder: "Enter your email",
    required: true,
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "Enter your password",
    required: true,
  },
];

const schema = z.object({
  fullName: z.string("Full name is required"),
  email: z.email("Invalid email"),
  password: z
    .string("Password is required")
    .min(8, "Must be at least 8 characters"),
});

type Schema = z.output<typeof schema>;

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  try {
    await $fetch("/api/v1/auth/signup", {
      method: "POST",
      body: payload.data,
    });
  } catch (error) {
    console.log(error);
  }
}
</script>

<template>
  <UAuthForm
    :schema="schema"
    title="Sign Up"
    description="Create an account."
    icon="i-lucide-user"
    :fields="fields"
    @submit="onSubmit"
  />
</template>
