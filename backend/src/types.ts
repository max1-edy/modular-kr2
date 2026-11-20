export type VoltageClass = '110/10 кВ' | '35/10 кВ' | '10/0.4 кВ'
export type SubstationStatus = 'в роботі' | 'плановий ремонт' | 'аварійний вивід'

export interface Substation {
  id: string
  code: string
  name: string
  location: string
  voltageClass: VoltageClass
  status: SubstationStatus
  totalPowerKva: number
  commissioningYear: number
  description: string
}

export type BreakerType = 'вакуумний' | 'елегазовий' | 'масляний'
export type CellStatus = 'увімкнено' | 'вимкнено' | 'заземлено'

export interface SwitchgearCell {
  id: string
  substationId: string
  cellNumber: string
  feederName: string
  breakerType: BreakerType
  currentLoadAmp: number
  status: CellStatus
  lastInspectionDate: string
}