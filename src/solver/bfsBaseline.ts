/**
 * Classic Breadth-First Search (BFS) Pathfinding Algorithm
 * 
 * This is the standard baseline algorithm for comparison with our novel approach.
 * BFS guarantees the shortest path in unweighted graphs and provides optimal solutions.
 * 
 * Time Complexity: O(V + E) where V is vertices (cells) and E is edges
 * Space Complexity: O(V) for the queue and visited set
 * 
 * Characteristics:
 * - Always finds the shortest path
 * - Explores nodes level by level
 * - Simple and well-understood
 * - Good baseline for comparison
 */

import type { Grid, Point, PathfindingResult, PathfindingStep } from '../types/grid'
import { CellType } from '../types/grid'
import { isWalkable, getWalkableNeighbors } from '../utils/gridUtils'

interface BFSNode {
  point: Point
  parent: BFSNode | null
  distance: number
}

interface BFSState {
  queue: BFSNode[]
  visited: Set<string>
  current: Point | null
  step: number
  path: Point[]
  explored: Point[]
  frontier: Point[]
}

export class BFSPathfinder {
  private grid: Grid
  private state: BFSState | null = null
  private steps: PathfindingStep[] = []
  private startTime: number = 0

  constructor(grid: Grid) {
    this.grid = grid
  }

  /**
   * Find path using BFS algorithm
   */
  async findPath(): Promise<PathfindingResult> {
    this.startTime = performance.now()
    const memoryBefore = this.getMemoryUsage()

    try {
      this.initializeState()
      
      while (this.state!.queue.length > 0 && !this.isGoalReached()) {
        this.performStep()
      }

      const endTime = performance.now()
      const memoryAfter = this.getMemoryUsage()
      
      const result: PathfindingResult = {
        path: this.state!.path,
        exploredCount: this.state!.explored.length,
        frontierCount: this.state!.frontier.length,
        runtime: endTime - this.startTime,
        memoryUsed: memoryAfter - memoryBefore,
        pathLength: this.state!.path.length,
        success: this.isGoalReached(),
        algorithmName: 'Breadth-First Search',
        usedFallback: false
      }

      return result
    } catch (error) {
      console.error('BFS pathfinding failed:', error)
      throw error
    }
  }

