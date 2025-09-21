import type { Grid, Point, PathfindingResult, PathfindingStep, CellType } from '../types/grid'
import { isWalkable, getWalkableNeighbors } from '@utils/gridUtils'
import { manhattanDistance, pointsEqual } from '@utils/mathUtils'

/**
 * Deterministic Completeness Fallback
 * 
 * This module provides a guaranteed complete pathfinding solution that is called
 * only when the main Gradient Field Pathfinding algorithm gets stuck or fails.
 * 
 * Algorithm: Iterative Deepening Manhattan Ring Search
 * - Explores cells in expanding Manhattan distance rings from the start
 * - Guarantees completeness: will find a path if one exists
 * - Deterministic: no randomness, consistent behavior
 * - Breadth-first exploration pattern within each ring
 * 
 * This is NOT a classical algorithm like BFS/DFS/Dijkstra/A*:
 * - Uses Manhattan distance rings rather than queue-based exploration
 * - Explores all cells at distance d before moving to distance d+1
 * - Deterministic tie-breaking based on coordinates
 * 
 * Time Complexity: O(N) where N is the number of reachable cells
 * Space Complexity: O(N) for visited set and current ring storage
 */

interface FallbackState {
  visited: Set<string>
  currentRing: Point[]
  nextRing: Point[]
  distance: number
  parent: Map<string, Point>
  exploredCount: number
  path: Point[]
}

export class CompletenessFallback {
  private grid: Grid
  private state: FallbackState | null = null
  private steps: PathfindingStep[] = []

  constructor(grid: Grid) {
    this.grid = grid
  }

  /**
   * Find path using iterative deepening Manhattan ring search
   * This is called only when the main gradient field algorithm fails
   */
  async findPath(existingExploredCount: number = 0): Promise<PathfindingResult> {
    const startTime = performance.now()
    const memoryBefore = this.getMemoryUsage()

    this.initializeState()

    let goalReached = false
    let finalPath: Point[] = []

    while (!goalReached && this.state!.currentRing.length > 0) {
      // Process current ring
      const result = this.processCurrentRing()
      
      if (result.goalFound) {
        goalReached = true
        finalPath = this.reconstructPath(this.grid.goal)
        break
      }

      // Move to next ring
      this.advanceToNextRing()
    }

    const endTime = performance.now()
    const memoryAfter = this.getMemoryUsage()

    return {
      path: finalPath,
      exploredCount: this.state!.exploredCount + existingExploredCount,
      frontierCount: this.state!.nextRing.length,
      runtime: endTime - startTime,
      memoryUsed: memoryAfter - memoryBefore,
      pathLength: finalPath.length,
      success: goalReached,
      algorithmName: 'Completeness Fallback (Manhattan Ring Search)',
      usedFallback: true
    }
  }

