import { Redirect } from 'expo-router';

// Sign-up UI lives in login.tsx (tab toggle). Keep this route for deep-links.
export default function SignupRedirect() {
  return <Redirect href="/(auth)/login" />;
}
