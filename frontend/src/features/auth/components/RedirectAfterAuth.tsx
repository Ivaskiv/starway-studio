import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/app/store/hooks';
import { selectCurrentUser } from '@/features/auth/services/auth.slice';

// 🔹 Розумний редірект після логіну/реєстрації
export default function RedirectAfterAuth() {
  const navigate = useNavigate();
  const user = useAppSelector(selectCurrentUser);

  useEffect(() => {
    if (!user) {
      // Якщо немає юзера в сторі, редірект на домашню
      navigate('/', { replace: true });
      return;
    }

    if (!user.email || user.needsProfile) {
      // Якщо користувач не заповнив профіль
      navigate('/dashboard/profile', { replace: true });
      return;
    }

    // Якщо все ок — на головну dashboard
    navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  return null; // нічого не рендеримо
}
