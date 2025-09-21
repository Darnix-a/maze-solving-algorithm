import type { Grid, Point, MazeGenerationOptions } from '../types/grid'
import { CellType } from '../types/grid'
import { createEmptyGrid, setCell, getWalkableNeighbors } from '../utils/gridUtils'
import { createRNG, SeededRNG } from '../utils/seededRng'

/**
 * Randomized Prim's Maze Generation Algorithm
 * 
 * This algorithm generates mazes by treating the maze as a graph and finding
 * a minimum spanning tree using a randomized version of Prim's algorithm.
 * 
 * Algorithm:
 * 1. Start with a grid full of walls
 * 2. Choose a random starting cell and make it part of the maze
 * 3. Add all walls of the starting cell to a frontier list
 * 4. While the frontier list is not empty:
 *    - Pick a random wall from the frontier
 *    - If the wall connects a maze cell to a non-maze cell:
 *      - Make the non-maze cell part of the maze
 *      - Remove the wall between them
 *      - Add the new cell's walls to the frontier
 *    - Remove the wall from the frontier
 */

interface PrimWall {
  x: number
  y: number
  connectsTo: Point // The cell this wall would connect to if removed
}

export function generateRandomPrimsMaze(options: MazeGenerationOptions): Grid {
  const { width, height, seed } = options
  const rng = createRNG(seed)
  
  // Ensure odd dimensions for proper maze structure
  const mazeWidth = width % 2 === 0 ? width - 1 : width
  const mazeHeight = height % 2 === 0 ? height - 1 : height
  
  // Initialize grid filled with walls
  const grid = createWallGrid(mazeWidth, mazeHeight)
  
  // Track which cells are part of the maze
  const inMaze: boolean[][] = []
  for (let y = 0; y < mazeHeight; y++) {
    inMaze[y] = new Array(mazeWidth).fill(false)
  }
  
  // Frontier walls list
  const frontierWalls: PrimWall[] = []
  
  // Choose random starting cell (must be on odd coordinates)
  const startX = 1 + 2 * rng.randomIntMax(Math.floor((mazeWidth - 1) / 2))
  const startY = 1 + 2 * rng.randomIntMax(Math.floor((mazeHeight - 1) / 2))
  
  // Add starting cell to maze
  setCell(grid, { x: startX, y: startY }, CellType.Empty)
  inMaze[startY][startX] = true
  
  // Add walls of starting cell to frontier
  addWallsToFrontier(startX, startY, frontierWalls, inMaze, mazeWidth, mazeHeight)
  
  // Continue until no more frontier walls
  while (frontierWalls.length > 0) {
    // Pick random wall from frontier
    const wallIndex = rng.randomIntMax(frontierWalls.length)
    const wall = frontierWalls[wallIndex]
    
    // Remove wall from frontier (swap with last element for O(1) removal)
    frontierWalls[wallIndex] = frontierWalls[frontierWalls.length - 1]
    frontierWalls.pop()
    
    // Check if this wall connects maze to non-maze cell
    const { x: wallX, y: wallY, connectsTo } = wall
    const { x: cellX, y: cellY } = connectsTo
    
    // If the cell this wall connects to is not yet in the maze
    if (!inMaze[cellY][cellX]) {
      // Add the wall's connecting cell to the maze
      setCell(grid, { x: cellX, y: cellY }, CellType.Empty)
      inMaze[cellY][cellX] = true
      
      // Remove the wall itself (make it passable)
      setCell(grid, { x: wallX, y: wallY }, CellType.Empty)
      
      // Add new cell's walls to frontier
      addWallsToFrontier(cellX, cellY, frontierWalls, inMaze, mazeWidth, mazeHeight)
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

function addWallsToFrontier(
  cellX: number,
  cellY: number,
  frontierWalls: PrimWall[],
  inMaze: boolean[][],
  width: number,
  height: number
): void {
  // Check walls in all four directions
  const directions = [
    { dx: 0, dy: -2, wallDx: 0, wallDy: -1 }, // up
    { dx: 2, dy: 0, wallDx: 1, wallDy: 0 },   // right
    { dx: 0, dy: 2, wallDx: 0, wallDy: 1 },   // down
    { dx: -2, dy: 0, wallDx: -1, wallDy: 0 }  // left
  ]
  
  for (const dir of directions) {
    const nextCellX = cellX + dir.dx
    const nextCellY = cellY + dir.dy
    const wallX = cellX + dir.wallDx
    const wallY = cellY + dir.wallDy
    
    // Check if the potential next cell is within bounds
    if (nextCellX >= 1 && nextCellX < width - 1 && 
        nextCellY >= 1 && nextCellY < height - 1) {
      
      // Only add wall to frontier if the cell it connects to is not in maze
      if (!inMaze[nextCellY][nextCellX]) {
        // Check if this wall is already in frontier (avoid duplicates)
        const wallExists = frontierWalls.some(w => 
          w.x === wallX && w.y === wallY && 
          w.connectsTo.x === nextCellX && w.connectsTo.y === nextCellY
        )
        
        if (!wallExists) {
          frontierWalls.push({
            x: wallX,
            y: wallY,
            connectsTo: { x: nextCellX, y: nextCellY }
          })
        }
      }
    }
  }
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
    // Fallback: place start and goal at corners if possible
    const corners = [
      { x: 1, y: 1 },
      { x: grid.width - 2, y: 1 },
      { x: 1, y: grid.height - 2 },
      { x: grid.width - 2, y: grid.height - 2 }
    ].filter(corner => 
      grid.cells[corner.y] && 
      grid.cells[corner.y][corner.x] && 
      grid.cells[corner.y][corner.x].type === CellType.Empty
    )
    
    if (corners.length >= 2) {
      const start = corners[0]
      const goal = corners[corners.length - 1]
      
      setCell(grid, start, CellType.Start)
      setCell(grid, goal, CellType.Goal)
      
      grid.start = start
      grid.goal = goal
    } else {
      // Last resort fallback
      setCell(grid, { x: 1, y: 1 }, CellType.Start)
      setCell(grid, { x: grid.width - 2, y: grid.height - 2 }, CellType.Goal)
      grid.start = { x: 1, y: 1 }
      grid.goal = { x: grid.width - 2, y: grid.height - 2 }
    }
    return
  }
  
  // Choose two random empty cells for start and goal
  const startCell = rng.choice(emptyCells)
  let goalCell = rng.choice(emptyCells)
  
  // Ensure start and goal are different
  let attempts = 0
  while (goalCell.x === startCell.x && goalCell.y === startCell.y && attempts < 100) {
    goalCell = rng.choice(emptyCells)
    attempts++
  }
  
  setCell(grid, startCell, CellType.Start)
  setCell(grid, goalCell, CellType.Goal)
  
  grid.start = startCell
  grid.goal = goalCell
}