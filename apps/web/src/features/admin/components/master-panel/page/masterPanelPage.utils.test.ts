import { describe, expect, it } from 'vitest'

import {
  MASTER_PANEL_ITEMS,
  getDefaultMasterPanelItem,
} from '../MasterPanelSidebar'

import { RIGHT_PANEL } from './masterPanelPage.constants'
import { isMasterTab } from './masterPanelPage.utils'

describe('master panel agents tab wiring', () => {
  it('recognizes agents as a valid master tab', () => {
    expect(isMasterTab('agents')).toBe(true)
  })

  it('exposes agents overview in sidebar items and default tab resolution', () => {
    const agentItem = MASTER_PANEL_ITEMS.find((item) => item.id === 'agents.overview')

    expect(agentItem).toMatchObject({
      id: 'agents.overview',
      tab: 'agents',
      label: 'Карта агентів',
    })
    expect(getDefaultMasterPanelItem('agents')?.id).toBe('agents.overview')
  })

  it('keeps right panel guidance for agents tab available', () => {
    expect(RIGHT_PANEL.agents).toHaveLength(3)
    expect(RIGHT_PANEL.agents[0]?.title).toBe('Єдиний реєстр')
  })
})
