import * as SecureStore from 'expo-secure-store';

const KEY = 'pace.session.v1';

export const readSession = () => SecureStore.getItemAsync(KEY);
export const writeSession = (value: string) => SecureStore.setItemAsync(KEY, value);
export const removeSession = () => SecureStore.deleteItemAsync(KEY);