  /**
   * Step-by-step iterator for visualization
   */
  async *stepIterator(): AsyncGenerator<PathfindingStep> {
    this.startTime = performance.now()
    this.initializeState()

    while (this.state!.queue.length > 0 && !this.isGoalReached()) {
      this.performStep()

      // Create step data for visualization
      const stepData: PathfindingStep = {
        current: this.state!.current || this.grid.start,
        explored: [...this.state!.explored],
        frontier: [...this.state!.frontier],
        path: [...this.state!.path],
        iteration: this.state!.step,
        message: `BFS Step ${this.state!.step}: Exploring (${this.state!.current?.x}, ${this.state!.current?.y})`
      }

      this.steps.push(stepData)
      yield stepData

      // Small delay for visualization
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    // Final step
    if (this.isGoalReached()) {
      const finalPath = this.reconstructPath()
      yield {
        current: this.grid.goal,
        explored: [...this.state!.explored],
        frontier: [],
        path: finalPath,
        iteration: this.state!.step,
        message: `BFS Complete: Path found with length ${finalPath.length}`
      }
    } else {
      yield {
        current: this.state!.current || this.grid.start,
        explored: [...this.state!.explored],
        frontier: [],
        path: [],
        iteration: this.state!.step,
        message: 'BFS Complete: No path found'
      }
    }
  }

  /**
   * Initialize BFS state
   */
  private initializeState(): void {
    const startNode: BFSNode = {
      point: this.grid.start,
      parent: null,
      distance: 0
    }

    this.state = {
      queue: [startNode],
      visited: new Set([this.pointToKey(this.grid.start)]),
      current: null,
      step: 0,
      path: [],
      explored: [this.grid.start],
      frontier: []
    }
  }

  /**
   * Perform a single BFS step
   */
  private performStep(): void {
    if (!this.state || this.state.queue.length === 0) return

    const currentNode = this.state.queue.shift()!
    this.state.current = currentNode.point
    this.state.step++

    // Check if we reached the goal
    if (this.pointsEqual(currentNode.point, this.grid.goal)) {
      this.state.path = this.reconstructPathFromNode(currentNode)
      return
    }

    // Add current point to explored (if not already there)
    const currentKey = this.pointToKey(currentNode.point)
    if (!this.state.explored.some(p => this.pointToKey(p) === currentKey)) {
      this.state.explored.push(currentNode.point)
    }

    // Explore neighbors
    const neighbors = getWalkableNeighbors(this.grid, currentNode.point)
    this.state.frontier = []

    for (const neighbor of neighbors) {
      const neighborKey = this.pointToKey(neighbor)
      
      if (!this.state.visited.has(neighborKey)) {
        const neighborNode: BFSNode = {
          point: neighbor,
          parent: currentNode,
          distance: currentNode.distance + 1
        }

        this.state.queue.push(neighborNode)
        this.state.visited.add(neighborKey)
        this.state.frontier.push(neighbor)
      }
    }
  }

  /**
   * Check if goal is reached
   */
  private isGoalReached(): boolean {
    return this.state?.current ? 
      this.pointsEqual(this.state.current, this.grid.goal) : false
  }

  /**
   * Reconstruct the final path
   */
  private reconstructPath(): Point[] {
    if (!this.state?.queue.length) return []
    
    // Find the goal node in the queue (it should be the last processed node)
    // Since we stop when goal is reached, we need to reconstruct from current state
    return this.state.path
  }

  /**
   * Reconstruct path from a specific node
   */
  private reconstructPathFromNode(node: BFSNode): Point[] {
    const path: Point[] = []
    let current: BFSNode | null = node

    while (current !== null) {
      path.unshift(current.point)
      current = current.parent
    }

    return path
  }

  /**
   * Convert point to string key
   */
  private pointToKey(point: Point): string {
    return `${point.x},${point.y}`
  }

  /**
   * Check if two points are equal
   */
  private pointsEqual(a: Point, b: Point): boolean {
    return a.x === b.x && a.y === b.y
  }

  /**
   * Get current memory usage (rough estimate)
   */
  private getMemoryUsage(): number {
    // Rough estimation based on data structures
    if (!this.state) return 0
    
    const queueSize = this.state.queue.length * 64 // Rough bytes per node
    const visitedSize = this.state.visited.size * 32 // Rough bytes per string key
    const exploredSize = this.state.explored.length * 16 // Rough bytes per point
    const frontierSize = this.state.frontier.length * 16
    
    return queueSize + visitedSize + exploredSize + frontierSize
  }

  /**
   * Get all steps from the search
   */
  getAllSteps(): PathfindingStep[] {
    return this.steps
  }

  /**
   * Reset the pathfinder state
   */
  reset(): void {
    this.state = null
    this.steps = []
    this.startTime = 0
  }

  /**
   * Get search statistics
   */
  getStatistics(): {
    totalSteps: number
    nodesExplored: number
    nodesInFrontier: number
    maxQueueSize: number
  } {
    if (!this.state) {
      return {
        totalSteps: 0,
        nodesExplored: 0,
        nodesInFrontier: 0,
        maxQueueSize: 0
      }
    }

    // Calculate max queue size from steps (if we tracked it)
    let maxQueueSize = 0
    for (const step of this.steps) {
      maxQueueSize = Math.max(maxQueueSize, step.frontier.length)
    }

    return {
      totalSteps: this.state.step,
      nodesExplored: this.state.explored.length,
      nodesInFrontier: this.state.frontier.length,
      maxQueueSize
    }
  }
}

export default BFSPathfinder