import type { Grid, Point, PathfindingResult, PathfindingStep, CellType } from '../types/grid'
import { isWalkable, getWalkableNeighbors } from '../utils/gridUtils'
import { pointsEqual } from '@utils/mathUtils'

/**
 * Breadth-First Search (BFS) Baseline Algorithm
 * 
 * ⚠️ IMPORTANT: This algorithm is used ONLY for benchmarking purposes!
 * 
 * This is a classical BFS implementation used exclusively to provide a baseline
 * for performance comparison against our novel Gradient Field Pathfinding algorithm.
 * 
 * Usage Restrictions:
 * - Used ONLY in benchmark mode and side-by-side comparison view
 * - NOT used as the main pathfinding solver
 * - NOT exposed to the primary UI except for comparison purposes
 * 
 * This implementation exists solely to satisfy the project requirement for
 * "comparison against BFS baseline" while maintaining the novelty of the
 * primary pathfinding solution.
 * 
 * Algorithm: Standard Breadth-First Search
 * - Uses a queue to explore nodes level by level
 * - Guarantees shortest path in unweighted graphs
 * - Early termination when goal is found
 * - Parent pointers for path reconstruction
 * 
 * Time Complexity: O(V + E) where V = vertices, E = edges
 * Space Complexity: O(V) for queue and visited set
 */

interface BFSState {
  visited: Set<string>
  queue: Array<{ point: Point; parent: Point | null }>
  parentMap: Map<string, Point>
  exploredCount: number
  path: Point[]
  currentFrontier: Point[]
}

export class BFSBenchmark {
  private grid: Grid
  private state: BFSState | null = null
  private steps: PathfindingStep[] = []

  constructor(grid: Grid) {
    this.grid = grid
  }

  /**
   * Find path using standard BFS algorithm
   * Used exclusively for benchmarking comparison
   */
  async findPath(): Promise<PathfindingResult> {
    const startTime = performance.now()
    const memoryBefore = this.getMemoryUsage()

    this.initializeState()
    
    let goalFound = false
    let finalPath: Point[] = []

    while (this.state!.queue.length > 0 && !goalFound) {
      const result = this.processNextNode()
      
      if (result.goalFound) {
        goalFound = true
        finalPath = this.reconstructPath()
      }
    }

    const endTime = performance.now()
    const memoryAfter = this.getMemoryUsage()

    return {
      path: finalPath,
      exploredCount: this.state!.exploredCount,
      frontierCount: this.state!.queue.length,
      runtime: endTime - startTime,
      memoryUsed: memoryAfter - memoryBefore,
      pathLength: finalPath.length,
      success: goalFound,
      algorithmName: 'BFS Baseline (Benchmark Only)',
      usedFallback: false
    }
  }

