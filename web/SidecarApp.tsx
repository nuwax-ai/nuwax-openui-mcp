import { Renderer } from '@openuidev/react-lang';
import { openuiLibrary } from '@openuidev/react-ui/genui-lib';
import { useEffect, useRef, useState } from 'react';

interface ArtifactResponse {
  title: string;
  document: { source: string };
  fallback: { markdown: string };
}

export function SidecarApp({ artifactId }: { artifactId: string }) {
  const [artifact, setArtifact] = useState<ArtifactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    // Keep the URL relative to /openui/pages/:artifactId. This lets the same
    // runtime work both on localhost and behind a conversation-scoped proxy
    // prefix such as /computer/desktop/:conversationId/openui/.
    const artifactUrl = new URL(window.location.href);
    const isDesktopQueryTransport = artifactUrl.searchParams.has('openui');
    if (isDesktopQueryTransport) {
      artifactUrl.search = '';
      artifactUrl.searchParams.set('openui', 'artifact');
      artifactUrl.searchParams.set('artifactId', artifactId);
    }
    void fetch(
      isDesktopQueryTransport
        ? artifactUrl.toString()
        : `../artifacts/${encodeURIComponent(artifactId)}`,
      {
        credentials: 'same-origin',
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Artifact request failed (${response.status}).`);
        }
        return (await response.json()) as ArtifactResponse;
      })
      .then(setArtifact)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Unknown error.');
        }
      });

    return () => controller.abort();
  }, [artifactId]);

  useEffect(() => {
    if (!artifact) return;
    window.parent.postMessage(
      {
        type: 'OPENUI_READY',
        artifactId,
        protocolVersion: 'nuwax.openui-page/v1',
      },
      '*',
    );

    const element = containerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      window.parent.postMessage(
        {
          type: 'OPENUI_RESIZE',
          artifactId,
          protocolVersion: 'nuwax.openui-page/v1',
          height: Math.ceil(entry.contentRect.height),
        },
        '*',
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [artifact, artifactId]);

  if (error) {
    return <div className="openui-state openui-error">{error}</div>;
  }

  if (!artifact) {
    return <div className="openui-state">Loading OpenUI…</div>;
  }

  return (
    <div ref={containerRef} className="openui-sidecar">
      <Renderer
        library={openuiLibrary}
        response={artifact.document.source}
        isStreaming={false}
        onError={(errors) => {
          if (errors.length > 0)
            setError(errors[0]?.message ?? 'Render failed.');
        }}
      />
    </div>
  );
}
