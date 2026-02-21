import { useState } from 'react';
import { Button } from '@/ui';
import { useTelegramAccess } from '../hooks/useTelegramAccess';

export default function TelegramOnboarding() {
  const { link, generateLink, verifyCode, isVerified, expiresIn } = useTelegramAccess();
  const [inputCode, setInputCode] = useState('');

  return (
    <div className="p-4 bg-slate-800 rounded-lg text-white space-y-4">
      {!link && <Button onClick={generateLink}>Згенерувати Telegram посилання</Button>}

      {link && !isVerified && (
        <div className="space-y-2">
          <p>Перейдіть за посиланням у Telegram:</p>
          <a href={link} target="_blank" rel="noreferrer" className="text-orange-400 underline">
            {link}
          </a>
          <p>Посилання дійсне ще {Math.floor(expiresIn / 60)} хвилин</p>

          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Введіть код з Telegram"
            className="w-full p-2 rounded bg-slate-700"
          />
          <Button onClick={() => verifyCode(inputCode)}>Підтвердити код</Button>
        </div>
      )}

      {isVerified && <p className="text-green-400 font-semibold">Telegram підключено!</p>}
    </div>
  );
}
