import { config } from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

for (const path of ['.env.local', '.env', 'local.env']) {
  config({ path, override: false });
}

const DELETE_FLAG = '--confirm-delete-anonymous-users';
const DRY_RUN_FLAG = '--dry-run';
const OLDER_THAN_PREFIX = '--older-than-days=';

function initializeAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp();
  }

  const serviceAccount = process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (!serviceAccount) {
    throw new Error(
      'Missing Firebase admin credentials. Set FIREBASE_ADMIN_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS.',
    );
  }

  return initializeApp({
    credential: cert(JSON.parse(serviceAccount)),
  });
}

function getOlderThanCutoff() {
  const arg = process.argv.find(value => value.startsWith(OLDER_THAN_PREFIX));
  if (!arg) return null;

  const days = Number(arg.slice(OLDER_THAN_PREFIX.length));
  if (!Number.isFinite(days) || days < 0) {
    throw new Error(`${OLDER_THAN_PREFIX} must be a positive number.`);
  }

  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function isAnonymousUser(user, olderThanCutoff) {
  const hasProvider = user.providerData.length > 0;
  if (hasProvider) return false;

  if (!olderThanCutoff) return true;

  const createdAt = new Date(user.metadata.creationTime).getTime();
  return Number.isFinite(createdAt) && createdAt < olderThanCutoff;
}

async function collectAnonymousUserIds(auth, olderThanCutoff) {
  const anonymousUserIds = [];
  let pageToken;

  do {
    const result = await auth.listUsers(1000, pageToken);
    for (const user of result.users) {
      if (isAnonymousUser(user, olderThanCutoff)) {
        anonymousUserIds.push(user.uid);
      }
    }
    pageToken = result.pageToken;
  } while (pageToken);

  return anonymousUserIds;
}

async function deleteInBatches(auth, userIds) {
  let deleted = 0;
  let failed = 0;

  for (let index = 0; index < userIds.length; index += 1000) {
    const batch = userIds.slice(index, index + 1000);
    const result = await auth.deleteUsers(batch);
    deleted += result.successCount;
    failed += result.failureCount;

    if (result.failureCount > 0) {
      console.error('Batch delete errors:', result.errors);
    }
  }

  return { deleted, failed };
}

async function main() {
  const shouldDelete = process.argv.includes(DELETE_FLAG);
  const isDryRun = process.argv.includes(DRY_RUN_FLAG) || !shouldDelete;
  const olderThanCutoff = getOlderThanCutoff();

  initializeAdminApp();

  const auth = getAuth();
  const userIds = await collectAnonymousUserIds(auth, olderThanCutoff);

  console.log(`Anonymous users found: ${userIds.length}`);

  if (userIds.length === 0) {
    return;
  }

  if (isDryRun) {
    console.log('Dry run only. Re-run with --confirm-delete-anonymous-users to delete them.');
    console.log(`Sample UIDs: ${userIds.slice(0, 10).join(', ')}`);
    return;
  }

  const { deleted, failed } = await deleteInBatches(auth, userIds);
  console.log(`Deleted anonymous users: ${deleted}`);
  console.log(`Failed deletions: ${failed}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
