import express, { Request, Response } from 'express'
import cors from 'cors'
import {
  Substation,
  SwitchgearCell,
  VoltageClass,
  SubstationStatus,
  BreakerType,
  CellStatus
} from './types'
import {
  readSubstations,
  writeSubstations,
  readCells,
  writeCells
} from './storage'

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

const VALID_VOLTAGES: VoltageClass[] = ['110/10 кВ', '35/10 кВ', '10/0.4 кВ']
const VALID_SUB_STATUSES: SubstationStatus[] = ['в роботі', 'плановий ремонт', 'аварійний вивід']
const VALID_BREAKERS: BreakerType[] = ['вакуумний', 'елегазовий', 'масляний']
const VALID_CELL_STATUSES: CellStatus[] = ['увімкнено', 'вимкнено', 'заземлено']

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = Date.parse(value)
  return !Number.isNaN(parsed)
}

function validateSubstation(body: Partial<Substation>): string | null {
  const currentYear = new Date().getFullYear()

  if (!body.code || typeof body.code !== 'string' || !body.code.trim()) {
    return 'Поле code (диспетчерський шифр) є обовʼязковим'
  }
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return 'Поле name (назва обʼєкта) є обовʼязковим'
  }
  if (!body.location || typeof body.location !== 'string' || !body.location.trim()) {
    return 'Поле location (адреса) є обовʼязковим'
  }
  if (!body.voltageClass || !VALID_VOLTAGES.includes(body.voltageClass)) {
    return 'Некоректний клас напруги'
  }
  if (!body.status || !VALID_SUB_STATUSES.includes(body.status)) {
    return 'Некоректний експлуатаційний статус'
  }
  if (typeof body.totalPowerKva !== 'number' || Number.isNaN(body.totalPowerKva) || body.totalPowerKva <= 0) {
    return 'Потужність totalPowerKva має бути додатним числом'
  }
  if (
    typeof body.commissioningYear !== 'number' ||
    !Number.isInteger(body.commissioningYear) ||
    body.commissioningYear < 1950 ||
    body.commissioningYear > currentYear
  ) {
    return `Рік введення в експлуатацію має бути від 1950 до ${currentYear}`
  }

  return null
}

app.get('/api/substations', async (req: Request, res: Response) => {
  const { search, voltageClass, status, sort, order } = req.query
  let list = await readSubstations()

  if (typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase()
    list = list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    )
  }

  if (typeof voltageClass === 'string' && voltageClass) {
    list = list.filter((s) => s.voltageClass === voltageClass)
  }

  if (typeof status === 'string' && status) {
    list = list.filter((s) => s.status === status)
  }

  if (sort === 'name' || sort === 'totalPowerKva' || sort === 'commissioningYear') {
    const dir = order === 'desc' ? -1 : 1
    list.sort((a, b) => {
      if (sort === 'name') {
        return a.name.localeCompare(b.name, 'uk') * dir
      }
      return (a[sort] - b[sort]) * dir
    })
  }

  res.json(list)
})

app.get('/api/substations/:id', async (req: Request, res: Response) => {
  const list = await readSubstations()
  const item = list.find((s) => s.id === req.params.id)

  if (!item) {
    res.status(404).json({ message: 'Підстанцію не знайдено' })
    return
  }

  res.json(item)
})

app.post('/api/substations', async (req: Request, res: Response) => {
  const body = req.body ?? {}
  const error = validateSubstation(body)
  if (error) {
    res.status(400).json({ message: error })
    return
  }

  const list = await readSubstations()
  const created: Substation = {
    id: `sub-${Date.now()}`,
    code: body.code.trim(),
    name: body.name.trim(),
    location: body.location.trim(),
    voltageClass: body.voltageClass,
    status: body.status,
    totalPowerKva: body.totalPowerKva,
    commissioningYear: body.commissioningYear,
    description: typeof body.description === 'string' ? body.description.trim() : ''
  }

  list.push(created)
  await writeSubstations(list)
  res.status(201).json(created)
})

