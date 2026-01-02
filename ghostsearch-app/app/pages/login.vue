<script setup lang="ts">
definePageMeta({
  layout: false,
});

const items = [
  {
    label: "Sign In",
    icon: "i-lucide-user",
    slot: "signin",
  },
  {
    label: "Sign Up",
    icon: "i-lucide-lock",
    slot: "signup",
  },
];
</script>

<template>
  <div class="flex flex-col min-h-screen items-center justify-center gap-4 p-4">
    <UPageCard class="w-full max-w-md">
      <UTabs :items="items">
        <template #signin>
          <SignInForm />
        </template>

        <template #signup>
          <SignUpForm />
        </template>
      </UTabs>
    </UPageCard>
  </div>
</template>
