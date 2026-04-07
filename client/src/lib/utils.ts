import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safe formatting utility for amounts with proper type checking
 * Handles cases where amount might be string, undefined, or null
 * @param amount - The amount to format (can be string, number, null, or undefined)
 * @param options - Formatting options
 */
export function formatCurrencyAmount(
  amount: any,
  options: {
    currency?: string
    locale?: string
    minimumFractionDigits?: number
    maximumFractionDigits?: number
  } = {}
): string {
  const {
    currency = "₹",
    locale = "en-IN",
    minimumFractionDigits = 0,
    maximumFractionDigits = minimumFractionDigits,
  } = options

  // Convert to number
  let numAmount: number
  if (typeof amount === "number") {
    numAmount = amount
  } else if (typeof amount === "string") {
    numAmount = parseFloat(amount)
  } else {
    numAmount = 0
  }

  // Check if conversion was successful
  if (isNaN(numAmount)) {
    numAmount = 0
  }

  try {
    return `${currency}${numAmount.toLocaleString(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    })}`
  } catch (error) {
    // Fallback if toLocaleString fails
    return `${currency}${numAmount.toFixed(minimumFractionDigits)}`
  }
}

/**
 * Format amount in INR (Indian Rupees)
 */
export function formatINR(amount: any, decimals = 0): string {
  return formatCurrencyAmount(amount, {
    currency: "₹",
    locale: "en-IN",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format amount in USD
 */
export function formatUSD(amount: any, decimals = 2): string {
  return formatCurrencyAmount(amount, {
    currency: "$",
    locale: "en-US",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

