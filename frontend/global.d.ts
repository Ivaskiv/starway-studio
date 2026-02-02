declare module '*.css';
declare module '*.scss';

export interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient: (opts: {
          client_id: string;
          scope: string;
          callback: (res: { access_token?: string }) => void;
        }) => {
          requestAccessToken: () => void;
        };
      };
    };
  };
  Telegram?: any; 
}
