const RAILWAY_API_URL = 'https://backboard.railway.com/graphql/v2'

type ServiceConfig = {
  name: string
  serviceId: string
  healthUrl: string
}

const getServiceConfigs = (): ServiceConfig[] => {
  const configs: ServiceConfig[] = []

  const crawlId = process.env['RAILWAY_CRAWL_SERVICE_ID']
  const crawlHealth = process.env['CRAWL_HEALTH_URL']
  if (crawlId && crawlHealth) {
    configs.push({ name: 'sentinel-crawl', serviceId: crawlId, healthUrl: crawlHealth })
  }

  const brId = process.env['RAILWAY_BR_SERVICE_ID']
  const brHealth = process.env['BR_HEALTH_URL']
  if (brId && brHealth) {
    configs.push({ name: 'sentinel-br', serviceId: brId, healthUrl: brHealth })
  }

  return configs
}

const checkHealth = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!response.ok) return false
    const data = (await response.json()) as { status?: string }
    return data.status === 'ok'
  } catch {
    return false
  }
}

const restartService = async (serviceId: string): Promise<boolean> => {
  const token = process.env['RAILWAY_API_TOKEN']
  const envId = process.env['RAILWAY_ENV_ID']
  if (!token || !envId) return false

  try {
    const response = await fetch(RAILWAY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'mutation ($serviceId: String!, $environmentId: String!) { serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId) }',
        variables: { serviceId, environmentId: envId },
      }),
    })
    if (!response.ok) return false
    const data = (await response.json()) as { data?: { serviceInstanceRedeploy?: boolean } }
    return data.data?.serviceInstanceRedeploy === true
  } catch {
    return false
  }
}

const getServiceStatus = async (serviceId: string): Promise<string | null> => {
  const token = process.env['RAILWAY_API_TOKEN']
  const envId = process.env['RAILWAY_ENV_ID']
  if (!token || !envId) return null

  try {
    const response = await fetch(RAILWAY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'query ($serviceId: String!, $environmentId: String!) { deployments(first: 1, input: { serviceId: $serviceId, environmentId: $environmentId }) { edges { node { status } } } }',
        variables: { serviceId, environmentId: envId },
      }),
    })
    if (!response.ok) return null
    const data = (await response.json()) as {
      data?: { deployments?: { edges?: { node: { status: string } }[] } }
    }
    return data.data?.deployments?.edges?.[0]?.node?.status ?? null
  } catch {
    return null
  }
}

const notifyChat = async (message: string): Promise<void> => {
  const webhookUrl = process.env['GOOGLE_CHAT_WEBHOOK_URL']
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ text: message }),
    })
  } catch {
    // silently fail
  }
}

export { getServiceConfigs, checkHealth, restartService, getServiceStatus, notifyChat }
export type { ServiceConfig }
