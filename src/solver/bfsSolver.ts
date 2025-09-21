import type { Grid, Point } from '../types/grid'
import { CellType } from '../types/grid'

/**
 * Classic Breadth-First Search (BFS) Pathfinding Algorithm
 * 
 * A complete baseline implementation for comparison with the novel gradient field algorithm.
 * BFS guarantees finding the shortest path in unweighted grids.
 * 
 * Features:
 * - Optimal pathfinding (shortest path guarantee)
 * - Step-by-step visualization support
 * - Performance metrics tracking
 * - Complete graph exploration
 */

export interface BFSState {
  queue: Array<{point: Point, parent: Point | null}>
  visited: Set<string>
  exploredCells: Point[]
  frontierCells: Point[]
  pathFound: boolean
  finalPath: Point[]
  currentStep: number
  isComplete: boolean
  startTime: number
  parentMap: Map<string, Point | null>
}

export interface BFSResult {
  pathFound: boolean
  finalPath: Point[]
  exploredCells: Point[]
  frontierCells: Point[]
  currentPath: Point[] | null
  isComplete: boolean
  executionTimeMs: number
  totalCellsExplored: number
}

export class BFSSolver {
  private grid: Grid
  private state: BFSState
  private readonly directions: Point[] = [
    { x: 0, y: -1 }, // North
    { x: 1, y: 0 },  // East
    { x: 0, y: 1 },  // South
    { x: -1, y: 0 }  // West
  ]

  constructor(grid: Grid) {
    this.grid = grid
    this.state = this.initializeState()
  }

  private initializeState(): BFSState {
    const startTime = performance.now()
    const startKey = this.pointToKey(this.grid.start)
    
    return {
      queue: [{ point: this.grid.start, parent: null }],
      visited: new Set([startKey]),
      exploredCells: [],
      frontierCells: [this.grid.start],
      pathFound: false,
      finalPath: [],
      currentStep: 0,
      isComplete: false,
      startTime,
      parentMap: new Map([[startKey, null]])
    }
  }

  private pointToKey(point: Point): string {
    return `${point.x},${point.y}`
  }

  private isValidCell(point: Point): boolean {
    return (
      point.x >= 0 && 
      point.x < this.grid.width &&
      point.y >= 0 && 
      point.y < this.grid.height &&
      this.grid.cells[point.y][point.x].type !== CellType.Wall
    )
  }

  private isGoal(point: Point): boolean {
    return point.x === this.grid.goal.x && point.y === this.grid.goal.y
  }

  private reconstructPath(goalPoint: Point): Point[] {
    const path: Point[] = []
    let current: Point | null = goalPoint
    
    // Reconstruct path by following parent pointers backwards
    while (current !== null) {
      path.unshift(current)
      const currentKey = this.pointToKey(current)
      current = this.state.parentMap.get(currentKey) || null
    }
    
    return path
  }

  /**
   * Execute a single BFS step
   */
  step(): BFSResult {
    const startTime = performance.now()
    
    if (this.state.isComplete) {
      return {
        pathFound: this.state.pathFound,
        finalPath: this.state.finalPath,
        exploredCells: this.state.exploredCells,
        frontierCells: this.state.frontierCells,
        currentPath: this.state.pathFound ? this.state.finalPath : null,
        isComplete: true,
        executionTimeMs: performance.now() - this.state.startTime,
        totalCellsExplored: this.state.exploredCells.length
      }
    }

    if (this.state.queue.length === 0) {
      // No path found
      this.state.isComplete = true
      this.state.pathFound = false
      
      return {
        pathFound: false,
        finalPath: [],
        exploredCells: this.state.exploredCells,
        frontierCells: [],
        currentPath: null,
        isComplete: true,
        executionTimeMs: performance.now() - this.state.startTime,
        totalCellsExplored: this.state.exploredCells.length
      }
    }

    // Process next node in queue
    const current = this.state.queue.shift()!
    const currentKey = this.pointToKey(current.point)
    
    // Add to explored cells
    this.state.exploredCells.push(current.point)
    
    // Remove from frontier
    this.state.frontierCells = this.state.frontierCells.filter(
      p => this.pointToKey(p) !== currentKey
    )

    // Check if we reached the goal
    if (this.isGoal(current.point)) {
      this.state.pathFound = true
      this.state.finalPath = this.reconstructPath(current.point)
      this.state.isComplete = true
      
      return {
        pathFound: true,
        finalPath: this.state.finalPath,
        exploredCells: this.state.exploredCells,
        frontierCells: this.state.frontierCells,
        currentPath: this.state.finalPath,
        isComplete: true,
        executionTimeMs: performance.now() - this.state.startTime,
        totalCellsExplored: this.state.exploredCells.length
      }
    }

    // Explore neighbors
    for (const direction of this.directions) {
      const neighbor: Point = {
        x: current.point.x + direction.x,
        y: current.point.y + direction.y
      }
      
      const neighborKey = this.pointToKey(neighbor)
      
        if (this.isValidCell(neighbor) && !this.state.visited.has(neighborKey)) {
          this.state.visited.add(neighborKey)
          this.state.parentMap.set(neighborKey, current.point)
          this.state.queue.push({ point: neighbor, parent: current.point })
          this.state.frontierCells.push(neighbor)
          
          // Early termination if we reached the goal
          if (this.isGoal(neighbor)) {
            this.state.pathFound = true
            this.state.finalPath = this.reconstructPath(neighbor)
            this.state.isComplete = true
            
            return {
              pathFound: true,
              finalPath: this.state.finalPath,
              exploredCells: this.state.exploredCells,
              frontierCells: this.state.frontierCells,
              currentPath: this.state.finalPath,
              isComplete: true,
              executionTimeMs: performance.now() - this.state.startTime,
              totalCellsExplored: this.state.exploredCells.length
            }
          }
        }
    }

    this.state.currentStep++

    return {
      pathFound: false,
      finalPath: [],
      exploredCells: [...this.state.exploredCells],
      frontierCells: [...this.state.frontierCells],
      currentPath: null,
      isComplete: false,
      executionTimeMs: performance.now() - this.state.startTime,
      totalCellsExplored: this.state.exploredCells.length
    }
  }

  /**
   * Run the complete BFS algorithm to completion
   */
  solve(): BFSResult {
    const startTime = performance.now()
    
    while (!this.state.isComplete) {
      this.step()
    }
    
    return {
      pathFound: this.state.pathFound,
      finalPath: this.state.finalPath,
      exploredCells: this.state.exploredCells,
      frontierCells: this.state.frontierCells,
      currentPath: this.state.pathFound ? this.state.finalPath : null,
      isComplete: true,
      executionTimeMs: performance.now() - startTime,
      totalCellsExplored: this.state.exploredCells.length
    }
  }

  /**
   * Reset the solver to initial state
   */
  reset(): void {
    this.state = this.initializeState()
  }

  /**
   * Get current algorithm status
   */
  getCurrentPhase(): string {
    if (this.state.isComplete) {
      return this.state.pathFound ? 'Path Found' : 'No Path Found'
    }
    
    if (this.state.queue.length === 0) {
      return 'Initializing'
    }
    
    return `Exploring (Queue: ${this.state.queue.length})`
  }

  /**
   * Get algorithm name for benchmarking
   */
  getAlgorithmName(): string {
    return 'BFS Baseline'
  }
}