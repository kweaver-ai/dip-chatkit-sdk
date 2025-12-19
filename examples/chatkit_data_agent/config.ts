/**
 * AISHU Data Agent API 配置
 */
export const DATA_AGENT_CONFIG = {
  /** 服务端基础地址,需包含 /api/agent-app/v1 前缀; 开发环境使用 Vite 代理的本地前缀可避免 CORS */
  baseUrl: '/data-agent',
  /** Agent ID */
  agentId: '01KAZKS30H0X0D8Z8K25VKSJ98',
  /** Bearer Token,请确认包含 Bearer 前缀 */
  bearerToken:
    'Bearer ory_at_OFWoNBLS70BmOZoclwslxAKPZl2enQ45f-jPrMAh3r8.kYSifkaVIo8ttSZTiaaRCE7vulSht-uoWuq-ZykRT7o',
  /** 业务域 */
  businessDomain: 'bd_public'
};

/**
 * 使用说明:
 * - baseUrl 请替换为你的 Data Agent 服务网关地址
 * - 需要保证 bearerToken 中包含 Bearer 前缀
 */
