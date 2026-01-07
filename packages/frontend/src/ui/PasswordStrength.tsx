// /Users/viravira/Documents/starway-studio/packages/frontend/src/ui/PasswordStrength.tsx
export interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  // Простий розрахунок сили пароля (0–100)
  const value = Math.min(
    100,
    password.length * 10 +
      (/[A-Z]/.test(password) ? 10 : 0) +
      (/[0-9]/.test(password) ? 10 : 0) +
      (/[^A-Za-z0-9]/.test(password) ? 10 : 0)
  );

  return (
    <div className="password-strength">
      <div
        className="password-strength-bar"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
