/**
 * AISHU Data Agent API 配置
 */
export const DATA_AGENT_CONFIG = {
  /** 服务端基础地址,需包含 /api/agent-app/v1 前缀; 开发环境使用 Vite 代理的本地前缀可避免 CORS */
  baseUrl: '/data-agent',
  /** Agent Key */
  agentKey: '01KATFEH4RDWDHTY5ZJSGRENBE',
  /** Token (不带 Bearer 前缀) */
  token: 'ory_at_5Ni0qp43vsD3UNsQsFllX0A5QKonBfn1cBIxcpl5xqw.iWcipxtVcu-tbbUi10cI8o9d4DI3EZiDqbD9jzw69yY',
  /** 业务域 */
  businessDomain: 'bd_public'
};

/**
 * 使用说明:
 * - baseUrl 请替换为你的 Data Agent 服务网关地址
 * - agentKey 是 Agent 的唯一标识符
 * - 需要保证 bearerToken 中包含 Bearer 前缀
 */
