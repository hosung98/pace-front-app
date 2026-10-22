// 웹은 영구 저장소에 토큰을 남기지 않고 현재 탭 메모리에서만 사용합니다.
let value: string | null = null;
export const readSession = async () => value;
export const writeSession = async (next: string) => { value = next; };
export const removeSession = async () => { value = null; };