app.put('/api/substations/:id', async (req: Request, res: Response) => {
  const list = await readSubstations()
  const index = list.findIndex((s) => s.id === req.params.id)

  if (index === -1) {
    res.status(404).json({ message: 'Підстанцію не знайдено' })
    return
  }

  const existing = list[index]
  const body = req.body ?? {}

  const updated: Substation = {
    id: existing.id,
    code: body.code !== undefined ? body.code : existing.code,
    name: body.name !== undefined ? body.name : existing.name,
    location: body.location !== undefined ? body.location : existing.location,
    voltageClass: body.voltageClass !== undefined ? body.voltageClass : existing.voltageClass,
    status: body.status !== undefined ? body.status : existing.status,
    totalPowerKva: body.totalPowerKva !== undefined ? body.totalPowerKva : existing.totalPowerKva,
    commissioningYear: body.commissioningYear !== undefined ? body.commissioningYear : existing.commissioningYear,
    description: body.description !== undefined ? body.description : existing.description
  }

  const error = validateSubstation(updated)
  if (error) {
    res.status(400).json({ message: error })
    return
  }

  updated.code = updated.code.trim()
  updated.name = updated.name.trim()
  updated.location = updated.location.trim()
  updated.description = typeof updated.description === 'string' ? updated.description.trim() : ''

  list[index] = updated
  await writeSubstations(list)
  res.json(updated)
})

app.delete('/api/substations/:id', async (req: Request, res: Response) => {
  const list = await readSubstations()
  const index = list.findIndex((s) => s.id === req.params.id)

  if (index === -1) {
    res.status(404).json({ message: 'Підстанцію не знайдено' })
    return
  }

  list.splice(index, 1)
  await writeSubstations(list)

  const cells = await readCells()
  await writeCells(cells.filter((c) => c.substationId !== req.params.id))

  res.json({ message: 'Підстанцію та її комірки видалено' })
})

app.get('/api/substations/:id/cells', async (req: Request, res: Response) => {
  const list = await readSubstations()
  if (!list.some((s) => s.id === req.params.id)) {
    res.status(404).json({ message: 'Підстанцію не знайдено' })
    return
  }

  const cells = await readCells()
  res.json(cells.filter((c) => c.substationId === req.params.id))
})

app.post('/api/substations/:id/cells', async (req: Request, res: Response) => {
  const list = await readSubstations()
  if (!list.some((s) => s.id === req.params.id)) {
    res.status(404).json({ message: 'Підстанцію не знайдено' })
    return
  }

  const body = req.body ?? {}
  const { cellNumber, feederName, breakerType, currentLoadAmp, status, lastInspectionDate } = body

  if (!cellNumber || typeof cellNumber !== 'string' || !cellNumber.trim()) {
    res.status(400).json({ message: 'Вкажіть диспетчерський номер комірки' })
    return
  }
  if (!feederName || typeof feederName !== 'string' || !feederName.trim()) {
    res.status(400).json({ message: 'Вкажіть найменування фідера' })
    return
  }
  if (!VALID_BREAKERS.includes(breakerType)) {
    res.status(400).json({ message: 'Некоректний тип вимикача' })
    return
  }
  if (typeof currentLoadAmp !== 'number' || Number.isNaN(currentLoadAmp) || currentLoadAmp < 0) {
    res.status(400).json({ message: 'Струмове навантаження має бути числом >= 0' })
    return
  }
  if (!VALID_CELL_STATUSES.includes(status)) {
    res.status(400).json({ message: 'Некоректний стан комутаційного апарата' })
    return
  }

  let inspectionDate = new Date().toISOString().slice(0, 10)
  if (lastInspectionDate !== undefined && lastInspectionDate !== '') {
    if (typeof lastInspectionDate !== 'string' || !isValidDateString(lastInspectionDate.trim())) {
      res.status(400).json({ message: 'Дата огляду має бути у форматі YYYY-MM-DD' })
      return
    }
    inspectionDate = lastInspectionDate.trim()
  }

  const cells = await readCells()
  const created: SwitchgearCell = {
    id: `cell-${Date.now()}`,
    substationId: req.params.id as string,
    cellNumber: cellNumber.trim(),
    feederName: feederName.trim(),
    breakerType,
    currentLoadAmp,
    status,
    lastInspectionDate: inspectionDate
  }

  cells.push(created)
  await writeCells(cells)
  res.status(201).json(created)
})

app.delete('/api/cells/:cellId', async (req: Request, res: Response) => {
  const cells = await readCells()
  const index = cells.findIndex((c) => c.id === req.params.cellId)

  if (index === -1) {
    res.status(404).json({ message: 'Комірку не знайдено' })
    return
  }

  cells.splice(index, 1)
  await writeCells(cells)
  res.json({ message: 'Комірку видалено' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})