# Authentication Flow Test

## Test Cases

### 1. Signup Process

- **Endpoint**: `POST /api/v1/auth/signup`
- **Request Body**:
  ```json
  {
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }
  ```
- **Expected Response**: 200 OK with user data
- **Redirect**: Should redirect to `/login` after successful signup

### 2. Login Process

- **Endpoint**: Direct Supabase client call
- **Request**:
  ```javascript
  supabase.auth.signInWithPassword({
    email: "test@example.com",
    password: "password123",
  });
  ```
- **Expected Response**: Successful authentication
- **Redirect**: Should redirect to `/` (index page) after successful login

### 3. Social Login (Google/GitHub)

- **Endpoint**: Direct Supabase OAuth call
- **Request**:
  ```javascript
  supabase.auth.signInWithOAuth({
    provider: "google", // or "github"
  });
  ```
- **Expected Response**: Redirect to OAuth provider

## Manual Testing Steps

1. **Signup Test**:
   - Navigate to `/signup`
   - Fill in name, email, and password
   - Submit form
   - Verify redirect to `/login`
   - Verify toast success message

2. **Login Test**:
   - Navigate to `/login`
   - Enter email and password used in signup
   - Submit form
   - Verify redirect to `/` (index page)
   - Verify toast success message

3. **Error Handling Test**:
   - Try login with invalid credentials
   - Verify error toast message
   - Verify no redirect occurs

## API Endpoints Documentation

### POST /api/v1/auth/signup

- **Description**: Creates a new user account
- **Request Body**:
  ```typescript
  {
    name: string;
    email: string;
    password: string;
  }
  ```
- **Response**: User profile data
- **Error Codes**:
  - 400: Bad Request (validation error)
  - 500: Internal Server Error

### POST /api/v1/auth/signin

- **Description**: Authenticates a user (alternative to direct Supabase client)
- **Request Body**:
  ```typescript
  {
    email: string;
    password: string;
  }
  ```
- **Response**: User and session data
- **Error Codes**:
  - 400: Bad Request (validation error)
  - 401: Unauthorized (invalid credentials)

## Implementation Notes

1. **Signup Flow**:
   - Validates input using Zod schema
   - Creates Supabase user with email/password
   - Creates profile record in database
   - Redirects to login page on success

2. **Login Flow**:
   - Uses Supabase client directly for authentication
   - Handles errors with toast notifications
   - Redirects to index page on success

3. **Security**:
   - Password minimum length: 8 characters
   - Email validation using Zod
   - Error messages don't expose sensitive information
