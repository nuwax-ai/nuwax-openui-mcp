import { Renderer, type ActionEvent } from '@openuidev/react-lang';
import { ThemeProvider } from '@openuidev/react-ui';
import { openuiLibrary } from '@openuidev/react-ui/genui-lib';
import { compactOpenUiTheme } from '../../server/src/compactTheme';
import { createFormFieldSyncLibrary } from '../../server/src/formFieldSync';
import {
  createMobileAwareLibrary,
  MobileLayoutProvider,
} from '../../server/src/mobileLayout';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface RuntimeArtifact {
  type: 'nuwax.openui-file';
  schemaVersion: 'nuwax.openui-file/v1';
  artifactId: string;
  title: string;
  document: { source: string };
  fallback: { markdown: string };
}

interface LoadMessage {
  type: 'OPENUI_LOAD';
  protocolVersion: 'nuwax.openui-runtime/v1';
  nonce: string;
  artifact: RuntimeArtifact;
  locale?: string;
  theme?: 'light' | 'dark';
  viewport?: 'desktop' | 'mobile';
}

interface ActionResultMessage {
  type: 'OPENUI_ACTION_RESULT';
  nonce: string;
  actionId: string;
  success: boolean;
  message?: string;
}

const protocolVersion = 'nuwax.openui-runtime/v1' as const;

function postToHost(message: Record<string, unknown>): void {
  const payload = { protocolVersion, ...message };
  // runtime 保持纯粹：只发标准 window.parent.postMessage，不引用 uni-webview / JSSDK。
  // - PC web iframe / H5：Host 直接收到（parent !== window）。
  // - App 原生 / 小程序顶层 webview：parent === window，postMessage 回环到自身；由入口
  //   index.html 的 bootstrap relay 监听本窗 message，再经 uni.webView.postMessage 桥接到
  //   <web-view> @message（JSSDK 与桥接逻辑全在 Host 侧）。
  window.parent.postMessage(payload, '*');
}

export function RuntimeApp() {
  const nonce = new URLSearchParams(window.location.search).get('nonce') ?? '';
  const [artifact, setArtifact] = useState<RuntimeArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const stateRef = useRef<Record<string, unknown>>({});
  // 先同步 Radio/Slider 默认值到 store（修必填误报），再套移动端感知库（横排→竖排）。
  const library = useMemo(
    () => createMobileAwareLibrary(createFormFieldSyncLibrary(openuiLibrary)),
    [],
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMessage = (
      message: MessageEvent<LoadMessage | ActionResultMessage>,
    ) => {
      if (message.source !== window.parent || message.data?.nonce !== nonce)
        return;
      if (message.data.type === 'OPENUI_LOAD') {
        if (message.data.protocolVersion !== protocolVersion) return;
        document.documentElement.lang = message.data.locale || 'en';
        const nextTheme = message.data.theme || 'light';
        document.documentElement.dataset.theme = nextTheme;
        setTheme(nextTheme);
        const nextViewport = message.data.viewport || 'desktop';
        document.documentElement.dataset.viewport = nextViewport;
        setViewport(nextViewport);
        setError(null);
        setArtifact(message.data.artifact);
        return;
      }
      if (message.data.type === 'OPENUI_ACTION_RESULT') {
        const result = message.data;
        setPendingActionId((current) =>
          current === result.actionId ? null : current,
        );
        if (!result.success && result.message) {
          setError(result.message);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    postToHost({ type: 'OPENUI_READY', nonce });
    return () => window.removeEventListener('message', handleMessage);
  }, [nonce]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === 'undefined' || !artifact) return;
    const reportHeight = () => {
      postToHost({
        type: 'OPENUI_RESIZE',
        nonce,
        artifactId: artifact.artifactId,
        height: Math.max(1, Math.ceil(element.getBoundingClientRect().height)),
      });
    };
    const observer = new ResizeObserver(reportHeight);
    observer.observe(element);
    reportHeight();
    return () => observer.disconnect();
  }, [artifact, nonce]);

  const handleAction = useCallback(
    (event: ActionEvent) => {
      if (!artifact || pendingActionId) return;
      const actionId = crypto.randomUUID();
      setPendingActionId(actionId);
      postToHost({
        type: 'OPENUI_ACTION',
        nonce,
        event: {
          type: 'nuwax.openui-action',
          schemaVersion: 'nuwax.openui-action/v1',
          actionId,
          artifactId: artifact.artifactId,
          artifactPath: `data/${artifact.artifactId}.openui.json`,
          actionName: String(event.type),
          values: event.formState ?? stateRef.current,
          formName: event.formName,
          humanFriendlyMessage: event.humanFriendlyMessage,
          params: event.params,
          submittedAt: new Date().toISOString(),
        },
      });
    },
    [artifact, nonce, pendingActionId],
  );

  if (!nonce)
    return (
      <div className="openui-state openui-error">Missing runtime nonce.</div>
    );
  if (!artifact) return <div className="openui-state">Loading OpenUI…</div>;

  return (
    <div ref={containerRef} className="openui-runtime">
      {error ? <div className="openui-action-error">{error}</div> : null}
      <ThemeProvider mode={theme} lightTheme={compactOpenUiTheme}>
        <MobileLayoutProvider isMobile={viewport === 'mobile'}>
          <Renderer
            library={library}
            response={artifact.document.source}
            isStreaming={Boolean(pendingActionId)}
            onStateUpdate={(state) => {
              stateRef.current = state;
            }}
            onAction={handleAction}
            onError={(errors) => {
              if (errors.length > 0) {
                const message = errors[0]?.message ?? 'Render failed.';
                setError(message);
                postToHost({ type: 'OPENUI_ERROR', nonce, message });
              }
            }}
          />
        </MobileLayoutProvider>
      </ThemeProvider>
    </div>
  );
}
