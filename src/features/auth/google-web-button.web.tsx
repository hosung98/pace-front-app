import { useEffect, useRef, useState } from 'react';

import { GOOGLE_WEB_CLIENT_ID } from '@/constants/api';
import type { GoogleWebButtonProps } from './google-web-button';
import { loadGoogleIdentity } from './google-web-sdk';

export function GoogleWebButton({ disabled, onCredential }: GoogleWebButtonProps) {
  const host = useRef<HTMLDivElement>(null);
  const current = useRef({ disabled, onCredential });
  const [failure, setFailure] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { current.current = { disabled, onCredential }; }, [disabled, onCredential]);

  useEffect(() => {
    let active = true;
    let observer: ResizeObserver | undefined;
    let frame: number | undefined;
    void loadGoogleIdentity().then((sdk) => {
      if (!active || !host.current) return;
      sdk.initialize({
        client_id: GOOGLE_WEB_CLIENT_ID, ux_mode: 'popup', auto_select: false,
        callback: ({ credential }) => {
          if (!active || current.current.disabled) return;
          if (!credential) {
            setFailure('Google에서 인증 토큰을 받지 못했어요. 다시 시도해 주세요.');
            return;
          }
          current.current.onCredential(credential);
        },
      });
      const element = host.current;
      let renderedWidth = 0;
      const render = () => {
        if (!active) return;
        const width = Math.min(400, Math.floor(element.getBoundingClientRect().width));
        if (width <= 0 || width === renderedWidth) return;
        renderedWidth = width;
        element.replaceChildren();
        sdk.renderButton(element, {
          type: 'standard', theme: 'outline', size: 'large', text: 'continue_with',
          shape: 'pill', locale: 'ko', width,
        });
      };
      render();
      observer = new ResizeObserver(() => {
        if (frame !== undefined) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(render);
      });
      observer.observe(element);
      setLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      console.error('Google 웹 로그인 초기화 실패', error);
      setFailure(error instanceof Error ? error.message : 'Google 로그인을 불러오지 못했어요.');
      setLoading(false);
    });
    return () => {
      active = false;
      observer?.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [attempt]);

  return (
    <div style={{ width: '100%', minWidth: 0, minHeight: 44, color: '#B0B3AB', fontSize: 12, textAlign: 'center' }}>
      <div ref={host} inert={disabled} aria-hidden={disabled}
        style={{ width: '100%', minWidth: 0, display: 'flex', justifyContent: 'center', opacity: disabled ? 0.45 : 1 }} />
      {(loading || disabled) && <p role="status">{disabled ? '로그인 중…' : 'Google 로그인 불러오는 중…'}</p>}
      {failure && <div role="alert">
        <p>{failure}</p>
        <button type="button" disabled={disabled} onClick={() => {
          setLoading(true);
          setFailure(null);
          setAttempt((value) => value + 1);
        }}>다시 시도</button>
      </div>}
    </div>
  );
}
