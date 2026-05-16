import { useState } from 'react'
import { Sparkles, ArrowDown } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import AITextAnalyzer from '../components/attendance/AITextAnalyzer'
import AttendanceForm from '../components/attendance/AttendanceForm'

export default function AIAnalyzerPage() {

  // AITextAnalyzer now directly submits the entries.
  function handleParsed() {
    // No longer needed as we submit directly
  }

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Sparkles size={20} className="text-purple-600" />
            <h1 className="text-lg font-bold text-gray-900">AI Text Analyzer</h1>
          </div>
          <p className="text-sm text-gray-500 ml-8">
            Describe attendance in plain English. OpenAI will extract students, date, periods, and
            category — then pre-fill the form for you.
          </p>
        </div>

        {/* AI Analyzer */}
        <div className="card p-6">
          <AITextAnalyzer onParsed={handleParsed} />
        </div>

        {/* AI Analyzer now handles direct submission, so no form is needed here */}
      </div>
    </AppLayout>
  )
}
