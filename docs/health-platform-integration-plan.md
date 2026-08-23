# Health Platform Integration Plan

## Scope

Epic 26 is implemented at the webapp-ready contract level. The PWA stores the user's intended provider, selected data categories, unit mapping, privacy acknowledgement, and permission request status. It does not read from or write to Health Connect or Apple Health.

## Platform Findings

- Android Health Connect is exposed through the Android Health Connect SDK. Apps declare record permissions and launch the Health Connect permission contract for selected data types.
- Apple Health is exposed through HealthKit in native Apple apps. Apps enable the HealthKit capability, provide usage descriptions, and request read/share permission for each data type.
- Browser PWAs do not have direct standard access to Health Connect or HealthKit stores. A future native shell, Capacitor/Cordova plugin, React Native/Expo module, or server-side partner integration must provide the bridge before sync is enabled.

Official references:

- https://developer.android.com/health-and-fitness/health-connect/get-started
- https://developer.apple.com/documentation/healthkit
- https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data

## Contract

Stored settings live in `HealthIntegrationSettings`:

- `provider`: `health-connect` or `apple-health`
- `selectedDataTypes`: `weight`, `workout`, `hydration`
- `unitMapping`: weight `kg/lb`, hydration `ml/oz`, workout distance `km/mi`
- `privacyAccepted`: explicit acknowledgement before sync can be considered
- `nativeBridgeAvailable`: false in the web app
- `permissionStatus`: `not_requested`, `requested`, `granted`, `denied`, or `revoked`

`canSyncHealthData` returns true only when a native bridge is available, privacy has been accepted, platform permission is granted, and the specific data type was selected.

## UX Rule

The Settings screen can save a permission request mock and category choices, but it must show each category as `Not syncing` until native permission is confirmed. No implicit or background sync is started from this web-only implementation.
