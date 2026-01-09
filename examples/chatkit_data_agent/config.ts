/**
 * AISHU Data Agent API 配置
 */
export const DATA_AGENT_CONFIG = {
  /** 服务端基础地址,需包含 /api/agent-app/v1 前缀; 开发环境使用 Vite 代理的本地前缀可避免 CORS */
  baseUrl: '/data-agent',
  /** Agent Key */
  agentKey: '01KATFEH4RDWDHTY5ZJSGRENBE',
  /** Token (不带 Bearer 前缀) */
  token: 'ory_at_eVBfvnUHMHe1JXwVFhln3BVGlVJm13GwzVnq08C9fDk.Q5FWJZNPVVq4f8ZxZedwfbYfyUScF9hpPF6q1gNARK8',
  /** 业务域 */
  businessDomain: 'bd_public'
};

/**
 * 使用说明:
 * - baseUrl 请替换为你的 Data Agent 服务网关地址
 * - agentKey 是 Agent 的唯一标识符
 * - 需要保证 bearerToken 中包含 Bearer 前缀
 */
