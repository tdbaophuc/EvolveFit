⎯⎯⎯⎯⎯⎯ Unhandled Errors ⎯⎯⎯⎯⎯⎯

Vitest caught 4 unhandled errors during the test run.
This might cause false positive tests. Resolve unhandled errors to make sure your tests are not affected.

⎯⎯⎯⎯ Unhandled Rejection ⎯⎯⎯⎯⎯
TypeError: Cannot read properties of undefined (reading 'profile')
 ❯ Module.mergeLocalDataIntoCloud packages/shared/src/app-data.ts:213:16
    211|     ...cloud,
    212|     profile: {
    213|       ...cloud.profile,
       |                ^
    214|       name: local.profile.name || cloud.profile.name,
    215|       timezone: local.profile.timezone || cloud.profile.timezone,
 ❯ Module.mergePulledState apps/web/src/features/sync/merge.ts:14:18
 ❯ apps/web/src/features/sync/pull.ts:38:22
 ❯ apps/web/src/lib/store/app-store.ts:30:81
 ❯ setState node_modules/zustand/esm/vanilla.mjs:5:55
 ❯ Object.setState apps/web/src/lib/store/app-store.ts:30:25
 ❯ Module.commit apps/web/src/lib/store/app-store.ts:57:26
 ❯ Module.pullFromCloud apps/web/src/features/sync/pull.ts:37:5

This error originated in "apps/web/src/app/account-sync.test.tsx" test file. It doesn't mean the error was thrown inside the file itself, but while it was running.
The latest test that might've caused the error is "signs out to the guest data and removes the account's copy from a shared device". It might mean one of the following:
- The error was thrown, while Vitest was running this test.
- If the error occurred after the test had been completed, this was the last documented test before it was thrown.

⎯⎯⎯⎯ Unhandled Rejection ⎯⎯⎯⎯⎯
TypeError: Cannot read properties of undefined (reading 'profile')
 ❯ Module.mergeLocalDataIntoCloud packages/shared/src/app-data.ts:213:16
    211|     ...cloud,
    212|     profile: {
    213|       ...cloud.profile,
       |                ^
    214|       name: local.profile.name || cloud.profile.name,
    215|       timezone: local.profile.timezone || cloud.profile.timezone,
 ❯ Module.mergePulledState apps/web/src/features/sync/merge.ts:14:18
 ❯ apps/web/src/features/sync/pull.ts:38:22
 ❯ apps/web/src/lib/store/app-store.ts:30:81
 ❯ setState node_modules/zustand/esm/vanilla.mjs:5:55
 ❯ Object.setState apps/web/src/lib/store/app-store.ts:30:25
 ❯ Module.commit apps/web/src/lib/store/app-store.ts:57:26
 ❯ Module.pullFromCloud apps/web/src/features/sync/pull.ts:37:5

This error originated in "apps/web/src/app/account-sync.test.tsx" test file. It doesn't mean the error was thrown inside the file itself, but while it was running.
The latest test that might've caused the error is "can keep the account's copy on the device when signing out". It might mean one of the following:
- The error was thrown, while Vitest was running this test.
- If the error occurred after the test had been completed, this was the last documented test before it was thrown.

⎯⎯⎯⎯ Unhandled Rejection ⎯⎯⎯⎯⎯
TypeError: Cannot read properties of undefined (reading 'profile')
 ❯ Module.mergeLocalDataIntoCloud packages/shared/src/app-data.ts:213:16
    211|     ...cloud,
    212|     profile: {
    213|       ...cloud.profile,
       |                ^
    214|       name: local.profile.name || cloud.profile.name,
    215|       timezone: local.profile.timezone || cloud.profile.timezone,
 ❯ Module.mergePulledState apps/web/src/features/sync/merge.ts:14:18
 ❯ apps/web/src/features/sync/pull.ts:38:22
 ❯ apps/web/src/lib/store/app-store.ts:30:81
 ❯ setState node_modules/zustand/esm/vanilla.mjs:5:55
 ❯ Object.setState apps/web/src/lib/store/app-store.ts:30:25
 ❯ Module.commit apps/web/src/lib/store/app-store.ts:57:26
 ❯ Module.pullFromCloud apps/web/src/features/sync/pull.ts:37:5
 ❯ processTicksAndRejections node:internal/process/task_queues:105:5

This error originated in "apps/web/src/app/app-shell.test.tsx" test file. It doesn't mean the error was thrown inside the file itself, but while it was running.
The latest test that might've caused the error is "syncs the signed-in account's queue in batches instead of leaving items stuck in 'syncing'". It might mean one of the following:
- The error was thrown, while Vitest was running this test.
- If the error occurred after the test had been completed, this was the last documented test before it was thrown.

⎯⎯⎯⎯ Unhandled Rejection ⎯⎯⎯⎯⎯
TypeError: Cannot read properties of undefined (reading 'profile')
 ❯ Module.mergeLocalDataIntoCloud packages/shared/src/app-data.ts:213:16
    211|     ...cloud,
    212|     profile: {
    213|       ...cloud.profile,
       |                ^
    214|       name: local.profile.name || cloud.profile.name,
    215|       timezone: local.profile.timezone || cloud.profile.timezone,
 ❯ Module.mergePulledState apps/web/src/features/sync/merge.ts:14:18
 ❯ apps/web/src/features/sync/pull.ts:38:22
 ❯ apps/web/src/lib/store/app-store.ts:30:81
 ❯ setState node_modules/zustand/esm/vanilla.mjs:5:55
 ❯ Object.setState apps/web/src/lib/store/app-store.ts:30:25
 ❯ Module.commit apps/web/src/lib/store/app-store.ts:57:26
 ❯ Module.pullFromCloud apps/web/src/features/sync/pull.ts:37:5

This error originated in "apps/web/src/app/app-shell.test.tsx" test file. It doesn't mean the error was thrown inside the file itself, but while it was running.
The latest test that might've caused the error is "pauses the queue and asks to sign in again when the API rejects the session". It might mean one of the following:
- The error was thrown, while Vitest was running this test.
- If the error occurred after the test had been completed, this was the last documented test before it was thrown.

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯
 Test Files  14 passed (14)
      Tests  157 passed (157)
     Errors  4 errors
   Start at  12:33:18
   Duration  10.52s (transform 1.89s, setup 1.59s, collect 5.92s, tests 10.77s, environment 8.88s, prepare 1.31s)


Error: TypeError: Cannot read properties of undefined (reading 'profile')
 ❯ Module.mergeLocalDataIntoCloud packages/shared/src/app-data.ts:213:16
 ❯ Module.mergePulledState apps/web/src/features/sync/merge.ts:14:18
 ❯ apps/web/src/features/sync/pull.ts:38:22
 ❯ apps/web/src/lib/store/app-store.ts:30:81
 ❯ setState node_modules/zustand/esm/vanilla.mjs:5:55
 ❯ Object.setState apps/web/src/lib/store/app-store.ts:30:25
 ❯ Module.commit apps/web/src/lib/store/app-store.ts:57:26
 ❯ Module.pullFromCloud apps/web/src/features/sync/pull.ts:37:5

This error originated in "apps/web/src/app/account-sync.test.tsx" test file. It doesn't mean the error was thrown inside the file itself, but while it was running.
The latest test that might've caused the error is "signs out to the guest data and removes the account's copy from a shared device". It might mean one of the following:
- The error was thrown, while Vitest was running this test.
- If the error occurred after the test had been completed, this was the last documented test before it was thrown.


Error: TypeError: Cannot read properties of undefined (reading 'profile')
 ❯ Module.mergeLocalDataIntoCloud packages/shared/src/app-data.ts:213:16
 ❯ Module.mergePulledState apps/web/src/features/sync/merge.ts:14:18
 ❯ apps/web/src/features/sync/pull.ts:38:22
 ❯ apps/web/src/lib/store/app-store.ts:30:81
 ❯ setState node_modules/zustand/esm/vanilla.mjs:5:55
 ❯ Object.setState apps/web/src/lib/store/app-store.ts:30:25
 ❯ Module.commit apps/web/src/lib/store/app-store.ts:57:26
 ❯ Module.pullFromCloud apps/web/src/features/sync/pull.ts:37:5

This error originated in "apps/web/src/app/account-sync.test.tsx" test file. It doesn't mean the error was thrown inside the file itself, but while it was running.
The latest test that might've caused the error is "can keep the account's copy on the device when signing out". It might mean one of the following:
- The error was thrown, while Vitest was running this test.
- If the error occurred after the test had been completed, this was the last documented test before it was thrown.


Error: TypeError: Cannot read properties of undefined (reading 'profile')
 ❯ Module.mergeLocalDataIntoCloud packages/shared/src/app-data.ts:213:16
 ❯ Module.mergePulledState apps/web/src/features/sync/merge.ts:14:18
 ❯ apps/web/src/features/sync/pull.ts:38:22
 ❯ apps/web/src/lib/store/app-store.ts:30:81
 ❯ setState node_modules/zustand/esm/vanilla.mjs:5:55
 ❯ Object.setState apps/web/src/lib/store/app-store.ts:30:25
 ❯ Module.commit apps/web/src/lib/store/app-store.ts:57:26
 ❯ Module.pullFromCloud apps/web/src/features/sync/pull.ts:37:5
 ❯ processTicksAndRejections node:internal/process/task_queues:105:5

This error originated in "apps/web/src/app/app-shell.test.tsx" test file. It doesn't mean the error was thrown inside the file itself, but while it was running.
The latest test that might've caused the error is "syncs the signed-in account's queue in batches instead of leaving items stuck in 'syncing'". It might mean one of the following:
- The error was thrown, while Vitest was running this test.
- If the error occurred after the test had been completed, this was the last documented test before it was thrown.


Error: TypeError: Cannot read properties of undefined (reading 'profile')
 ❯ Module.mergeLocalDataIntoCloud packages/shared/src/app-data.ts:213:16
 ❯ Module.mergePulledState apps/web/src/features/sync/merge.ts:14:18
 ❯ apps/web/src/features/sync/pull.ts:38:22
 ❯ apps/web/src/lib/store/app-store.ts:30:81
 ❯ setState node_modules/zustand/esm/vanilla.mjs:5:55
 ❯ Object.setState apps/web/src/lib/store/app-store.ts:30:25
 ❯ Module.commit apps/web/src/lib/store/app-store.ts:57:26
 ❯ Module.pullFromCloud apps/web/src/features/sync/pull.ts:37:5

This error originated in "apps/web/src/app/app-shell.test.tsx" test file. It doesn't mean the error was thrown inside the file itself, but while it was running.
The latest test that might've caused the error is "pauses the queue and asks to sign in again when the API rejects the session". It might mean one of the following:
- The error was thrown, while Vitest was running this test.
- If the error occurred after the test had been completed, this was the last documented test before it was thrown.

Error: Process completed with exit code 1.