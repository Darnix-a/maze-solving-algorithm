import type { Grid, Point, MazeGenerationOptions } from '../types/grid'
import { CellType } from '../types/grid'
import { createEmptyGrid, setCell, hasPath } from '../utils/gridUtils'
import { isInBounds, euclideanDistance } from '../utils/mathUtils'
import { createRNG } from '../utils/seededRng'
/**
 * Random Obstacles Maze Generation Algorithm
 * 
 * This algorithm generates mazes by randomly placing obstacles (walls) throughout
 * an initially empty grid, with a specified density. Unlike perfect mazes, this
 * can create multiple paths and dead ends, making it ideal for testing pathfinding
 * algorithms on different maze topologies.
 * 
 * Algorithm:
 * 1. Start with an empty grid
 * 2. Place start and goal points far apart
 * 3. Randomly place obstacles according to density parameter
 * 4. Ensure connectivity by checking path exists between start and goal
 * 5. If no path exists, remove some obstacles until path is found
 */

export function generateRandomObstaclesMaze(options: MazeGenerationOptions): Grid {
  const { width, height, seed, obstaclesDensity = 0.3 } = options
  const rng = createRNG(seed)
  
  // Clamp density between 0.1 and 0.6 to ensure reasonable mazes
  const density = Math.max(0.1, Math.min(0.6, obstaclesDensity))
  
  // Create empty grid
  const grid = createEmptyGrid(width, height)
  
  // Place start and goal points strategically (far apart)
  placeStartAndGoalStrategically(grid, rng)
  
  // Calculate total cells that can be obstacles (excluding start and goal)
  const totalCells = width * height
  const reservedCells = 2 // start and goal
  const availableCells = totalCells - reservedCells
  const targetObstacles = Math.floor(availableCells * density)
  
  // Create list of all possible obstacle positions
  const possiblePositions: Point[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const point = { x, y }
      // Skip start and goal positions
      if (!(point.x === grid.start.x && point.y === grid.start.y) &&
          !(point.x === grid.goal.x && point.y === grid.goal.y)) {
        possiblePositions.push(point)
      }
    }
  }
  
  // Shuffle positions for random placement
  rng.shuffle(possiblePositions)
  
  // Place obstacles one by one, checking connectivity
  let obstaclesPlaced = 0
  let positionIndex = 0
  const maxAttempts = Math.min(targetObstacles * 3, possiblePositions.length)
  
  while (obstaclesPlaced < targetObstacles && positionIndex < maxAttempts) {
    const position = possiblePositions[positionIndex % possiblePositions.length]
    positionIndex++
    
    // Temporarily place obstacle
    setCell(grid, position, CellType.Wall)
    
    // Check if path still exists
    if (hasPath(grid)) {
      // Keep the obstacle
      obstaclesPlaced++
    } else {
      // Remove the obstacle (revert to empty)
      setCell(grid, position, CellType.Empty)
    }
    
    // Add some variety by occasionally allowing obstacles near start/goal
    if (obstaclesPlaced < targetObstacles * 0.8 && rng.randomBool(0.1)) {
      // Skip checking connectivity for small percentage to create more interesting patterns
      const varietyPosition = rng.choice(possiblePositions)
      if (grid.cells[varietyPosition.y][varietyPosition.x].type === CellType.Empty &&
          !isAdjacentToStartOrGoal(varietyPosition, grid)) {
        setCell(grid, varietyPosition, CellType.Wall)
        
        // Still check if we broke connectivity
        if (!hasPath(grid)) {
          setCell(grid, varietyPosition, CellType.Empty)
        } else {
          obstaclesPlaced++
        }
      }
    }
  }
  
  // Final connectivity check and cleanup
  ensureConnectivity(grid, rng)
  
  // Add some border walls for visual appeal (optional)
  if (rng.randomBool(0.3)) {
    addBorderWalls(grid, rng, 0.2)
  }
  
  return grid
}

function placeStartAndGoalStrategically(grid: Grid, rng: any): void {
  const { width, height } = grid
  
  // Define corner regions
  const corners = [
    { x: 0, y: 0, region: 'top-left' },
    { x: width - 1, y: 0, region: 'top-right' },
    { x: 0, y: height - 1, region: 'bottom-left' },
    { x: width - 1, y: height - 1, region: 'bottom-right' }
  ]
  
  // Choose two different corners
  rng.shuffle(corners)
  const startCorner = corners[0]
  const goalCorner = corners[1]
  
  // Place start and goal with some randomness within corner regions
  const margin = Math.min(Math.floor(width * 0.15), Math.floor(height * 0.15), 3)
  
  const startX = startCorner.x === 0 
    ? rng.randomInt(0, margin) 
    : rng.randomInt(width - margin, width)
  const startY = startCorner.y === 0 
    ? rng.randomInt(0, margin) 
    : rng.randomInt(height - margin, height)
    
  const goalX = goalCorner.x === 0 
    ? rng.randomInt(0, margin) 
    : rng.randomInt(width - margin, width)
  const goalY = goalCorner.y === 0 
    ? rng.randomInt(0, margin) 
    : rng.randomInt(height - margin, height)
  
  // Ensure positions are within bounds
  const start = {
    x: Math.max(0, Math.min(startX, width - 1)),
    y: Math.max(0, Math.min(startY, height - 1))
  }
  
  const goal = {
    x: Math.max(0, Math.min(goalX, width - 1)),
    y: Math.max(0, Math.min(goalY, height - 1))
  }
  
  // Ensure start and goal are different
  if (start.x === goal.x && start.y === goal.y) {
    if (goal.x < width - 1) goal.x++
    else if (goal.y < height - 1) goal.y++
    else if (start.x > 0) start.x--
    else if (start.y > 0) start.y--
  }
  
  setCell(grid, start, CellType.Start)
  setCell(grid, goal, CellType.Goal)
  
  grid.start = start
  grid.goal = goal
}

