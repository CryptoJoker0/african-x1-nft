---
    name: Admin server function auth pattern
    description: Prevents re-introducing an unauthenticated-admin-action bug in TanStack Start server functions.
    ---

    Admin-only `createServerFn` handlers must derive the caller's identity from a verified session (e.g. `requireSupabaseAuth` middleware reading `context.userId` from a real JWT), never from a client-supplied field like `requesterId` in the request body.

    **Why:** a body field is just claimed data — anyone can call the server function directly (bypassing the UI) and pass any user ID, including a known admin's ID, and pass a naive "does this ID have the admin role" check with no proof they are that user. This was found and fixed in the AFRICAN X1 NFT marketplace admin actions (approve/reject applications, remove/restore listings, set collection flags) on 2026-07-14.

    **How to apply:** any new admin/privileged server function should add `.middleware([requireSupabaseAuth])` and read `context.userId`, then check that ID's role server-side. Reject any design where a privilege-check ID comes from `data`/request body instead of the verified session.
    