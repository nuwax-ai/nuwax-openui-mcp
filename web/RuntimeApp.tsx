import { Renderer, type ActionEvent } from '@openuidev/react-lang';
import { openuiLibrary } from '@openuidev/react-ui/genui-lib';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  window.parent.postMessage({ protocolVersion, ...message }, '*');
}

export function RuntimeApp() {
  const nonce = new URLSearchParams(window.location.search).get('nonce') ?? '';
  const [artifact, setArtifact] = useState<RuntimeArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const stateRef = useRef<Record<string, unknown>>({});
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
        document.documentElement.dataset.theme = message.data.theme || 'light';
        document.documentElement.dataset.viewport =
          message.data.viewport || 'desktop';
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
      <Renderer
        library={openuiLibrary}
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
    </div>
  );
}
