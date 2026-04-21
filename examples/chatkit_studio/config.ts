/**
 * Studio ChatKit demo configuration.
 *
 * Replace these values with a real Studio deployment before running the demo.
 */
export const STUDIO_CONFIG = {
  /**
   * Studio API base URL. In local development you can proxy `/studio`
   * to `/api/dip-studio/v1`.
   */
  baseUrl: '/studio',

  /** Studio digital human / agent id */
  agentId: 'caaa8c82-dff3-433a-9736-6b0c8452c695',

  /**
   * Direct browser demos usually need a user id header when your gateway
   * does not inject `x-user-id` automatically.
   */
  userId: 'studio-demo-user',

  /** Bearer token without the `Bearer ` prefix */
  token: 'ory_at_MvvfJfRVabMxPUrtaGnEfCpC5qJol53SdnnU6O3FEl8.vv1rLEje36nlsgDeUxe8mgfqtF39Rc10yVLU2FEDUFI',

  /** Optional assistant display name */
  assistantName: '合同分析员',
};