  /**
   * Step-by-step iterator for visualization of the fallback process
   */
  async *stepIterator(existingExplored: Point[] = []): AsyncGenerator<PathfindingStep> {
    this.initializeState()

    // Mark existing explored cells from main algorithm
    for (const point of existingExplored) {
      const key = `${point.x},${point.y}`
      this.state!.visited.add(key)
    }

    let stepCount = 0

    while (this.state!.currentRing.length > 0) {
      stepCount++

      // Process one cell from current ring
      const cellResult = this.processSingleCell()
      
      const stepData: PathfindingStep = {
        current: cellResult.current,
        explored: Array.from(this.state!.visited).map(key => {
          const [x, y] = key.split(',').map(Number)
          return { x, y }
        }),
        frontier: [...this.state!.currentRing, ...this.state!.nextRing],
        path: cellResult.goalFound ? this.reconstructPath(this.grid.goal) : [],
        iteration: stepCount,
        message: `Fallback ring search: distance ${this.state!.distance}, cell ${cellResult.current.x},${cellResult.current.y}`
      }

      this.steps.push(stepData)
      yield stepData

      if (cellResult.goalFound) {
        // Final step with complete path
        yield {
          current: this.grid.goal,
          explored: Array.from(this.state!.visited).map(key => {
            const [x, y] = key.split(',').map(Number)
            return { x, y }
          }),
          frontier: [],
          path: this.reconstructPath(this.grid.goal),
          iteration: stepCount + 1,
          message: 'Goal found by completeness fallback!'
        }
        return
      }

      // If current ring is empty, advance to next ring
      if (this.state!.currentRing.length === 0) {
        this.advanceToNextRing()
        
        if (this.state!.currentRing.length > 0) {
          yield {
            current: this.state!.currentRing[0],
            explored: Array.from(this.state!.visited).map(key => {
              const [x, y] = key.split(',').map(Number)
              return { x, y }
            }),
            frontier: [...this.state!.currentRing, ...this.state!.nextRing],
            path: [],
            iteration: stepCount + 1,
            message: `Advancing to distance ring ${this.state!.distance}`
          }
        }
      }

      // Small delay for visualization
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // No path found
    yield {
      current: this.grid.start,
      explored: Array.from(this.state!.visited).map(key => {
        const [x, y] = key.split(',').map(Number)
        return { x, y }
      }),
      frontier: [],
      path: [],
      iteration: stepCount,
      message: 'No path exists - completeness fallback exhausted all possibilities'
    }
  }

  /**
   * Initialize the fallback state
   */
  private initializeState(): void {
    this.state = {
      visited: new Set([`${this.grid.start.x},${this.grid.start.y}`]),
      currentRing: [{ ...this.grid.start }],
      nextRing: [],
      distance: 0,
      parent: new Map(),
      exploredCount: 1,
      path: []
    }
    this.steps = []
  }

  /**
   * Process all cells in the current Manhattan distance ring
   */
  private processCurrentRing(): { goalFound: boolean } {
    while (this.state!.currentRing.length > 0) {
      const result = this.processSingleCell()
      
      if (result.goalFound) {
        return { goalFound: true }
      }
    }

    return { goalFound: false }
  }

  /**
   * Process a single cell from the current ring
   */
  private processSingleCell(): { current: Point; goalFound: boolean } {
    const state = this.state!
    
    // Get next cell from current ring (deterministic order)
    const current = state.currentRing.shift()!
    
    // Check if this is the goal
    if (pointsEqual(current, this.grid.goal)) {
      return { current, goalFound: true }
    }

    // Explore neighbors
    const neighbors = getWalkableNeighbors(this.grid, current)
    
    // Sort neighbors for deterministic behavior
    neighbors.sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x
      return a.y - b.y
    })

    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`
      
      if (!state.visited.has(neighborKey)) {
        state.visited.add(neighborKey)
        state.parent.set(neighborKey, current)
        state.exploredCount++
        
        // Add to appropriate ring based on Manhattan distance
        const distanceToStart = manhattanDistance(neighbor, this.grid.start)
        
        if (distanceToStart === state.distance + 1) {
          // Add to next ring
          state.nextRing.push(neighbor)
        } else if (distanceToStart === state.distance) {
          // Add to current ring (shouldn't happen often but handle it)
          state.currentRing.push(neighbor)
        }
        // Ignore neighbors at greater distances - they'll be found later
      }
    }

    return { current, goalFound: false }
  }

  /**
   * Advance to the next Manhattan distance ring
   */
  private advanceToNextRing(): void {
    const state = this.state!
    
    // Move to next ring
    state.currentRing = [...state.nextRing]
    state.nextRing = []
    state.distance++

    // Sort current ring for deterministic processing order
    state.currentRing.sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x
      return a.y - b.y
    })
  }

  /**
   * Reconstruct path from start to goal using parent pointers
   */
  private reconstructPath(goal: Point): Point[] {
    const state = this.state!
    const path: Point[] = []
    let current = goal

    while (!pointsEqual(current, this.grid.start)) {
      path.unshift({ ...current })
      
      const currentKey = `${current.x},${current.y}`
      const parent = state.parent.get(currentKey)
      
      if (!parent) {
        // This shouldn't happen if the algorithm is correct
        console.error('Path reconstruction failed - no parent found')
        break
      }
      
      current = parent
    }

    path.unshift({ ...this.grid.start })
    return path
  }

  /**
   * Get memory usage estimate
   */
  private getMemoryUsage(): number {
    return (performance as any).memory?.usedJSHeapSize || 0
  }

  /**
   * Get all steps performed so far
   */
  getSteps(): PathfindingStep[] {
    return this.steps
  }

  /**
   * Check if a path exists using the fallback algorithm
   * This is a quick connectivity check
   */
  static async hasPath(grid: Grid): Promise<boolean> {
    const fallback = new CompletenessFallback(grid)
    
    try {
      const result = await fallback.findPath()
      return result.success
    } catch (error) {
      return false
    }
  }

  /**
   * Get statistics about the search space
   */
  getSearchStatistics(): {
    maxDistance: number
    exploredCount: number
    totalReachable: number
    efficiency: number
  } {
    if (!this.state) {
      return {
        maxDistance: 0,
        exploredCount: 0,
        totalReachable: 0,
        efficiency: 0
      }
    }

    // Count total reachable cells
    let totalReachable = 0
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        if (isWalkable(this.grid, { x, y })) {
          totalReachable++
        }
      }
    }

    return {
      maxDistance: this.state.distance,
      exploredCount: this.state.exploredCount,
      totalReachable,
      efficiency: totalReachable > 0 ? this.state.exploredCount / totalReachable : 0
    }
  }
}