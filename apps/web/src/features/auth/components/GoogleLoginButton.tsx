import { Button } from "@/ui";

// src/features/auth/GoogleLoginButton.tsx
export function GoogleLoginButton() {
  const login = () => {
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      redirect_uri: `${window.location.origin}/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account',
    });

    window.location.href =
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  return <Button onClick={login}>Увійти через Google</Button>;
}
