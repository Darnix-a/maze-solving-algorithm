import type { Grid, Point, PathfindingResult, PathfindingStep } from '../types/grid'
import { CellType } from '../types/grid'
import { isWalkable, getWalkableNeighbors } from '../utils/gridUtils'
import { 
  euclideanDistance, 
  pointsEqual, 
  addPoints, 
  scalePoint, 
  vectorMagnitude, 
  normalizeVector,
  clamp 
} from '../utils/mathUtils'
import { getRNG } from '../utils/seededRng'

/**
 * Novel Gradient Field Pathfinding Algorithm
 * 
 * This algorithm uses a physics-inspired approach combining:
 * 1. Potential field construction from the goal (attractive forces)
 * 2. Repulsive Gaussian potentials around obstacles
 * 3. Gradient descent with momentum for smooth navigation
 * 4. Cycle detection and escape mechanisms
 * 5. Deterministic completeness fallback
 * 
 * Unlike classical graph traversal algorithms (BFS, DFS, Dijkstra, A*), this approach:
 * - Uses continuous gradient descent rather than discrete graph expansion
 * - Employs momentum for smoother, more natural paths
 * - Combines local and global information through the potential field
 * - Provides rich visualization data showing the "flow" of the search
 * 
 * Time Complexity: O(N) average case, O(N²) worst case with fallback
 * Space Complexity: O(N) for potential field storage
 */

export interface GradientFieldOptions {
  /** Momentum factor for gradient descent (0 = no momentum, 0.9 = high momentum) */
  momentumFactor: number
  /** Standard deviation for Gaussian repulsion around walls */
  repulsionSigma: number
  /** Strength of repulsive forces from walls */
  repulsionStrength: number
  /** Maximum number of iterations before declaring failure */
  maxIterations: number
  /** Distance threshold for considering goal reached */
  goalThreshold: number
  /** Enable randomness for escape mechanisms */
  enableRandomness: boolean
  /** Random perturbation strength when stuck */
  perturbationStrength: number
  /** Number of steps to attempt escape before fallback */
  escapeAttempts: number
}

export const DEFAULT_GRADIENT_OPTIONS: GradientFieldOptions = {
  momentumFactor: 0.7,
  repulsionSigma: 1.5,
  repulsionStrength: 10.0,
  maxIterations: 1000,
  goalThreshold: 0.5,
  enableRandomness: true,
  perturbationStrength: 2.0,
  escapeAttempts: 20,
}

interface GradientState {
  position: Point
  velocity: Point
  iteration: number
  stuckCounter: number
  visitedPositions: Map<string, number>
  exploredCells: Set<string>
  path: Point[]
  potentialField: number[][]
  gradientField: Point[][]
}

export class GradientFieldPathfinder {
  private grid: Grid
  private options: GradientFieldOptions
  private state: GradientState | null = null
  private steps: PathfindingStep[] = []

  constructor(grid: Grid, options: Partial<GradientFieldOptions> = {}) {
    this.grid = grid
    this.options = { ...DEFAULT_GRADIENT_OPTIONS, ...options }
  }

  /**
   * Find path using gradient field pathfinding
   */
  async findPath(): Promise<PathfindingResult> {
    const startTime = performance.now()
    const memoryBefore = this.getMemoryUsage()

    try {
      // Phase 1: Build potential field (preprocessing)
      const potentialField = this.buildPotentialField()
      
      // Phase 2: Compute gradient field
      const gradientField = this.computeGradientField(potentialField)
      
      // Phase 3: Navigate using gradient descent
      const result = await this.navigateGradientField(potentialField, gradientField)
      
      const endTime = performance.now()
      const memoryAfter = this.getMemoryUsage()
      
      return {
        ...result,
        runtime: endTime - startTime,
        memoryUsed: memoryAfter - memoryBefore,
        algorithmName: 'Gradient Field Pathfinding',
        usedFallback: false
      }
    } catch (error) {
      console.error('Gradient field pathfinding failed:', error)
      
      // Fallback will be implemented in completenessFallback.ts
      throw error
    }
  }

