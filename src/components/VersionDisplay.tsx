export function VersionDisplay() {
  const commitHash = import.meta.env.VITE_COMMIT_HASH;
  const appVersion = import.meta.env.VITE_APP_VERSION;
  const isDev = import.meta.env.DEV;

  // Format commit hash to 7 characters (standard short hash length)
  const shortHash = commitHash ? commitHash.substring(0, 7) : null;

  // In dev mode, show version or "dev", in production only show if version info exists
  if (!isDev && !shortHash && !appVersion) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 pointer-events-none">
      <div className="max-w-md mx-auto px-4 py-1">
        <p className="text-xs text-muted-foreground text-center">
          {appVersion && shortHash ? (
            <>v{appVersion} ({shortHash})</>
          ) : appVersion ? (
            <>v{appVersion}{isDev ? ' (dev)' : ''}</>
          ) : shortHash ? (
            <>{shortHash}</>
          ) : (
            <>dev</>
          )}
        </p>
      </div>
    </div>
  );
}
