import type { Point } from '../types/grid'

/**
 * Mathematical utility functions for grid operations and pathfinding
 */

/**
 * Clamp a value between min and max bounds
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Calculate Manhattan distance between two points
 */
export function manhattanDistance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

/**
 * Calculate Euclidean distance between two points
 */
export function euclideanDistance(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Calculate squared Euclidean distance (avoids sqrt for performance)
 */
export function euclideanDistanceSquared(a: Point, b: Point): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

/**
 * Check if two points are equal
 */
export function pointsEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y
}

/**
 * Create a copy of a point
 */
export function clonePoint(point: Point): Point {
  return { x: point.x, y: point.y }
}

/**
 * Add two points (vector addition)
 */
export function addPoints(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y }
}

/**
 * Subtract two points (vector subtraction)
 */
export function subtractPoints(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y }
}

/**
 * Scale a point by a scalar value
 */
export function scalePoint(point: Point, scalar: number): Point {
  return { x: point.x * scalar, y: point.y * scalar }
}

/**
 * Calculate the magnitude (length) of a vector
 */
export function vectorMagnitude(vector: Point): number {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y)
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vector: Point): Point {
  const magnitude = vectorMagnitude(vector)
  if (magnitude === 0) {
    return { x: 0, y: 0 }
  }
  return { x: vector.x / magnitude, y: vector.y / magnitude }
}

/**
 * Calculate the dot product of two vectors
 */
export function dotProduct(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y
}

/**
 * Find the index of the minimum value in an array
 */
export function argMin(array: number[]): number {
  if (array.length === 0) return -1
  
  let minIndex = 0
  let minValue = array[0]
  
  for (let i = 1; i < array.length; i++) {
    if (array[i] < minValue) {
      minValue = array[i]
      minIndex = i
    }
  }
  
  return minIndex
}

/**
 * Find the index of the maximum value in an array
 */
export function argMax(array: number[]): number {
  if (array.length === 0) return -1
  
  let maxIndex = 0
  let maxValue = array[0]
  
  for (let i = 1; i < array.length; i++) {
    if (array[i] > maxValue) {
      maxValue = array[i]
      maxIndex = i
    }
  }
  
  return maxIndex
}

/**
 * Check if a point is within grid bounds
 */
export function isInBounds(point: Point, width: number, height: number): boolean {
  return point.x >= 0 && point.x < width && point.y >= 0 && point.y < height
}

/**
 * Get the 4-connected neighbors of a point (up, down, left, right)
 */
export function getNeighbors4(point: Point): Point[] {
  return [
    { x: point.x, y: point.y - 1 }, // up
    { x: point.x, y: point.y + 1 }, // down
    { x: point.x - 1, y: point.y }, // left
    { x: point.x + 1, y: point.y }, // right
  ]
}

/**
 * Get the 8-connected neighbors of a point (including diagonals)
 */
export function getNeighbors8(point: Point): Point[] {
  return [
    { x: point.x - 1, y: point.y - 1 }, // top-left
    { x: point.x, y: point.y - 1 },     // top
    { x: point.x + 1, y: point.y - 1 }, // top-right
    { x: point.x - 1, y: point.y },     // left
    { x: point.x + 1, y: point.y },     // right
    { x: point.x - 1, y: point.y + 1 }, // bottom-left
    { x: point.x, y: point.y + 1 },     // bottom
    { x: point.x + 1, y: point.y + 1 }, // bottom-right
  ]
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Map a value from one range to another
 */
export function mapRange(
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number
): number {
  const fromRange = fromMax - fromMin
  const toRange = toMax - toMin
  const scaledValue = (value - fromMin) / fromRange
  return toMin + scaledValue * toRange
}

/**
 * Calculate statistics for an array of numbers
 */
export function calculateStats(values: number[]) {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      variance: 0,
    }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)]

  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)

  return {
    mean,
    median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    stdDev,
    variance,
  }
}