function isAdjacentToStartOrGoal(position: Point, grid: Grid): boolean {
  const neighbors = [
    { x: position.x - 1, y: position.y },
    { x: position.x + 1, y: position.y },
    { x: position.x, y: position.y - 1 },
    { x: position.x, y: position.y + 1 }
  ]
  
  for (const neighbor of neighbors) {
    if (neighbor.x >= 0 && neighbor.x < grid.width &&
        neighbor.y >= 0 && neighbor.y < grid.height) {
      const cell = grid.cells[neighbor.y][neighbor.x]
      if (cell.type === CellType.Start || cell.type === CellType.Goal) {
        return true
      }
    }
  }
  
  return false
}

function ensureConnectivity(grid: Grid, rng: any): void {
  let attempts = 0
  const maxAttempts = 50
  
  // Keep trying to ensure connectivity
  while (!hasPath(grid) && attempts < maxAttempts) {
    attempts++
    
    // Find all wall cells
    const wallCells: Point[] = []
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.cells[y][x].type === CellType.Wall) {
          wallCells.push({ x, y })
        }
      }
    }
    
    if (wallCells.length === 0) break
    
    // Remove a random wall
    const wallToRemove = rng.choice(wallCells)
    setCell(grid, wallToRemove, CellType.Empty)
  }
  
  // If still no path, create a simple direct path
  if (!hasPath(grid)) {
    createDirectPath(grid)
  }
}

function createDirectPath(grid: Grid): void {
  const { start, goal } = grid
  const path: Point[] = []
  
  // Simple path: go right/left first, then up/down
  let currentX = start.x
  let currentY = start.y
  
  // Move horizontally towards goal
  while (currentX !== goal.x) {
    path.push({ x: currentX, y: currentY })
    currentX += currentX < goal.x ? 1 : -1
  }
  
  // Move vertically towards goal
  while (currentY !== goal.y) {
    path.push({ x: currentX, y: currentY })
    currentY += currentY < goal.y ? 1 : -1
  }
  
  // Clear the path
  for (const point of path) {
    if (grid.cells[point.y][point.x].type === CellType.Wall) {
      setCell(grid, point, CellType.Empty)
    }
  }
}

function addBorderWalls(grid: Grid, rng: any, probability: number): void {
  const { width, height } = grid
  
  // Add random walls along borders
  for (let x = 0; x < width; x++) {
    // Top border
    if (rng.randomBool(probability) && 
        grid.cells[0][x].type === CellType.Empty) {
      setCell(grid, { x, y: 0 }, CellType.Wall)
    }
    
    // Bottom border
    if (rng.randomBool(probability) && 
        grid.cells[height - 1][x].type === CellType.Empty) {
      setCell(grid, { x, y: height - 1 }, CellType.Wall)
    }
  }
  
  for (let y = 0; y < height; y++) {
    // Left border
    if (rng.randomBool(probability) && 
        grid.cells[y][0].type === CellType.Empty) {
      setCell(grid, { x: 0, y }, CellType.Wall)
    }
    
    // Right border
    if (rng.randomBool(probability) && 
        grid.cells[y][width - 1].type === CellType.Empty) {
      setCell(grid, { x: width - 1, y }, CellType.Wall)
    }
  }
  
  // Final check to ensure start and goal are not walled off
  if (!hasPath(grid)) {
    // Clear cells adjacent to start and goal
    const startNeighbors = [
      { x: grid.start.x - 1, y: grid.start.y },
      { x: grid.start.x + 1, y: grid.start.y },
      { x: grid.start.x, y: grid.start.y - 1 },
      { x: grid.start.x, y: grid.start.y + 1 }
    ]
    
    for (const neighbor of startNeighbors) {
      if (neighbor.x >= 0 && neighbor.x < width &&
          neighbor.y >= 0 && neighbor.y < height &&
          grid.cells[neighbor.y][neighbor.x].type === CellType.Wall) {
        setCell(grid, neighbor, CellType.Empty)
        break
      }
    }
  }
}