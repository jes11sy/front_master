'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { ru } from 'date-fns/locale'

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onChange: (startDate: string, endDate: string) => void
  isDark: boolean
}

const toLocalDateString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseLocalDateString = (value: string) => {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

const formatDisplayDate = (value: string) => {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}.${month}.${year}`
}

export function DateRangePicker({ startDate, endDate, onChange, isDark }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(undefined)
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date())
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = useMemo<DateRange | undefined>(() => {
    const from = parseLocalDateString(startDate)
    const to = parseLocalDateString(endDate)
    if (!from && !to) return undefined
    return { from, to }
  }, [startDate, endDate])

  useEffect(() => {
    if (!isOpen) return
    setDraftRange(selected)
    setDisplayMonth(selected?.from ?? new Date())
    setShowMonthYearPicker(false)
  }, [isOpen, selected])

  useEffect(() => {
    if (!isOpen) return
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [isOpen])

  const label = startDate && endDate
    ? `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`
    : startDate
      ? `C ${formatDisplayDate(startDate)}`
      : 'Выберите диапазон дат'

  const applyRange = () => {
    const from = draftRange?.from ? toLocalDateString(draftRange.from) : ''
    const to = draftRange?.to ? toLocalDateString(draftRange.to) : ''
    onChange(from, to)
    setIsOpen(false)
  }

  const selectedBg = isDark ? '#ffffff' : '#0a4f42'
  const selectedText = isDark ? '#111113' : '#ffffff'
  const middleBg = isDark ? 'rgba(255, 255, 255, 0.82)' : 'rgba(10, 79, 66, 0.85)'
  const monthTitle = displayMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  const monthOptions = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full min-h-[44px] px-4 py-2 rounded-2xl text-[15px] transition-all shadow-sm flex items-center justify-between ${
          isDark ? 'bg-white/[0.04] text-white' : 'border border-[#cfd2d8] bg-white text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)]'
        }`}
      >
        <span className={startDate || endDate ? '' : (isDark ? 'text-white/50' : 'text-[#8e8e93]')}>{label}</span>
        <svg className={`h-4 w-4 ${isDark ? 'text-white/60' : 'text-[#6e6e73]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-[10000] mt-2 w-full rounded-2xl border p-3 ${
            isDark ? 'border-white/10 bg-[#1b1718] shadow-[0_20px_40px_rgba(0,0,0,0.45)]' : 'border-[#cfd2d8] bg-white shadow-[0_20px_40px_rgba(15,23,42,0.18)]'
          }`}
          style={{ '--drp-selected-bg': selectedBg, '--drp-selected-text': selectedText, '--drp-middle-bg': middleBg } as React.CSSProperties}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button type="button" onClick={() => setDisplayMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))} className={`flex h-7 w-7 items-center justify-center rounded-md ${isDark ? 'text-white/75 hover:bg-white/10' : 'text-[#6e6e73] hover:bg-black/[0.05]'}`}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m15 19-7-7 7-7" /></svg>
            </button>
            <button type="button" onClick={() => setShowMonthYearPicker((p) => !p)} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-semibold capitalize ${isDark ? 'text-white hover:bg-white/10' : 'text-[#111113] hover:bg-black/[0.05]'}`}>
              <span>{monthTitle}</span>
              <svg className={`h-4 w-4 transition-transform ${showMonthYearPicker ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <button type="button" onClick={() => setDisplayMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))} className={`flex h-7 w-7 items-center justify-center rounded-md ${isDark ? 'text-white/75 hover:bg-white/10' : 'text-[#6e6e73] hover:bg-black/[0.05]'}`}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 5 7 7-7 7" /></svg>
            </button>
          </div>

          {showMonthYearPicker && (
            <div className="mb-2 grid grid-cols-2 gap-2">
              <select value={displayMonth.getMonth()} onChange={(e) => setDisplayMonth((p) => new Date(p.getFullYear(), Number(e.target.value), 1))} className={`h-9 rounded-xl px-2 text-sm outline-none ${isDark ? 'bg-white/[0.06] text-white border border-white/15' : 'bg-white text-[#111113] border border-[#cfd2d8]'}`}>
                {monthOptions.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select value={displayMonth.getFullYear()} onChange={(e) => setDisplayMonth((p) => new Date(Number(e.target.value), p.getMonth(), 1))} className={`h-9 rounded-xl px-2 text-sm outline-none ${isDark ? 'bg-white/[0.06] text-white border border-white/15' : 'bg-white text-[#111113] border border-[#cfd2d8]'}`}>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          <DayPicker
            mode="range"
            locale={ru}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            numberOfMonths={1}
            selected={draftRange}
            onSelect={setDraftRange}
            className="w-full"
            classNames={{
              months: 'flex justify-center',
              month: 'w-full',
              caption: 'hidden',
              month_caption: 'hidden',
              caption_label: 'hidden',
              nav: 'hidden',
              weekdays: 'grid grid-cols-7 mb-1',
              weekday: `text-center text-[11px] font-semibold uppercase ${isDark ? 'text-white/45' : 'text-black/45'}`,
              weeks: 'space-y-1',
              week: 'grid grid-cols-7',
              day: 'flex justify-center',
              day_button: `h-9 w-9 rounded-lg text-sm transition-colors !bg-transparent !text-inherit ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#e8f2ef]'}`,
              today: isDark ? 'ring-1 ring-white/35' : 'ring-1 ring-[#0a4f42]/35',
              outside: isDark ? 'text-white/30' : 'text-black/25',
            }}
            modifiersStyles={{
              selected: { backgroundColor: selectedBg, color: selectedText },
              range_start: { backgroundColor: selectedBg, color: selectedText },
              range_end: { backgroundColor: selectedBg, color: selectedText },
              range_middle: { backgroundColor: middleBg, color: selectedText },
            }}
          />

          <div className={`mt-2 flex items-center justify-end gap-2 border-t pt-2 ${isDark ? 'border-white/10' : 'border-black/[0.08]'}`}>
            <button type="button" onClick={() => { setDraftRange(undefined); onChange('', '') }} className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${isDark ? 'bg-white/[0.08] text-white hover:bg-white/[0.14]' : 'border border-[#cfd2d8] bg-white text-[#111113] hover:bg-[#f3f4f6]'}`}>Сброс</button>
            <button type="button" onClick={applyRange} className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${isDark ? 'bg-white text-[#111113] hover:bg-gray-200' : 'bg-[#0a4f42] text-white hover:bg-[#083f35]'}`}>Применить</button>
          </div>
        </div>
      )}
    </div>
  )
}
