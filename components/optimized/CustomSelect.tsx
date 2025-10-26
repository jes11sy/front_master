/**
 * Оптимизированный кастомный селект с React.memo
 */

'use client'

import React, { useEffect, useCallback } from 'react'

interface Option {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  compact?: boolean
  disabled?: boolean
  selectId: string
  openSelect: string | null
  setOpenSelect: (id: string | null) => void
}

const CustomSelect = React.memo<CustomSelectProps>(({
  value,
  onChange,
  options,
  placeholder,
  compact = false,
  disabled = false,
  selectId,
  openSelect,
  setOpenSelect
}) => {
  const isOpen = openSelect === selectId
  const selectedOption = options.find(option => option.value === value)

  const handleToggle = useCallback(() => {
    if (disabled) return
    setOpenSelect(isOpen ? null : selectId)
  }, [disabled, isOpen, selectId, setOpenSelect])

  const handleSelect = useCallback((optionValue: string) => {
    onChange(optionValue)
    setOpenSelect(null)
  }, [onChange, setOpenSelect])

  // Закрываем селект при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest(`[data-select-id="${selectId}"]`)) {
        setOpenSelect(null)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, selectId, setOpenSelect])

  return (
    <div 
      className="relative"
      data-select-id={selectId}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-teal-500 transition-all duration-200 hover:border-gray-300 shadow-sm hover:shadow-md flex items-center justify-between ${
          compact ? 'text-xs' : 'text-sm'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={selectedOption ? 'text-gray-800' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-teal-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {options.map((option) => (
            <SelectOption
              key={option.value}
              option={option}
              isSelected={option.value === value}
              compact={compact}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
})

interface SelectOptionProps {
  option: Option
  isSelected: boolean
  compact: boolean
  onSelect: (value: string) => void
}

const SelectOption = React.memo<SelectOptionProps>(({ option, isSelected, compact, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(option.value)
  }, [option.value, onSelect])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full text-left px-3 py-2 text-sm transition-colors duration-150 hover:bg-teal-50 hover:text-teal-700 ${
        isSelected ? 'bg-teal-100 text-teal-800 font-medium' : 'text-gray-700'
      } ${compact ? 'text-xs' : 'text-sm'}`}
    >
      {option.label}
    </button>
  )
})

SelectOption.displayName = 'SelectOption'
CustomSelect.displayName = 'CustomSelect'

export default CustomSelect
