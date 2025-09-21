import React, { useState, useCallback, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import GridCanvas from './GridCanvas'
import ControlPanel from './ControlPanel'
import AlgorithmComparison from './AlgorithmComparison'
import PerformanceCharts from './PerformanceCharts'
import type { Point } from '../types/grid'
import { CellType } from '../types/grid'
import { setCell, updateStartGoal } from '../utils/gridUtils'
import { IntegratedSolver } from '../solver/integratedSolver'
import type { BenchmarkResult } from '../types/benchmarking'

/**
 * Main Application Component
 * 
 * Features:
 * - Real-time pathfinding visualization
 * - Interactive maze editing
 * - Step-by-step algorithm execution
 * - Performance monitoring
 * - Gradient field visualization
 * - Responsive layout
 */

interface PathfindingState {
  solver: IntegratedSolver | null
  isRunning: boolean
  isPaused: boolean
  currentStep: number
  gradientField: number[][] | null
  exploredCells: Point[]
  frontierCells: Point[]
  pathCells: Point[]
  animationSpeed: number
}

const ANIMATION_SPEEDS = {
  UNLIMITED: 0,
  FAST: 50,
  NORMAL: 200,
  SLOW: 500
} as const

type TabType = 'visualization' | 'comparison' | 'performance'

export const App: React.FC = () => {
  const {
    grid,
    setGrid,
    solverConfig,
    setBenchmarkResults
  } = useAppStore()

  const [activeTab, setActiveTab] = useState<TabType>('visualization')

  // Pathfinding visualization state
  const [pathfindingState, setPathfindingState] = useState<PathfindingState>({
    solver: null,
    isRunning: false,
    isPaused: false,
    currentStep: 0,
    gradientField: null,
    exploredCells: [],
    frontierCells: [],
    pathCells: [],
    animationSpeed: ANIMATION_SPEEDS.NORMAL
  })

  // Update ref whenever state changes
  React.useEffect(() => {
    pathfindingStateRef.current = pathfindingState
  }, [pathfindingState])

  // Animation frame reference
  const animationFrameRef = React.useRef<number | undefined>(undefined)
  const lastStepTimeRef = React.useRef<number>(0)
  const pathfindingStateRef = React.useRef(pathfindingState)

  // Initialize pathfinding solver
  const initializeSolver = useCallback(() => {
    try {
      const solver = new IntegratedSolver(grid, solverConfig)
      setPathfindingState(prev => ({
        ...prev,
        solver,
        currentStep: 0,
        exploredCells: [],
        frontierCells: [],
        pathCells: [],
        gradientField: null
      }))
      return solver
    } catch (error) {
      console.error('Failed to initialize solver:', error)
      return null
    }
  }, [grid, solverConfig])

  // Execute single pathfinding step
  const executeStep = useCallback((solver: IntegratedSolver) => {
    try {
      const stepResult = solver.step()
      
      // Update visualization state
      setPathfindingState(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1,
        exploredCells: [...stepResult.exploredCells],
        frontierCells: [...stepResult.frontierCells],
        pathCells: stepResult.currentPath ? [...stepResult.currentPath] : prev.pathCells,
        gradientField: stepResult.gradientField || prev.gradientField
      }))

      // Check if pathfinding is complete
      if (stepResult.isComplete) {
        const finalResult: BenchmarkResult = {
          algorithm: 'Gradient Field Pathfinding',
          pathFound: stepResult.pathFound,
          pathLength: stepResult.finalPath ? stepResult.finalPath.length : 0,
          executionTimeMs: stepResult.executionTimeMs,
          cellsExplored: stepResult.totalCellsExplored,
          memoryUsed: 0, // TODO: Implement memory tracking
          gridSize: grid.width * grid.height,
          mazeComplexity: calculateMazeComplexity()
        }

        setBenchmarkResults([finalResult])
        
        setPathfindingState(prev => ({
          ...prev,
          isRunning: false,
          pathCells: stepResult.finalPath ? [...stepResult.finalPath] : prev.pathCells
        }))

        return true // Complete
      }

      return false // Continue
    } catch (error) {
      console.error('Step execution error:', error)
      setPathfindingState(prev => ({ ...prev, isRunning: false }))
      return true // Stop on error
    }
  }, [grid.width, grid.height, setBenchmarkResults])

  // Calculate maze complexity metric
  const calculateMazeComplexity = useCallback((): number => {
    let wallCount = 0
    let totalCells = grid.width * grid.height

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.cells[y][x].type === CellType.Wall) {
          wallCount++
        }
      }
    }

    return wallCount / totalCells
  }, [grid])

  // Animation loop for continuous pathfinding
  const animationLoop = useCallback((timestamp: number) => {
    const currentState = pathfindingStateRef.current
    
    if (!currentState.solver || !currentState.isRunning) {
      console.log('🛑 Animation stopped: solver=' + !!currentState.solver + ', running=' + currentState.isRunning)
      return
    }

    const elapsed = timestamp - lastStepTimeRef.current
    const shouldExecute = currentState.animationSpeed === 0 || elapsed >= currentState.animationSpeed

    if (shouldExecute) {
      console.log('⚡ Executing step...')
      const isComplete = executeStep(currentState.solver)
      lastStepTimeRef.current = timestamp

      if (isComplete) {
        console.log('🏁 Algorithm completed')
        return // Stop animation
      }
      
      // For unlimited speed, run multiple steps per frame
      if (currentState.animationSpeed === 0) {
        // Run up to 50 steps per frame for unlimited speed
        for (let i = 0; i < 49; i++) {
          const nextComplete = executeStep(currentState.solver)
          if (nextComplete) {
            console.log('🏁 Algorithm completed (unlimited mode)')
            return
          }
        }
      }
    }

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(animationLoop)
  }, [executeStep])

  // Start pathfinding
  const handleStartPathfinding = useCallback(() => {
    console.log('🚀 Starting pathfinding...')
    const solver = initializeSolver()
    if (!solver) {
      console.error('❌ Failed to initialize solver')
      return
    }

    console.log('✅ Solver initialized, starting animation...')
    setPathfindingState(prev => ({
      ...prev,
      solver,
      isRunning: true,
      isPaused: false
    }))

    lastStepTimeRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(animationLoop)
    console.log('🎬 Animation frame requested')
  }, [initializeSolver, animationLoop])

  // Stop pathfinding
  const handleStopPathfinding = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    setPathfindingState(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false
    }))
  }, [])

  // Execute single step
  const handleStepPathfinding = useCallback(() => {
    if (!pathfindingState.solver) {
      const solver = initializeSolver()
      if (!solver) return
      
      setPathfindingState(prev => ({ ...prev, solver }))
      executeStep(solver)
    } else {
      executeStep(pathfindingState.solver)
    }
  }, [pathfindingState.solver, initializeSolver, executeStep])

  // Reset visualization
  const handleResetVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    setPathfindingState({
      solver: null,
      isRunning: false,
      isPaused: false,
      currentStep: 0,
      gradientField: null,
      exploredCells: [],
      frontierCells: [],
      pathCells: [],
      animationSpeed: ANIMATION_SPEEDS.NORMAL
    })
  }, [])

  // Handle grid cell clicks (wall editing)
  const handleCellClick = useCallback((point: Point, cellType: CellType) => {
    if (pathfindingState.isRunning) return

    const newGrid = { ...grid }
    setCell(newGrid, point, cellType)
    setGrid(newGrid)
  }, [grid, setGrid, pathfindingState.isRunning])

  // Handle start position drag
  const handleStartDrag = useCallback((newStart: Point) => {
    if (pathfindingState.isRunning) return

    const newGrid = updateStartGoal(grid, newStart, grid.goal)
    setGrid(newGrid)
  }, [grid, setGrid, pathfindingState.isRunning])

  // Handle goal position drag
  const handleGoalDrag = useCallback((newGoal: Point) => {
    if (pathfindingState.isRunning) return

    const newGrid = updateStartGoal(grid, grid.start, newGoal)
    setGrid(newGrid)
  }, [grid, setGrid, pathfindingState.isRunning])

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">
            Novel Maze Pathfinding
          </h1>
          <p className="text-gray-600 mt-1">
            Gradient Field Pathfinding with Completeness Fallback
          </p>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('visualization')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'visualization'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🎮 Interactive Visualization
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'comparison'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Algorithm Comparison
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'performance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📈 Performance Analytics
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'visualization' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Visualization Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Canvas Container */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Maze Visualization
                </h2>
                
                {/* Visualization Controls */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Speed:</label>
                    <select
                      value={pathfindingState.animationSpeed}
                      onChange={(e) => setPathfindingState(prev => ({
                        ...prev,
                        animationSpeed: parseInt(e.target.value)
                      }))}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                      disabled={pathfindingState.isRunning}
                    >
                      <option value={ANIMATION_SPEEDS.UNLIMITED}>Unlimited</option>
                      <option value={ANIMATION_SPEEDS.FAST}>Fast</option>
                      <option value={ANIMATION_SPEEDS.NORMAL}>Normal</option>
                      <option value={ANIMATION_SPEEDS.SLOW}>Slow</option>
                    </select>
                  </div>

                  <div className="text-sm text-gray-600">
                    Step: {pathfindingState.currentStep}
                  </div>
                </div>
              </div>

              {/* Grid Canvas */}
              <div className="flex justify-center">
                <GridCanvas
                  onCellClick={handleCellClick}
                  onStartDrag={handleStartDrag}
                  onGoalDrag={handleGoalDrag}
                  showGradientField={true}
                  gradientField={pathfindingState.gradientField || undefined}
                  exploredCells={pathfindingState.exploredCells}
                  frontierCells={pathfindingState.frontierCells}
                  pathCells={pathfindingState.pathCells}
                />
              </div>
            </div>

            {/* Algorithm Status */}
            {pathfindingState.solver && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Algorithm Status
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-blue-600 font-medium">Current Phase</div>
                    <div className="text-blue-900">
                      {pathfindingState.solver.getCurrentPhase()}
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-green-600 font-medium">Explored Cells</div>
                    <div className="text-green-900">
                      {pathfindingState.exploredCells.length}
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <div className="text-yellow-600 font-medium">Frontier Cells</div>
                    <div className="text-yellow-900">
                      {pathfindingState.frontierCells.length}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-purple-600 font-medium">Path Length</div>
                    <div className="text-purple-900">
                      {pathfindingState.pathCells.length}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Control Panel */}
          <div className="lg:col-span-1">
            <ControlPanel
              onStartPathfinding={handleStartPathfinding}
              onStopPathfinding={handleStopPathfinding}
              onResetVisualization={handleResetVisualization}
              onStepPathfinding={handleStepPathfinding}
              isPathfinding={pathfindingState.isRunning}
              canStep={!pathfindingState.isRunning}
            />
          </div>
        </div>
        )}

        {activeTab === 'comparison' && (
          <AlgorithmComparison />
        )}

        {activeTab === 'performance' && (
          <PerformanceCharts />
        )}
      </main>
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4 mt-12">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-600">
          <p>
            Novel Gradient Field Pathfinding Algorithm • Built with React + TypeScript + Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App