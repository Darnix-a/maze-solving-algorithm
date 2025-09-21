import React, { useRef, useEffect, useCallback, useState } from 'react'
import type { Grid, Point } from '../types/grid'
import { CellType } from '../types/grid'
import { useAppStore } from '../store/appStore'
import { setCell } from '../utils/gridUtils'

/**
 * Interactive Grid Canvas Component
 * 
 * Features:
 * - Layered rendering: background, gradient field, cells, paths, UI overlays
 * - Drag-and-drop start/goal repositioning
 * - Wall painting tool with click-and-drag
 * - Real-time gradient field visualization
 * - Responsive canvas sizing
 * - High-performance rendering with requestAnimationFrame
 */

interface GridCanvasProps {
  className?: string
  onCellClick?: (point: Point, cellType: CellType) => void
  onStartDrag?: (point: Point) => void
  onGoalDrag?: (point: Point) => void
  showGradientField?: boolean
  gradientField?: number[][]
  exploredCells?: Point[]
  frontierCells?: Point[]
  pathCells?: Point[]
}

interface CanvasLayers {
  background: HTMLCanvasElement
  gradient: HTMLCanvasElement
  cells: HTMLCanvasElement
  overlay: HTMLCanvasElement
}

const MAX_CANVAS_WIDTH = 600  // Maximum width of canvas
const MAX_CANVAS_HEIGHT = 600 // Maximum height of canvas
const MIN_CELL_SIZE = 4       // Minimum cell size in pixels
const MAX_CELL_SIZE = 25      // Maximum cell size in pixels
const GRID_PADDING = 2
const GRADIENT_ALPHA = 0.3
const PATH_WIDTH_RATIO = 0.15 // Path width as ratio of cell size

