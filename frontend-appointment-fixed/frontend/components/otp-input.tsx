'use client'

import { useEffect, useRef, useState } from 'react'

interface OtpInputProps {
  /** Current OTP value (parent-controlled). 0–6 chars. */
  value: string
  /** Called whenever the OTP changes — string of length 0..6. */
  onChange: (value: string) => void
  /** Called with the full OTP when the user types/pastes the 6th digit. */
  onComplete?: (value: string) => void
  /** Disable all inputs (e.g., while submitting). */
  disabled?: boolean
  /** Show inputs in error state (red border). */
  error?: boolean
  /** Auto-focus the first input on mount. Default true. */
  autoFocus?: boolean
}

/**
 * Six independent number inputs that behave like one OTP field.
 *  - Typing a digit advances focus to the next box.
 *  - Backspace on an empty box moves focus back.
 *  - Pasting a 6-digit number distributes one digit per box.
 *  - Arrow keys move between boxes.
 *  - Non-digit input is silently dropped.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  error,
  autoFocus = true
}: OtpInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const [focusedIndex, setFocusedIndex] = useState(0)

  useEffect(() => {
    if (autoFocus) inputs.current[0]?.focus()
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setDigitAt = (index: number, digit: string) => {
    const next = value.split('')
    while (next.length < 6) next.push('')
    next[index] = digit
    const joined = next.join('').slice(0, 6).replace(/\s/g, '')
    onChange(joined)
    if (joined.length === 6 && !joined.includes('') && onComplete) {
      onComplete(joined)
    }
  }

  const handleChange = (i: number, raw: string) => {
    // Strip non-digits; only accept the LAST char (in case browser autofill stuffs more).
    const digit = raw.replace(/\D/g, '').slice(-1)
    if (!digit) return
    setDigitAt(i, digit)
    if (i < 5) {
      inputs.current[i + 1]?.focus()
      setFocusedIndex(i + 1)
    }
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const arr = value.split('')
      if (arr[i]) {
        // Clear current
        setDigitAt(i, '')
      } else if (i > 0) {
        // Move back AND clear previous
        setDigitAt(i - 1, '')
        inputs.current[i - 1]?.focus()
        setFocusedIndex(i - 1)
      }
      e.preventDefault()
    } else if (e.key === 'ArrowLeft' && i > 0) {
      inputs.current[i - 1]?.focus()
      setFocusedIndex(i - 1)
    } else if (e.key === 'ArrowRight' && i < 5) {
      inputs.current[i + 1]?.focus()
      setFocusedIndex(i + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    onChange(pasted)
    if (pasted.length === 6 && onComplete) onComplete(pasted)
    const targetIdx = Math.min(pasted.length, 5)
    inputs.current[targetIdx]?.focus()
    setFocusedIndex(targetIdx)
  }

  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      {Array.from({ length: 6 }).map((_, i) => {
        const ch = value[i] ?? ''
        return (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el
            }}
            type="text"
            inputMode="numeric"
            pattern="\d{1}"
            maxLength={1}
            value={ch}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={() => setFocusedIndex(i)}
            aria-label={`Digit ${i + 1} of 6`}
            className={[
              'h-12 w-10 sm:h-14 sm:w-12 text-center text-xl sm:text-2xl font-bold rounded-lg border-2 bg-background text-foreground',
              'transition-all',
              disabled ? 'opacity-50' : '',
              error
                ? 'border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/30'
                : focusedIndex === i
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/30',
              'focus:outline-none'
            ].join(' ')}
          />
        )
      })}
    </div>
  )
}
