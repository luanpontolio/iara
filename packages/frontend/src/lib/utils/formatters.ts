/**
 * Formatting Utilities
 * 
 * Centralized formatting functions for consistent data display.
 */

/**
 * Format Ethereum address to shortened format
 * 
 * @example
 * formatAddress('0x1234567890abcdef1234567890abcdef12345678')
 * // => '0x1234…5678'
 */
export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address) return '—';
  if (address.length <= startChars + endChars) return address;
  
  return `${address.slice(0, startChars)}…${address.slice(-endChars)}`;
}

/**
 * Format score to 2 decimal places
 * 
 * @example
 * formatScore(0.9723) // => '0.97'
 * formatScore('—') // => '—'
 */
export function formatScore(score: number | string): string {
  if (typeof score === 'string') return score;
  if (isNaN(score)) return '—';
  
  return score.toFixed(2);
}

/**
 * Format latency in milliseconds
 * 
 * @example
 * formatLatency(142) // => '142ms'
 * formatLatency(1500) // => '1.5s'
 */
export function formatLatency(ms: number | string): string {
  if (typeof ms === 'string') return ms;
  if (isNaN(ms) || ms < 0) return '—';
  
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  
  return `${Math.round(ms)}ms`;
}

/**
 * Format currency with proper decimals
 * 
 * @example
 * formatCurrency(1.5, 'USDC') // => '1.50 USDC'
 * formatCurrency(1000, '0G') // => '1,000.00 0G'
 */
export function formatCurrency(
  amount: number | string,
  currency: string = 'USDC',
  decimals: number = 2
): string {
  if (typeof amount === 'string') {
    // Try to extract number from string like "1.00 USDC"
    const match = amount.match(/[\d.]+/);
    if (!match) return amount;
    amount = parseFloat(match[0]);
  }
  
  if (isNaN(amount)) return '—';
  
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  
  return `${formatted} ${currency}`;
}

/**
 * Format block number
 * 
 * @example
 * formatBlock(21304991) // => '#21,304,991'
 * formatBlock('#21304991') // => '#21,304,991'
 */
export function formatBlock(block: number | string): string {
  if (typeof block === 'string') {
    if (block.startsWith('#')) {
      const num = parseInt(block.slice(1).replace(/,/g, ''));
      if (!isNaN(num)) {
        return `#${num.toLocaleString('en-US')}`;
      }
    }
    return block;
  }
  
  if (isNaN(block)) return '—';
  
  return `#${block.toLocaleString('en-US')}`;
}

/**
 * Format time elapsed
 * 
 * @example
 * formatTimeElapsed(120) // => '2 min ago'
 * formatTimeElapsed(3600) // => '1 hour ago'
 * formatTimeElapsed(86400) // => '1 day ago'
 */
export function formatTimeElapsed(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

/**
 * Format percentage
 * 
 * @example
 * formatPercentage(0.7) // => '70%'
 * formatPercentage(70) // => '70%'
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  if (isNaN(value)) return '—';
  
  // Convert to percentage if value is between 0 and 1
  const percentage = value <= 1 ? value * 100 : value;
  
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format test count
 * 
 * @example
 * formatTestCount(10, 14) // => '10/14'
 * formatTestCount('10/14') // => '10/14'
 */
export function formatTestCount(completed: number | string, total?: number): string {
  if (typeof completed === 'string') return completed;
  if (total === undefined) return `${completed}`;
  
  return `${completed}/${total}`;
}

/**
 * Pluralize word based on count
 * 
 * @example
 * pluralize(1, 'agent') // => 'agent'
 * pluralize(2, 'agent') // => 'agents'
 * pluralize(0, 'test', 'tests') // => 'tests'
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

/**
 * Format foroId
 * 
 * @example
 * formatForoId('foro_0x1234567890abcdef') // => 'foro_0x1234…cdef'
 */
export function formatForoId(foroId: string): string {
  if (!foroId || !foroId.includes('_')) return foroId;
  
  const [prefix, address] = foroId.split('_');
  if (!address) return foroId;
  return `${prefix}_${formatAddress(address, 6, 4)}`;
}