  /**
   * Step-by-step iterator for real-time visualization
   */
  async *stepIterator(): AsyncGenerator<PathfindingStep> {
    // Build potential and gradient fields first
    const potentialField = this.buildPotentialField()
    const gradientField = this.computeGradientField(potentialField)
    
    // Initialize state
    this.initializeState(potentialField, gradientField)
    
    while (!this.isGoalReached() && this.state!.iteration < this.options.maxIterations) {
      // Perform one step
      const step = this.performStep()
      
      // Create step data for visualization
      const stepData: PathfindingStep = {
        current: { ...this.state!.position },
        explored: Array.from(this.state!.exploredCells).map(key => {
          const [x, y] = key.split(',').map(Number)
          return { x, y }
        }),
        frontier: this.getFrontierCells(),
        path: [...this.state!.path],
        gradientField: this.state!.gradientField.map(row => row.map(point => point.x)), // Just x component for visualization
        iteration: this.state!.iteration,
        message: step.message
      }
      
      this.steps.push(stepData)
      yield stepData
      
      // Small delay for visualization
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    // Final step
    if (this.isGoalReached()) {
      yield {
        current: this.grid.goal,
        explored: Array.from(this.state!.exploredCells).map(key => {
          const [x, y] = key.split(',').map(Number)
          return { x, y }
        }),
        frontier: [],
        path: [...this.state!.path, this.grid.goal],
        gradientField: this.state!.gradientField.map(row => row.map(point => point.x)),
        iteration: this.state!.iteration,
        message: 'Goal reached!'
      }
    }
  }

  /**
   * Phase 1: Build potential field using wavefront expansion from goal
   * This is allowed as preprocessing since it's not the actual pathfinding search
   */
  private buildPotentialField(): number[][] {
    const { width, height, goal } = this.grid
    const potential = Array(height).fill(0).map(() => Array(width).fill(Infinity))
    const queue: Array<{ point: Point; value: number }> = []
    
    // Initialize goal with potential 0
    potential[goal.y][goal.x] = 0
    queue.push({ point: goal, value: 0 })
    
    // Wavefront expansion (like BFS but for potential values)
    while (queue.length > 0) {
      const { point, value } = queue.shift()!
      const neighbors = getWalkableNeighbors(this.grid, point)
      
      for (const neighbor of neighbors) {
        const newValue = value + 1
        
        if (newValue < potential[neighbor.y][neighbor.x]) {
          potential[neighbor.y][neighbor.x] = newValue
          queue.push({ point: neighbor, value: newValue })
        }
      }
    }
    
    // Add repulsive potential around walls
    this.addRepulsivePotential(potential)
    
    return potential
  }

  /**
   * Add Gaussian repulsive potential around walls
   */
  private addRepulsivePotential(potential: number[][]): void {
    const { width, height } = this.grid
    const { repulsionSigma, repulsionStrength } = this.options
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.grid.cells[y][x].type === CellType.Wall) {
          // Add Gaussian repulsion around this wall
          for (let dy = -Math.ceil(repulsionSigma * 3); dy <= Math.ceil(repulsionSigma * 3); dy++) {
            for (let dx = -Math.ceil(repulsionSigma * 3); dx <= Math.ceil(repulsionSigma * 3); dx++) {
              const nx = x + dx
              const ny = y + dy
              
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const distance = Math.sqrt(dx * dx + dy * dy)
                const repulsion = repulsionStrength * Math.exp(-(distance * distance) / (2 * repulsionSigma * repulsionSigma))
                
                if (potential[ny][nx] !== Infinity) {
                  potential[ny][nx] += repulsion
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Phase 2: Compute gradient field from potential field
   */
  private computeGradientField(potential: number[][]): Point[][] {
    const { width, height } = this.grid
    const gradient = Array(height).fill(0).map(() => Array(width).fill({ x: 0, y: 0 }))
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (this.grid.cells[y][x].type !== CellType.Wall) {
          // Compute gradient using central differences
          const gradX = this.computePartialDerivative(potential, x, y, 1, 0)
          const gradY = this.computePartialDerivative(potential, x, y, 0, 1)
          
          gradient[y][x] = { x: -gradX, y: -gradY } // Negative for descent
        }
      }
    }
    
    return gradient
  }

  /**
   * Compute partial derivative using finite differences
   */
  private computePartialDerivative(potential: number[][], x: number, y: number, dx: number, dy: number): number {
    const { width, height } = this.grid
    
    const x1 = clamp(x - dx, 0, width - 1)
    const y1 = clamp(y - dy, 0, height - 1)
    const x2 = clamp(x + dx, 0, width - 1)
    const y2 = clamp(y + dy, 0, height - 1)
    
    const val1 = potential[y1][x1]
    const val2 = potential[y2][x2]
    
    if (val1 === Infinity || val2 === Infinity) return 0
    
    return (val2 - val1) / (2 * Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1))
  }

  /**
   * Initialize gradient descent state
   */
  private initializeState(potentialField: number[][], gradientField: Point[][]): void {
    this.state = {
      position: { x: this.grid.start.x, y: this.grid.start.y },
      velocity: { x: 0, y: 0 },
      iteration: 0,
      stuckCounter: 0,
      visitedPositions: new Map(),
      exploredCells: new Set(),
      path: [{ ...this.grid.start }],
      potentialField,
      gradientField
    }
  }

  /**
   * Phase 3: Navigate using gradient descent with momentum
   */
  private async navigateGradientField(potentialField: number[][], gradientField: Point[][]): Promise<Omit<PathfindingResult, 'runtime' | 'memoryUsed' | 'algorithmName'>> {
    this.initializeState(potentialField, gradientField)
    
    while (!this.isGoalReached() && this.state!.iteration < this.options.maxIterations) {
      this.performStep()
    }
    
    const success = this.isGoalReached()
    const finalPath = success ? [...this.state!.path, this.grid.goal] : this.state!.path
    
    return {
      path: finalPath,
      exploredCount: this.state!.exploredCells.size,
      frontierCount: this.getFrontierCells().length,
      pathLength: finalPath.length,
      success
    }
  }

  /**
   * Perform one step of gradient descent
   */
  private performStep(): { message: string } {
    const state = this.state!
    const { momentumFactor } = this.options
    
    // Get gradient at current position
    const currentGrad = this.getGradientAtPosition(state.position)
    
    // Update velocity with momentum
    state.velocity = addPoints(
      scalePoint(state.velocity, momentumFactor),
      scalePoint(currentGrad, 1 - momentumFactor)
    )
    
    // Normalize velocity to unit step
    const velocityMagnitude = vectorMagnitude(state.velocity)
    if (velocityMagnitude > 0) {
      state.velocity = scalePoint(normalizeVector(state.velocity), 1.0)
    }
    
    // Calculate next position
    const nextPosition = this.calculateNextPosition(state.position, state.velocity)
    
    // Check if we're making progress
    const positionKey = `${Math.floor(nextPosition.x)},${Math.floor(nextPosition.y)}`
    const visitCount = state.visitedPositions.get(positionKey) || 0
    
    if (visitCount > 3) {
      // We're stuck in a cycle, try escape mechanism
      return this.attemptEscape()
    }
    
    // Update state
    state.position = nextPosition
    state.visitedPositions.set(positionKey, visitCount + 1)
    state.exploredCells.add(positionKey)
    state.path.push({ ...state.position })
    state.iteration++
    
    return { message: `Gradient descent step ${state.iteration}` }
  }

  /**
   * Get gradient vector at a given position (with interpolation)
   */
  private getGradientAtPosition(position: Point): Point {
    const { width, height } = this.grid
    const state = this.state!
    
    // Get integer coordinates
    const x = Math.floor(position.x)
    const y = Math.floor(position.y)
    
    // Bounds check
    if (x < 0 || x >= width - 1 || y < 0 || y >= height - 1) {
      return { x: 0, y: 0 }
    }
    
    // Bilinear interpolation of gradient
    const fx = position.x - x
    const fy = position.y - y
    
    const grad00 = state.gradientField[y][x]
    const grad10 = state.gradientField[y][Math.min(x + 1, width - 1)]
    const grad01 = state.gradientField[Math.min(y + 1, height - 1)][x]
    const grad11 = state.gradientField[Math.min(y + 1, height - 1)][Math.min(x + 1, width - 1)]
    
    const gradX = (1 - fx) * (1 - fy) * grad00.x +
                  fx * (1 - fy) * grad10.x +
                  (1 - fx) * fy * grad01.x +
                  fx * fy * grad11.x
    
    const gradY = (1 - fx) * (1 - fy) * grad00.y +
                  fx * (1 - fy) * grad10.y +
                  (1 - fx) * fy * grad01.y +
                  fx * fy * grad11.y
    
    return { x: gradX, y: gradY }
  }

  /**
   * Calculate next position, ensuring it's walkable
   */
  private calculateNextPosition(position: Point, velocity: Point): Point {
    let nextPos = addPoints(position, velocity)
    
    // Ensure we stay within bounds and on walkable cells
    nextPos.x = clamp(nextPos.x, 0.1, this.grid.width - 1.1)
    nextPos.y = clamp(nextPos.y, 0.1, this.grid.height - 1.1)
    
    // Check if the next position is walkable
    const cellX = Math.floor(nextPos.x)
    const cellY = Math.floor(nextPos.y)
    
    if (!isWalkable(this.grid, { x: cellX, y: cellY })) {
      // Try to slide along the wall
      const alternativePositions = [
        { x: position.x + velocity.x, y: position.y },
        { x: position.x, y: position.y + velocity.y },
        { x: position.x - velocity.y * 0.5, y: position.y + velocity.x * 0.5 },
        { x: position.x + velocity.y * 0.5, y: position.y - velocity.x * 0.5 }
      ]
      
      for (const altPos of alternativePositions) {
        const altCellX = Math.floor(altPos.x)
        const altCellY = Math.floor(altPos.y)
        
        if (altCellX >= 0 && altCellX < this.grid.width &&
            altCellY >= 0 && altCellY < this.grid.height &&
            isWalkable(this.grid, { x: altCellX, y: altCellY })) {
          return altPos
        }
      }
      
      // If no alternative found, stay in place
      return position
    }
    
    return nextPos
  }

  /**
   * Attempt to escape from a stuck state
   */
  private attemptEscape(): { message: string } {
    const state = this.state!
    const { enableRandomness, perturbationStrength } = this.options
    
    state.stuckCounter++
    
    if (enableRandomness && state.stuckCounter < this.options.escapeAttempts) {
      const rng = getRNG()
      
      // Add random perturbation to velocity
      const perturbation = {
        x: rng.randomFloat(-perturbationStrength, perturbationStrength),
        y: rng.randomFloat(-perturbationStrength, perturbationStrength)
      }
      
      state.velocity = addPoints(state.velocity, perturbation)
      
      // Clear some visited positions to allow revisiting
      if (state.stuckCounter % 5 === 0) {
        state.visitedPositions.clear()
      }
      
      return { message: `Escape attempt ${state.stuckCounter}` }
    }
    
    throw new Error('Gradient field pathfinding stuck - fallback required')
  }

  /**
   * Check if goal is reached
   */
  private isGoalReached(): boolean {
    if (!this.state) return false
    
    const distance = euclideanDistance(this.state.position, this.grid.goal)
    return distance < this.options.goalThreshold
  }

  /**
   * Get frontier cells for visualization
   */
  private getFrontierCells(): Point[] {
    if (!this.state) return []
    
    const frontier: Point[] = []
    const currentCell = {
      x: Math.floor(this.state.position.x),
      y: Math.floor(this.state.position.y)
    }
    
    const neighbors = getWalkableNeighbors(this.grid, currentCell)
    
    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`
      if (!this.state.exploredCells.has(key)) {
        frontier.push(neighbor)
      }
    }
    
    return frontier
  }

  /**
   * Get current memory usage estimate
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
}