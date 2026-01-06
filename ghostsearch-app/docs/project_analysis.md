# GhostSearch App - Project Analysis

## Overview

This document provides an analysis of the GhostSearch application structure, focusing on the authentication system and overall architecture.

## Project Structure

### Key Directories

- `app/` - Contains the Nuxt.js application (pages, components, layouts)
- `server/` - Contains server-side API endpoints and business logic
- `shared/` - Contains shared types and parsers
- `supabase/` - Supabase configuration
- `docs/` - Documentation (this file)

### Authentication System

#### Current Implementation

1. **Login Page** (`app/pages/login.vue`):
   - Uses Supabase client for authentication
   - Implements email/password login with `signInWithPassword`
   - Has placeholder social login providers (Google, GitHub)
   - Missing redirect after successful login

2. **Signup Page** (`app/pages/signup.vue`):
   - Uses custom API endpoint (`/api/v1/auth/signup`)
   - Collects name, email, and password
   - Missing redirect after successful signup

3. **API Endpoints**:
   - `server/api/v1/auth/signup.post.ts` - Handles user registration
   - `server/api/v1/auth/signin.post.ts` - Incomplete login endpoint

#### Database Schema

The application uses a PostgreSQL database with the following tables:

1. **profile** table:
   - `userId` (UUID, primary key)
   - `fullName` (text, required)
   - `avatarUrl` (text, optional)
   - `createdAt` (timestamp)
   - `updatedAt` (timestamp)
   - `bio` (text, optional)
   - `jobTitle` (text, optional)

2. **collection** table:
   - For storing user collections (Ghost CMS data)
   - References profile.userId

#### Authentication Flow

1. **Signup Process**:
   - User submits form with name, email, password
   - Frontend calls `/api/v1/auth/signup`
   - Server validates data and creates Supabase user
   - Creates profile record in database
   - Should redirect to login or index page

2. **Login Process**:
   - User submits email and password
   - Frontend calls Supabase `signInWithPassword` directly
   - Should redirect to index page on success

## Issues Identified

1. **Incomplete Login Endpoint**: `signin.post.ts` is empty
2. **Missing Redirects**: Neither login nor signup redirect after success
3. **Social Login Placeholders**: Google/GitHub providers show toasts but don't work
4. **Error Handling**: Basic error logging but no user feedback

## Recommendations

1. **Complete Authentication Flow**:
   - Implement proper login endpoint
   - Add redirects to index page after successful auth
   - Improve error handling and user feedback

2. **Enhance Security**:
   - Add password confirmation
   - Implement email verification
   - Add rate limiting

3. **User Experience**:
   - Add loading states
   - Provide success/error messages
   - Implement "remember me" functionality

## Next Steps

1. Complete the signup implementation
2. Implement the login endpoint
3. Add proper redirects
4. Test the authentication flow
5. Document the API endpoints
