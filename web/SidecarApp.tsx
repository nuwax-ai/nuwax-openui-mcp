import { Renderer } from '@openuidev/react-lang';
import { openuiLibrary } from '@openuidev/react-ui/genui-lib';
import { useEffect, useState } from 'react';

interface ArtifactResponse {
  title: string;
  document: { source: string };
  fallback: { markdown: string };
}

export function SidecarApp({ artifactId }: { artifactId: string }) {
  const [artifact, setArtifact] = useState<ArtifactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/openui/artifacts/${encodeURIComponent(artifactId)}`, {
      credentials: 'omit',
      signal: controller.signal,
    })
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

  if (error) {
    return <div className="openui-state openui-error">{error}</div>;
  }

  if (!artifact) {
    return <div className="openui-state">Loading OpenUI…</div>;
  }

  return (
    <div className="openui-sidecar">
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
