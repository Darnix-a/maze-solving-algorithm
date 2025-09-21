import type { Grid, Cell, Point } from '../types/grid'
import { CellType } from '../types/grid'
import { isInBounds } from './mathUtils'

/**
 * Grid utility functions for creating and manipulating grids
 */

/**
 * Create an empty grid with the specified dimensions
 */
export function createEmptyGrid(width: number, height: number, start?: Point, goal?: Point): Grid {
  const cells: Cell[][] = []
  
  for (let y = 0; y < height; y++) {
    cells[y] = []
    for (let x = 0; x < width; x++) {
      cells[y][x] = {
        type: CellType.Empty,
        position: { x, y },
      }
    }
  }

  // Set default start and goal positions
  const defaultStart = start || { x: 1, y: 1 }
  const defaultGoal = goal || { x: width - 2, y: height - 2 }

  // Ensure start and goal are within bounds
  const validStart = {
    x: Math.max(0, Math.min(defaultStart.x, width - 1)),
    y: Math.max(0, Math.min(defaultStart.y, height - 1)),
  }
  const validGoal = {
    x: Math.max(0, Math.min(defaultGoal.x, width - 1)),
    y: Math.max(0, Math.min(defaultGoal.y, height - 1)),
  }

  // Set start and goal cells
  if (isInBounds(validStart, width, height)) {
    cells[validStart.y][validStart.x].type = CellType.Start
  }
  if (isInBounds(validGoal, width, height)) {
    cells[validGoal.y][validGoal.x].type = CellType.Goal
  }

  return {
    width,
    height,
    cells,
    start: validStart,
    goal: validGoal,
  }
}

/**
 * Creates a new grid (alias for createEmptyGrid for compatibility)
 */
export function createGrid(width: number, height: number, start?: Point, goal?: Point): Grid {
  return createEmptyGrid(width, height, start, goal)
}

/**
 * Updates start and goal positions in a grid
 */
export function updateStartGoal(grid: Grid, newStart: Point, newGoal: Point): Grid {
  const newGrid = cloneGrid(grid)
  
  // Clear old start/goal cells
  if (newGrid.cells[newGrid.start.y] && newGrid.cells[newGrid.start.y][newGrid.start.x]) {
    newGrid.cells[newGrid.start.y][newGrid.start.x].type = CellType.Empty
  }
  if (newGrid.cells[newGrid.goal.y] && newGrid.cells[newGrid.goal.y][newGrid.goal.x]) {
    newGrid.cells[newGrid.goal.y][newGrid.goal.x].type = CellType.Empty
  }
  
  // Set new start/goal
  newGrid.start = { ...newStart }
  newGrid.goal = { ...newGoal }
  
  // Update cell types
  if (isInBounds(newStart, newGrid.width, newGrid.height)) {
    newGrid.cells[newStart.y][newStart.x].type = CellType.Start
  }
  if (isInBounds(newGoal, newGrid.width, newGrid.height)) {
    newGrid.cells[newGoal.y][newGoal.x].type = CellType.Goal
  }
  
  return newGrid
}

/**
 * Get a cell from the grid at the specified point
 */
export function getCell(grid: Grid, point: Point): Cell | null {
  if (!isInBounds(point, grid.width, grid.height)) {
    return null
  }
  return grid.cells[point.y][point.x]
}

/**
 * Set a cell type at the specified point
 */
export function setCell(grid: Grid, point: Point, type: CellType): boolean {
  if (!isInBounds(point, grid.width, grid.height)) {
    return false
  }
  
  grid.cells[point.y][point.x].type = type
  
  // Update start/goal references
  if (type === CellType.Start) {
    grid.start = { ...point }
  } else if (type === CellType.Goal) {
    grid.goal = { ...point }
  }
  
  return true
}

/**
 * Check if a cell is walkable (not a wall)
 */
export function isWalkable(grid: Grid, point: Point): boolean {
  const cell = getCell(grid, point)
  return cell !== null && cell.type !== CellType.Wall
}

/**
 * Get all walkable neighbors of a point
 */
export function getWalkableNeighbors(grid: Grid, point: Point): Point[] {
  const neighbors = [
    { x: point.x, y: point.y - 1 }, // up
    { x: point.x, y: point.y + 1 }, // down
    { x: point.x - 1, y: point.y }, // left
    { x: point.x + 1, y: point.y }, // right
  ]
  
  return neighbors.filter(neighbor => isWalkable(grid, neighbor))
}

/**
 * Clear all visualization states from the grid
 */
export function clearVisualization(grid: Grid): void {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cells[y][x]
      cell.isPath = false
      cell.isExplored = false
      cell.isFrontier = false
      cell.gradientValue = undefined
    }
  }
}

/**
 * Create a deep copy of a grid
 */
export function cloneGrid(grid: Grid): Grid {
  const cells: Cell[][] = []
  
  for (let y = 0; y < grid.height; y++) {
    cells[y] = []
    for (let x = 0; x < grid.width; x++) {
      cells[y][x] = {
        ...grid.cells[y][x],
        position: { ...grid.cells[y][x].position },
      }
    }
  }

  return {
    width: grid.width,
    height: grid.height,
    cells,
    start: { ...grid.start },
    goal: { ...grid.goal },
  }
}

/**
 * Count cells of a specific type
 */
export function countCells(grid: Grid, type: CellType): number {
  let count = 0
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.cells[y][x].type === type) {
        count++
      }
    }
  }
  return count
}

/**
 * Check if there's a clear path between start and goal (basic connectivity check)
 */
export function hasPath(grid: Grid): boolean {
  const visited = new Set<string>()
  const queue = [grid.start]
  visited.add(`${grid.start.x},${grid.start.y}`)

  while (queue.length > 0) {
    const current = queue.shift()!
    
    if (current.x === grid.goal.x && current.y === grid.goal.y) {
      return true
    }

    const neighbors = getWalkableNeighbors(grid, current)
    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`
      if (!visited.has(key)) {
        visited.add(key)
        queue.push(neighbor)
      }
    }
  }

  return false
}

/**
 * Calculate the obstacle density of the grid (percentage of walls)
 */
export function calculateObstacleDensity(grid: Grid): number {
  const totalCells = grid.width * grid.height
  const wallCells = countCells(grid, CellType.Wall)
  return wallCells / totalCells
}

/**
 * Get all empty cells in the grid
 */
export function getEmptyCells(grid: Grid): Point[] {
  const emptyCells: Point[] = []
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.cells[y][x].type === CellType.Empty) {
        emptyCells.push({ x, y })
      }
    }
  }
  return emptyCells
}

/**
 * Convert a grid to a simple 2D array for algorithms that don't need full cell data
 */
export function gridToArray(grid: Grid): number[][] {
  const array: number[][] = []
  for (let y = 0; y < grid.height; y++) {
    array[y] = []
    for (let x = 0; x < grid.width; x++) {
      // 0 = walkable, 1 = wall
      array[y][x] = grid.cells[y][x].type === CellType.Wall ? 1 : 0
    }
  }
  return array
}