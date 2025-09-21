import type { Grid, Point, MazeGenerationOptions } from '../types/grid'
import { CellType } from '../types/grid'
import { createEmptyGrid, setCell } from '../utils/gridUtils'
import { isInBounds } from '../utils/mathUtils'
import { SeededRNG, createRNG } from '../utils/seededRng'

/**
 * Recursive Backtracker Maze Generation Algorithm
 * 
 * This algorithm generates perfect mazes (mazes with exactly one path between any two points)
 * using a depth-first search approach with backtracking.
 * 
 * Algorithm:
 * 1. Start with a grid full of walls
 * 2. Choose a starting cell and mark it as part of the maze
 * 3. While there are unvisited cells:
 *    - If current cell has unvisited neighbors:
 *      - Choose random unvisited neighbor
 *      - Remove wall between current cell and neighbor
 *      - Push current cell to stack
 *      - Make neighbor the current cell
 *    - Else if stack is not empty:
 *      - Pop cell from stack and make it current
 */

interface BacktrackerCell {
  x: number
  y: number
  visited: boolean
}

export function generateRecursiveBacktrackerMaze(options: MazeGenerationOptions): Grid {
  const { width, height, seed } = options
  const rng = createRNG(seed)
  
  // Ensure odd dimensions for proper maze structure
  const mazeWidth = width % 2 === 0 ? width - 1 : width
  const mazeHeight = height % 2 === 0 ? height - 1 : height
  
  // Initialize grid filled with walls
  const grid = createWallGrid(mazeWidth, mazeHeight)
  
  // Create visited tracking grid (only for odd coordinates - actual maze cells)
  const visited: boolean[][] = []
  for (let y = 0; y < mazeHeight; y += 2) {
    const row: boolean[] = []
    for (let x = 0; x < mazeWidth; x += 2) {
      row.push(false)
    }
    visited.push(row)
  }
  
  // Start from top-left maze cell (1, 1)
  const startX = 1
  const startY = 1
  const stack: Point[] = []
  let currentX = startX
  let currentY = startY
  
  // Mark starting cell as visited and empty
  visited[Math.floor(currentY / 2)][Math.floor(currentX / 2)] = true
  setCell(grid, { x: currentX, y: currentY }, CellType.Empty)
  
  let totalCells = Math.floor(mazeWidth / 2) * Math.floor(mazeHeight / 2)
  let visitedCount = 1
  
  while (visitedCount < totalCells) {
    const neighbors = getUnvisitedNeighbors(currentX, currentY, visited, mazeWidth, mazeHeight)
    
    if (neighbors.length > 0) {
      // Choose random unvisited neighbor
      const neighbor = rng.choice(neighbors)
      
      // Remove wall between current cell and neighbor
      const wallX = (currentX + neighbor.x) / 2
      const wallY = (currentY + neighbor.y) / 2
      setCell(grid, { x: wallX, y: wallY }, CellType.Empty)
      setCell(grid, neighbor, CellType.Empty)
      
      // Mark neighbor as visited
      visited[Math.floor(neighbor.y / 2)][Math.floor(neighbor.x / 2)] = true
      visitedCount++
      
      // Push current cell to stack
      stack.push({ x: currentX, y: currentY })
      
      // Move to neighbor
      currentX = neighbor.x
      currentY = neighbor.y
    } else if (stack.length > 0) {
      // Backtrack
      const cell = stack.pop()!
      currentX = cell.x
      currentY = cell.y
    }
  }
  
  // Place start and goal in open areas
  placeStartAndGoal(grid, rng)
  
  return grid
}

function createWallGrid(width: number, height: number): Grid {
  const grid = createEmptyGrid(width, height)
  
  // Fill entire grid with walls initially
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      setCell(grid, { x, y }, CellType.Wall)
    }
  }
  
  return grid
}

function getUnvisitedNeighbors(
  x: number, 
  y: number, 
  visited: boolean[][], 
  width: number, 
  height: number
): Point[] {
  const neighbors: Point[] = []
  
  // Check all four directions (2 cells away for maze structure)
  const directions = [
    { x: 0, y: -2 }, // up
    { x: 2, y: 0 },  // right
    { x: 0, y: 2 },  // down
    { x: -2, y: 0 }  // left
  ]
  
  for (const dir of directions) {
    const nx = x + dir.x
    const ny = y + dir.y
    
    // Check bounds and if neighbor is unvisited
    if (nx >= 1 && nx < width - 1 && ny >= 1 && ny < height - 1) {
      const visitedX = Math.floor(nx / 2)
      const visitedY = Math.floor(ny / 2)
      
      if (visitedX < visited[0].length && visitedY < visited.length && !visited[visitedY][visitedX]) {
        neighbors.push({ x: nx, y: ny })
      }
    }
  }
  
  return neighbors
}

function placeStartAndGoal(grid: Grid, rng: SeededRNG): void {
  const emptyCells: Point[] = []
  
  // Find all empty cells
  for (let y = 1; y < grid.height - 1; y++) {
    for (let x = 1; x < grid.width - 1; x++) {
      if (grid.cells[y][x].type === CellType.Empty) {
        emptyCells.push({ x, y })
      }
    }
  }
  
  if (emptyCells.length < 2) {
    // Fallback: place start and goal at edges
    setCell(grid, { x: 1, y: 1 }, CellType.Start)
    setCell(grid, { x: grid.width - 2, y: grid.height - 2 }, CellType.Goal)
    grid.start = { x: 1, y: 1 }
    grid.goal = { x: grid.width - 2, y: grid.height - 2 }
    return
  }
  
  // Choose two random empty cells for start and goal
  const startCell = rng.choice(emptyCells)
  let goalCell = rng.choice(emptyCells)
  
  // Ensure start and goal are different
  while (goalCell.x === startCell.x && goalCell.y === startCell.y && emptyCells.length > 1) {
    goalCell = rng.choice(emptyCells)
  }
  
  setCell(grid, startCell, CellType.Start)
  setCell(grid, goalCell, CellType.Goal)
  
  grid.start = startCell
  grid.goal = goalCell
}