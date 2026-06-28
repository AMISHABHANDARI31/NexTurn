import AxiosMockAdapter from 'axios-mock-adapter'
import { apiClient } from '../../../lib/http/apiClient'
import type { Notification, QueueSummary, Token } from '../types'

const queue: QueueSummary = { location:'Central Civic Hub', service:'Identity services', waiting:12, estimatedMinutes:18, confidenceLow:14, confidenceHigh:23, updatedAt:new Date().toISOString() }
const tokens: Token[] = [
  { id:'1', code:'A-142', customer:'Maya S.', service:'Identity renewal', waitMinutes:0, priority:'priority', status:'serving' },
  { id:'2', code:'A-143', customer:'Ravi K.', service:'Address update', waitMinutes:4, priority:'standard', status:'waiting' },
  { id:'3', code:'A-144', customer:'Noah P.', service:'Identity renewal', waitMinutes:9, priority:'standard', status:'waiting' }
]
const notifications: Notification[] = [
  { id:'1', title:'Your turn is approaching', body:'There are 2 people ahead of you at Central Civic Hub.', category:'queue', read:false, createdAt:new Date(Date.now()-4*60000).toISOString(), href:'/app/queue' },
  { id:'2', title:'Wait time improved', body:'Your expected wait is now 18 minutes.', category:'queue', read:false, createdAt:new Date(Date.now()-25*60000).toISOString(), href:'/app/queue' },
  { id:'3', title:'Profile verified', body:'Your contact details were successfully verified.', category:'account', read:true, createdAt:new Date(Date.now()-86400000).toISOString(), href:'/app/dashboard' }
]
export function installMocks() { const mock = new AxiosMockAdapter(apiClient, { delayResponse: 550 }); mock.onGet('/queue').reply(200, queue); mock.onGet('/tokens').reply(200, tokens); mock.onGet('/notifications').reply(200, notifications); mock.onPost('/tokens').reply(201, { code:'A-145', estimatedMinutes:22 }); mock.onAny().passThrough() }
