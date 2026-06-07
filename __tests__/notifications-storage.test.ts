import {
  addNotification,
  countUnread,
  markAllRead,
  type StoredNotification,
} from '../src/features/notifications/notifications-storage';

function make(id: string, read = false): StoredNotification {
  return { id, title: 't', body: 'b', type: 'promotion', data: {}, receivedAt: Number(id), read };
}

describe('notifications storage helpers', () => {
  it('prepends new notifications (newest first)', () => {
    const list = addNotification(addNotification([], make('1')), make('2'));
    expect(list.map((n) => n.id)).toEqual(['2', '1']);
  });

  it('ignores re-delivered notifications with the same id', () => {
    const once = addNotification([], make('1'));
    expect(addNotification(once, make('1'))).toBe(once);
  });

  it('counts only unread', () => {
    const list = [make('3'), make('2', true), make('1')];
    expect(countUnread(list)).toBe(2);
  });

  it('marks all read and returns the same ref when nothing changes', () => {
    const list = [make('2'), make('1', true)];
    const read = markAllRead(list);
    expect(countUnread(read)).toBe(0);
    expect(markAllRead(read)).toBe(read);
  });
});
