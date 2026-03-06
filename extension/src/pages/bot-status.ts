// Bot Status Page — 봇 윈도우 안내 페이지의 상태 메시지 수신

type BotStep = 'searching' | 'browsing' | 'capturing' | 'done'

type BotStatusMessage = {
  type: 'BOT_STATUS_UPDATE'
  step: BotStep
  asin: string
  marketplace: string
}

const STEP_ORDER: BotStep[] = ['searching', 'browsing', 'capturing', 'done']

const statusCard = document.getElementById('statusCard') as HTMLElement
const stepIndicators = document.getElementById('stepIndicators') as HTMLElement
const idleState = document.getElementById('idleState') as HTMLElement
const statusAsin = document.getElementById('statusAsin') as HTMLElement
const statusMarketplace = document.getElementById('statusMarketplace') as HTMLElement
const stepElements = document.querySelectorAll<HTMLElement>('.bot-step')

const updateUI = (step: BotStep, asin: string, marketplace: string): void => {
  // Show status card + steps, hide idle
  statusCard.style.display = ''
  stepIndicators.style.display = ''
  idleState.style.display = 'none'

  // Update ASIN & marketplace
  statusAsin.textContent = asin
  statusMarketplace.textContent = marketplace

  // Update step indicators
  const currentIndex = STEP_ORDER.indexOf(step)
  stepElements.forEach((el) => {
    const elStep = el.dataset.step as BotStep
    const elIndex = STEP_ORDER.indexOf(elStep)

    el.classList.remove('bot-step--active', 'bot-step--done')
    if (elIndex < currentIndex) {
      el.classList.add('bot-step--done')
    } else if (elIndex === currentIndex) {
      el.classList.add('bot-step--active')
    }
  })

  // If done, reset to idle after 2s
  if (step === 'done') {
    setTimeout(() => {
      statusCard.style.display = 'none'
      stepIndicators.style.display = 'none'
      idleState.style.display = ''
    }, 2000)
  }
}

// Listen for status updates from service worker
chrome.runtime.onMessage.addListener((message: BotStatusMessage) => {
  if (message.type === 'BOT_STATUS_UPDATE') {
    updateUI(message.step, message.asin, message.marketplace)
  }
})
