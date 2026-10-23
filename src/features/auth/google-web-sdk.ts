export type GoogleIdentity = {
  initialize: (options: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    ux_mode: 'popup';
    auto_select: boolean;
  }) => void;
  renderButton: (element: HTMLElement, options: {
    type: 'standard'; theme: 'outline'; size: 'large'; text: 'continue_with';
    shape: 'pill'; locale: string; width: number;
  }) => void;
};

type GoogleWindow = Window & { google?: { accounts?: { id?: GoogleIdentity } } };
let loading: Promise<GoogleIdentity> | null = null;

export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  const identity = (window as GoogleWindow).google?.accounts?.id;
  if (identity) return Promise.resolve(identity);
  if (loading) return loading;
  loading = new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client?hl=ko';
    script.async = true;
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error('Google 로그인 버튼을 불러오지 못했어요. 연결 상태와 브라우저 차단 설정을 확인하고 다시 시도해 주세요.'));
    };
    const timeout = setTimeout(fail, 15_000);
    script.onerror = fail;
    script.onload = () => {
      const sdk = (window as GoogleWindow).google?.accounts?.id;
      if (!sdk) { fail(); return; }
      clearTimeout(timeout);
      resolve(sdk);
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}
