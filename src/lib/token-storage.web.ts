const TOKEN_KEY = 'splithub.mobile-token';

export const tokenStorage = {
  get: async () => window.localStorage.getItem(TOKEN_KEY),
  set: async (token: string) => window.localStorage.setItem(TOKEN_KEY, token),
  clear: async () => window.localStorage.removeItem(TOKEN_KEY),
};
