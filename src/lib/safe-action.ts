import { createSafeActionClient } from 'next-safe-action';

// This is our action client.
// It can be used to create safe server actions.
const actionClient = createSafeActionClient();

export const action = actionClient;