  /**
   * Step-by-step iterator for visualization comparison
   * Used only in side-by-side comparison mode
   */
  async *stepIterator(): AsyncGenerator<PathfindingStep> {
    this.initializeState()
    let stepCount = 0

    while (this.state!.queue.length > 0) {
      stepCount++

      // Process one node from the queue
      const result = this.processNextNode()
      
      // Update frontier for visualization
      this.updateFrontier()

      const stepData: PathfindingStep = {
        current: result.current,
        explored: Array.from(this.state!.visited).map(key => {
          const [x, y] = key.split(',').map(Number)
          return { x, y }
        }),
        frontier: [...this.state!.currentFrontier],
        path: result.goalFound ? this.reconstructPath() : [],
        iteration: stepCount,
        message: `BFS exploring: (${result.current.x}, ${result.current.y})`
      }

      this.steps.push(stepData)
      yield stepData

      if (result.goalFound) {
        // Final step with complete path
        yield {
          current: this.grid.goal,
          explored: Array.from(this.state!.visited).map(key => {
            const [x, y] = key.split(',').map(Number)
            return { x, y }
          }),
          frontier: [],
          path: this.reconstructPath(),
          iteration: stepCount + 1,
          message: 'BFS found goal!'
        }
        return
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
      message: 'BFS exhausted - no path exists'
    }
  }

  /**
   * Initialize BFS state
   */
  private initializeState(): void {
    this.state = {
      visited: new Set([`${this.grid.start.x},${this.grid.start.y}`]),
      queue: [{ point: this.grid.start, parent: null }],
      parentMap: new Map(),
      exploredCount: 1,
      path: [],
      currentFrontier: []
    }
    this.steps = []
  }

  /**
   * Process the next node in the BFS queue
   */
  private processNextNode(): { current: Point; goalFound: boolean } {
    const state = this.state!
    
    // Dequeue next node
    const { point: current, parent } = state.queue.shift()!
    
    // Check if this is the goal
    if (pointsEqual(current, this.grid.goal)) {
      return { current, goalFound: true }
    }

    // Explore neighbors
    const neighbors = getWalkableNeighbors(this.grid, current)
    
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`
      
      if (!state.visited.has(neighborKey)) {
        state.visited.add(neighborKey)
        state.parentMap.set(neighborKey, current)
        state.queue.push({ point: neighbor, parent: current })
        state.exploredCount++
      }
    }

    return { current, goalFound: false }
  }

  /**
   * Update current frontier for visualization
   */
  private updateFrontier(): void {
    this.state!.currentFrontier = this.state!.queue.map(item => item.point)
  }

  /**
   * Reconstruct path from start to goal using parent pointers
   */
  private reconstructPath(): Point[] {
    const state = this.state!
    const path: Point[] = []
    let current = this.grid.goal

    // Trace back from goal to start using parent pointers
    while (!pointsEqual(current, this.grid.start)) {
      path.unshift({ ...current })
      
      const currentKey = `${current.x},${current.y}`
      const parent = state.parentMap.get(currentKey)
      
      if (!parent) {
        console.error('BFS path reconstruction failed - missing parent')
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
   * Get BFS-specific statistics
   */
  getStatistics(): {
    queueMaxSize: number
    visitedCount: number
    averageBranchingFactor: number
  } {
    if (!this.state) {
      return {
        queueMaxSize: 0,
        visitedCount: 0,
        averageBranchingFactor: 0
      }
    }

    // Calculate average branching factor
    const totalVisited = this.state.visited.size
    const totalNeighbors = Array.from(this.state.visited)
      .map(key => {
        const [x, y] = key.split(',').map(Number)
        return getWalkableNeighbors(this.grid, { x, y }).length
      })
      .reduce((sum, count) => sum + count, 0)

    return {
      queueMaxSize: this.steps.reduce((max, step) => 
        Math.max(max, step.frontier?.length || 0), 0),
      visitedCount: totalVisited,
      averageBranchingFactor: totalVisited > 0 ? totalNeighbors / totalVisited : 0
    }
  }

  /**
   * Quick connectivity check using BFS
   * Used for maze validation
   */
  static async hasPath(grid: Grid): Promise<boolean> {
    const bfs = new BFSBenchmark(grid)
    
    try {
      const result = await bfs.findPath()
      return result.success
    } catch (error) {
      return false
    }
  }

  /**
   * Compare two BFS results for consistency testing
   */
  static compareResults(result1: PathfindingResult, result2: PathfindingResult): {
    pathLengthMatch: boolean
    exploredCountMatch: boolean
    successMatch: boolean
    consistencyScore: number
  } {
    const pathLengthMatch = result1.pathLength === result2.pathLength
    const exploredCountMatch = result1.exploredCount === result2.exploredCount
    const successMatch = result1.success === result2.success

    let consistencyScore = 0
    if (pathLengthMatch) consistencyScore += 0.4
    if (exploredCountMatch) consistencyScore += 0.3
    if (successMatch) consistencyScore += 0.3

    return {
      pathLengthMatch,
      exploredCountMatch,
      successMatch,
      consistencyScore
    }
  }
}

/**
 * Factory function for creating BFS benchmark instances
 * Used in benchmarking and comparison scenarios
 */
export function createBFSBenchmark(grid: Grid): BFSBenchmark {
  return new BFSBenchmark(grid)
}

/**
 * Utility function to run BFS and collect basic metrics
 * Used for quick performance comparison
 */
export async function runBFSBenchmark(grid: Grid): Promise<{
  result: PathfindingResult
  statistics: ReturnType<BFSBenchmark['getStatistics']>
}> {
  const bfs = new BFSBenchmark(grid)
  const result = await bfs.findPath()
  const statistics = bfs.getStatistics()
  
  return { result, statistics }
}