import { notify } from '../src/server/services/notificationService';
import { NotificationRecipientType, NotificationType } from '../src/server/db/documents';

async function main() {
  // Get parameters from environment variables or use defaults for testing
  const tenantId = process.env.TEST_TENANT_ID || 'test-tenant-id';
  const claimId = process.env.TEST_CLAIM_ID || 'test-claim-id';
  const claimNumber = process.env.TEST_CLAIM_NUMBER || 'RMB-2026-000001';
  const recipientType = (process.env.TEST_RECIPIENT_TYPE as NotificationRecipientType) || 'tenantAdmin';
  const recipientId = process.env.TEST_RECIPIENT_ID || 'test-admin-id';
  const type = (process.env.TEST_NOTIFICATION_TYPE as NotificationType) || 'progress_update_sent';
  const title = process.env.TEST_NOTIFICATION_TITLE || 'Test Notification';
  const body = process.env.TEST_NOTIFICATION_BODY || 'This is a test notification sent from the test script.';

  const input = {
    tenantId,
    claimId,
    claimNumber,
    recipientType,
    recipientId,
    type,
    title,
    body,
  };

  try {
    await notify(input);
    console.log('Test notification sent successfully!');
    console.log('Input:', input);
  } catch (error) {
    console.error('Failed to send test notification:', error);
    process.exit(1);
  }
}

main();