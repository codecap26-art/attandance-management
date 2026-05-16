/**
 * Multi-select period picker (periods 1–7).
 */
export default function PeriodSelector({ selected = [], onChange }) {
  const PERIODS = [1, 2, 3, 4, 5, 6, 7]

  function toggle(p) {
    if (selected.includes(p)) {
      onChange(selected.filter(x => x !== p))
    } else {
      onChange([...selected, p].sort((a, b) => a - b))
    }
  }

  function selectAll() {
    onChange([...PERIODS])
  }

  function clearAll() {
    onChange([])
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PERIODS.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => toggle(p)}
            className={`w-10 h-10 rounded-lg text-sm font-semibold border-2 transition-colors ${
              selected.includes(p)
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-600'
            }`}
            aria-pressed={selected.includes(p)}
            aria-label={`Period ${p}`}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={selectAll}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Clear
        </button>
        {selected.length > 0 && (
          <span className="text-xs text-gray-500 ml-auto">
            {selected.length} period{selected.length !== 1 ? 's' : ''} selected
          </span>
        )}
      </div>
    </div>
  )
}
