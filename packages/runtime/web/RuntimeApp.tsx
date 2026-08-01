import { Renderer, type ActionEvent } from '@openuidev/react-lang';
import { ThemeProvider } from '@openuidev/react-ui';
import { openuiLibrary } from '@openuidev/react-ui/genui-lib';
import { compactOpenUiTheme } from '../../server/src/compactTheme';
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
  // Host 提供的可 fetch URL（指向 data/{artifactId}.openui.json）。仅当推过来的 artifact
  // 被后端（如 codex）硬截断时，runtime 才用它取完整落盘 json 兜底。可选、向后兼容。
  artifactUrl?: string;
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

// codex 等后端对工具/命令输出在 ~10KiB/256 行处硬截断，插入此标记。检测到它即说明
// Host 推过来的 source 已残缺，应改用落盘的完整 data/{id}.openui.json 渲染。
const TRUNCATED_MARKER = '...[truncated]...';

function isOpenUiTruncated(artifact: RuntimeArtifact): boolean {
  return (
    artifact.document?.source?.includes(TRUNCATED_MARKER) === true ||
    artifact.fallback?.markdown?.includes(TRUNCATED_MARKER) === true
  );
}

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
  // 始终用"移动端感知"库：组件自行按 LayoutContext 决定是否横排→竖排，桌面端零变化。
  const library = useMemo(() => createMobileAwareLibrary(openuiLibrary), []);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMessage = async (
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
        const incoming = message.data.artifact;
        const fallbackUrl = message.data.artifactUrl;
        // 截断兜底：source 含 ...[truncated]... 且 Host 提供了可 fetch 的落盘 json URL 时，
        // 直接取完整 data/{id}.openui.json 渲染；任何失败都回退到原 artifact（不破坏现状）。
        if (fallbackUrl && isOpenUiTruncated(incoming)) {
          try {
            const response = await fetch(fallbackUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const file = (await response.json()) as RuntimeArtifact;
            setError(null);
            setArtifact(file);
            return;
          } catch (error) {
            postToHost({
              type: 'OPENUI_ERROR',
              nonce,
              message: `OpenUI truncation fallback failed: ${error instanceof Error ? error.message : String(error)}`,
            });
          }
        }
        setError(null);
        setArtifact(incoming);
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
