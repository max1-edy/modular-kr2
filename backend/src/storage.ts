import fs from 'fs/promises'
import path from 'path'
import { Substation, SwitchgearCell } from './types'

const SUBSTATIONS_PATH = path.join(__dirname, '../data/substations.json')
const CELLS_PATH = path.join(__dirname, '../data/cells.json')

export async function readSubstations(): Promise<Substation[]> {
  try {
    const raw = await fs.readFile(SUBSTATIONS_PATH, 'utf-8')
    return JSON.parse(raw) as Substation[]
  } catch {
    return []
  }
}

export async function writeSubstations(data: Substation[]): Promise<void> {
  await fs.writeFile(SUBSTATIONS_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

export async function readCells(): Promise<SwitchgearCell[]> {
  try {
    const raw = await fs.readFile(CELLS_PATH, 'utf-8')
    return JSON.parse(raw) as SwitchgearCell[]
  } catch {
    return []
  }
}

export async function writeCells(data: SwitchgearCell[]): Promise<void> {
  await fs.writeFile(CELLS_PATH, JSON.stringify(data, null, 2), 'utf-8')
}