import React, { createContext, useContext, useMemo, useState } from 'react';

export type UserType = {
  id: string;
  email: string;
  suspended: boolean;
  type?: string;
  firstName?: string;
  lastName?: string;
  permissionLevel?: string;
};

type UsersContextValue = {
  users: UserType[];
  setUsers: React.Dispatch<React.SetStateAction<UserType[]>>;
  removeUserById: (id: string) => void;
};

const UsersContext = createContext<UsersContextValue | null>(null);

export const UsersProvider: React.FC<React.PropsWithChildren<{ initialUsers?: UserType[] }>> = ({
  children,
  initialUsers = [],
}) => {
  const [users, setUsers] = useState<UserType[]>(initialUsers);

  const removeUserById = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const value = useMemo(() => ({ users, setUsers, removeUserById }), [users]);

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
};

export const useUsers = () => {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error('useUsers must be used within UsersProvider');
  return ctx;
};