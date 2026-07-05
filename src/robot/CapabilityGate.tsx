// Browser capability gate (plan Section 4, governing rule): with no Web
// Bluetooth, the user never sees the mode grid — they get a page that
// explains why and points to a platform that works.

function detectPlatform(): 'ios' | 'android' | 'other' {
  const ua = navigator.userAgent
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  if (/iPad|iPhone|iPod/.test(ua) || iPadOS) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'other'
}

export function CapabilityGate() {
  const platform = detectPlatform()

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-8 text-slate-900">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-violet-100 text-4xl" aria-hidden="true">
          🤖
        </div>
        <h1 className="text-2xl font-bold">LearnXRP can't reach robots from this browser</h1>

        {platform === 'ios' && (
          <p className="mt-4 text-slate-600">
            No iOS browser can talk to robots over Bluetooth. Get the LearnXRP app
            from the App Store — it has everything, including robot control.
          </p>
        )}
        {platform === 'android' && (
          <p className="mt-4 text-slate-600">
            The LearnXRP app from Google Play is the best experience on Android.
            You can also keep using the web version in a browser with Bluetooth
            support, like Chrome.
          </p>
        )}
        {platform === 'other' && (
          <p className="mt-4 text-slate-600">
            This browser doesn't support Web Bluetooth, which LearnXRP uses to
            talk to robots. Switch to <strong>Chrome</strong>, <strong>Edge</strong>,
            or <strong>Opera</strong> and come back — everything else stays the
            same.
          </p>
        )}

        <p className="mt-6 text-sm text-slate-400">
          Robot connections use Web Bluetooth, which Safari and Firefox don't
          provide.
        </p>
      </div>
    </main>
  )
}