export const GridCanvas: React.FC<GridCanvasProps> = ({
  className,
  onCellClick,
  onStartDrag,
  onGoalDrag,
  showGradientField = true,
  gradientField,
  exploredCells = [],
  frontierCells = [],
  pathCells = []
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const layersRef = useRef<Partial<CanvasLayers>>({})
  const [isDragging, setIsDragging] = useState<'start' | 'goal' | 'wall' | null>(null)
  const [lastPaintedCell, setLastPaintedCell] = useState<Point | null>(null)
  
  const grid = useAppStore(state => state.grid)
  const setGrid = useAppStore(state => state.setGrid)
  
  // Calculate optimal cell size based on grid dimensions
  const calculateCellSize = useCallback(() => {
    // Calculate cell size that fits within max canvas dimensions
    const maxCellWidth = Math.floor((MAX_CANVAS_WIDTH - GRID_PADDING * 2) / grid.width)
    const maxCellHeight = Math.floor((MAX_CANVAS_HEIGHT - GRID_PADDING * 2) / grid.height)
    
    // Use the smaller of the two to ensure the grid fits in both dimensions
    const optimalCellSize = Math.min(maxCellWidth, maxCellHeight)
    
    // Clamp between min and max cell size
    return Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, optimalCellSize))
  }, [grid.width, grid.height])
  
  const cellSize = calculateCellSize()
  const pathWidth = Math.max(1, Math.round(cellSize * PATH_WIDTH_RATIO))
  
  // Canvas dimensions
  const canvasWidth = grid.width * cellSize + GRID_PADDING * 2
  const canvasHeight = grid.height * cellSize + GRID_PADDING * 2

  // Initialize canvas layers
  useEffect(() => {
    if (!canvasRef.current) return

    const container = canvasRef.current
    container.innerHTML = '' // Clear existing canvases

    // Create layered canvases
    const layers = ['background', 'gradient', 'cells', 'overlay'] as const
    const newLayers: Partial<CanvasLayers> = {}

    layers.forEach((layerName, index) => {
      const canvas = document.createElement('canvas')
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      canvas.style.position = 'absolute'
      canvas.style.top = '0'
      canvas.style.left = '0'
      canvas.style.zIndex = index.toString()
      canvas.style.pointerEvents = layerName === 'overlay' ? 'auto' : 'none'
      
      container.appendChild(canvas)
      newLayers[layerName] = canvas
    })

    layersRef.current = newLayers
    
    // Set up event handlers on overlay canvas
    if (newLayers.overlay) {
      newLayers.overlay.style.cursor = 'pointer'
    }
  }, [canvasWidth, canvasHeight])

  // Convert canvas coordinates to grid coordinates
  const canvasToGrid = useCallback((canvasX: number, canvasY: number): Point => {
    const rect = layersRef.current.overlay?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    
    const x = Math.floor((canvasX - rect.left - GRID_PADDING) / cellSize)
    const y = Math.floor((canvasY - rect.top - GRID_PADDING) / cellSize)
    
    return {
      x: Math.max(0, Math.min(x, grid.width - 1)),
      y: Math.max(0, Math.min(y, grid.height - 1))
    }
  }, [grid.width, grid.height, cellSize])

  // Convert grid coordinates to canvas coordinates
  const gridToCanvas = useCallback((point: Point): Point => ({
    x: point.x * cellSize + GRID_PADDING + cellSize / 2,
    y: point.y * cellSize + GRID_PADDING + cellSize / 2
  }), [cellSize])

  // Render background grid
  const renderBackground = useCallback(() => {
    const canvas = layersRef.current.background
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Grid background
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Grid lines
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1

    // Vertical lines
    for (let x = 0; x <= grid.width; x++) {
      const canvasX = x * cellSize + GRID_PADDING
      ctx.beginPath()
      ctx.moveTo(canvasX, GRID_PADDING)
      ctx.lineTo(canvasX, canvas.height - GRID_PADDING)
      ctx.stroke()
    }

    // Horizontal lines
    for (let y = 0; y <= grid.height; y++) {
      const canvasY = y * cellSize + GRID_PADDING
      ctx.beginPath()
      ctx.moveTo(GRID_PADDING, canvasY)
      ctx.lineTo(canvas.width - GRID_PADDING, canvasY)
      ctx.stroke()
    }
  }, [grid.width, grid.height, cellSize])

  // Render gradient field heatmap
  const renderGradientField = useCallback(() => {
    const canvas = layersRef.current.gradient
    if (!canvas || !showGradientField || !gradientField) return

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Find min/max values for normalization
    let minValue = Infinity
    let maxValue = -Infinity

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (gradientField[y] && gradientField[y][x] !== undefined) {
          const value = gradientField[y][x]
          if (isFinite(value)) {
            minValue = Math.min(minValue, value)
            maxValue = Math.max(maxValue, value)
          }
        }
      }
    }

    if (!isFinite(minValue) || !isFinite(maxValue) || minValue === maxValue) return

    // Render gradient field as heatmap
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (gradientField[y] && gradientField[y][x] !== undefined) {
          const value = gradientField[y][x]
          if (isFinite(value)) {
            const normalized = (value - minValue) / (maxValue - minValue)
            const intensity = 1 - normalized // Invert so goal (min value) is bright
            
            // Color from blue (high potential) to red (low potential/goal)
            const red = Math.round(255 * intensity)
            const green = Math.round(100 * (1 - Math.abs(intensity - 0.5) * 2))
            const blue = Math.round(255 * (1 - intensity))
            
            ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${GRADIENT_ALPHA})`
            ctx.fillRect(
              x * cellSize + GRID_PADDING,
              y * cellSize + GRID_PADDING,
              cellSize,
              cellSize
            )
          }
        }
      }
    }
  }, [grid.height, grid.width, showGradientField, gradientField, cellSize])

  // Render maze cells
  const renderCells = useCallback(() => {
    const canvas = layersRef.current.cells
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Render each cell
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const cell = grid.cells[y][x]
        const cellX = x * cellSize + GRID_PADDING
        const cellY = y * cellSize + GRID_PADDING

        // Base cell color
        let fillStyle = '#ffffff'
        
        switch (cell.type) {
          case CellType.Wall:
            fillStyle = '#2d3748'
            break
          case CellType.Start:
            fillStyle = '#38a169'
            break
          case CellType.Goal:
            fillStyle = '#e53e3e'
            break
          case CellType.Empty:
            // Check for visualization states
            const point = { x, y }
            if (exploredCells.some(p => p.x === x && p.y === y)) {
              fillStyle = '#bee3f8'
            } else if (frontierCells.some(p => p.x === x && p.y === y)) {
              fillStyle = '#fbb6ce'
            }
            break
        }

        ctx.fillStyle = fillStyle
        ctx.fillRect(cellX, cellY, cellSize, cellSize)

        // Add border for special cells
        if (cell.type === CellType.Start || cell.type === CellType.Goal) {
          ctx.strokeStyle = cell.type === CellType.Start ? '#2f855a' : '#c53030'
          ctx.lineWidth = Math.max(1, Math.round(cellSize / 10))
          ctx.strokeRect(cellX + 1, cellY + 1, cellSize - 2, cellSize - 2)
        }
      }
    }
  }, [grid, exploredCells, frontierCells, cellSize])

  // Render path and overlay elements
  const renderOverlay = useCallback(() => {
    const canvas = layersRef.current.overlay
    if (!canvas) return

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Render path
    if (pathCells.length > 1) {
      ctx.strokeStyle = '#3182ce'
      ctx.lineWidth = pathWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      ctx.beginPath()
      const firstPoint = gridToCanvas(pathCells[0])
      ctx.moveTo(firstPoint.x, firstPoint.y)
      
      for (let i = 1; i < pathCells.length; i++) {
        const point = gridToCanvas(pathCells[i])
        ctx.lineTo(point.x, point.y)
      }
      
      ctx.stroke()
    }

    // Add start/goal icons
    const startIcon = '🎯'
    const goalIcon = '🏁'
    
    ctx.font = `${Math.max(8, cellSize - 4)}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    const startPos = gridToCanvas(grid.start)
    ctx.fillText(startIcon, startPos.x, startPos.y)
    
    const goalPos = gridToCanvas(grid.goal)
    ctx.fillText(goalIcon, goalPos.x, goalPos.y)
  }, [pathCells, grid.start, grid.goal, gridToCanvas, pathWidth, cellSize])

  // Re-render all layers when dependencies change
  useEffect(() => {
    requestAnimationFrame(() => {
      renderBackground()
      renderGradientField()
      renderCells()
      renderOverlay()
    })
  }, [renderBackground, renderGradientField, renderCells, renderOverlay])

  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    const point = canvasToGrid(event.clientX, event.clientY)
    const cell = grid.cells[point.y][point.x]

    if (cell.type === CellType.Start) {
      setIsDragging('start')
    } else if (cell.type === CellType.Goal) {
      setIsDragging('goal')
    } else if (cell.type === CellType.Empty) {
      // Start wall painting
      setIsDragging('wall')
      const newGrid = { ...grid }
      setCell(newGrid, point, CellType.Wall)
      setGrid(newGrid)
      setLastPaintedCell(point)
      onCellClick?.(point, CellType.Wall)
    }

    event.preventDefault()
  }, [canvasToGrid, grid, setGrid, onCellClick])

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging) return

    const point = canvasToGrid(event.clientX, event.clientY)

    if (isDragging === 'start') {
      if (grid.cells[point.y][point.x].type === CellType.Empty) {
        onStartDrag?.(point)
      }
    } else if (isDragging === 'goal') {
      if (grid.cells[point.y][point.x].type === CellType.Empty) {
        onGoalDrag?.(point)
      }
    } else if (isDragging === 'wall') {
      // Continue wall painting
      if (!lastPaintedCell || point.x !== lastPaintedCell.x || point.y !== lastPaintedCell.y) {
        if (grid.cells[point.y][point.x].type === CellType.Empty) {
          const newGrid = { ...grid }
          setCell(newGrid, point, CellType.Wall)
          setGrid(newGrid)
          setLastPaintedCell(point)
          onCellClick?.(point, CellType.Wall)
        }
      }
    }
  }, [isDragging, canvasToGrid, grid, lastPaintedCell, onStartDrag, onGoalDrag, setGrid, onCellClick])

  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
    setLastPaintedCell(null)
  }, [])

  const handleRightClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    const point = canvasToGrid(event.clientX, event.clientY)
    
    // Right click to remove walls
    if (grid.cells[point.y][point.x].type === CellType.Wall) {
      const newGrid = { ...grid }
      setCell(newGrid, point, CellType.Empty)
      setGrid(newGrid)
      onCellClick?.(point, CellType.Empty)
    }
  }, [canvasToGrid, grid, setGrid, onCellClick])

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Grid size indicator */}
      <div className="mb-2 text-sm text-gray-600">
        Grid Size: {grid.width} × {grid.height} | Cell Size: {cellSize}px
      </div>
      
      <div
        ref={canvasRef}
        className="relative border border-gray-300 rounded-lg shadow-sm"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          cursor: isDragging ? 'grabbing' : 'pointer',
          maxWidth: '100%',
          maxHeight: '70vh'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleRightClick}
      />
    </div>
  )
}

export default GridCanvas