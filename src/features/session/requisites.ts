import { api } from '../../lib/api';

export type Requisites = {
  company_name: string;
  inn: string;
  kpp: string;
  legal_address: string;
};

export const updateRequisites = (requisites: Requisites) =>
  api<{ requisites: Requisites }>('update_requisites', {
    method: 'POST',
    body: JSON.stringify(requisites),
  });

// Same wording as the website's update_requisites errors.
export function requisitesErrorMessage(code: string) {
  if (code === 'INVALID_INN') return 'ИНН должен содержать 10 или 12 цифр';
  if (code === 'INVALID_KPP') return 'КПП должен содержать 9 цифр';
  if (code === 'SESSION_EXPIRED' || code === 'AUTH_REQUIRED') return 'Сессия истекла. Войдите заново.';
  return 'Не удалось сохранить. Проверьте подключение.';
}
