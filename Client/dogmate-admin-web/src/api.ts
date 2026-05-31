import axios from 'axios';
import type { DogRow, LoginResponse, UserRow } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

function toMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { error?: string } | undefined)?.error ||
      error.message ||
      fallback
    );
  }
  return fallback;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    const response = await client.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    throw new Error(toMessage(error, 'Login failed'));
  }
}

export async function logout(userId: string, email: string): Promise<void> {
  try {
    await client.post('/auth/logout', { userId, email });
  } catch {
    // Local logout still proceeds
  }
}

export async function getAllUsers(): Promise<UserRow[]> {
  try {
    const response = await client.get('/users');
    const payload = response.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.users)) return payload.users;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  } catch (error) {
    throw new Error(toMessage(error, 'Failed to fetch users'));
  }
}

export async function suspendUser(userId: string): Promise<void> {
  try {
    await client.post(`/users/${userId}/suspend`);
  } catch (error) {
    throw new Error(toMessage(error, 'Failed to suspend user'));
  }
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    await client.delete(`/users/${userId}`);
  } catch (error) {
    throw new Error(toMessage(error, 'Failed to delete user'));
  }
}

export async function getAllDogs(): Promise<DogRow[]> {
  try {
    const response = await client.get('/dogs');
    return Array.isArray(response.data?.dogs) ? response.data.dogs : [];
  } catch (error) {
    throw new Error(toMessage(error, 'Failed to fetch dogs'));
  }
}

export async function deleteDog(dogId: string): Promise<void> {
  try {
    await client.delete(`/dogs/${dogId}`);
  } catch (error) {
    throw new Error(toMessage(error, 'Failed to delete dog'));
  }
}
