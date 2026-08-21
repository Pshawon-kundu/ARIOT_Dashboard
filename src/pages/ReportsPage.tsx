import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  ChevronDown,
  FileDown,
  Flame,
  Lightbulb,
  MapPin,
  RotateCcw,
  Sparkles,
  Target,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { CleaningHeatmap } from '../components/map/CleaningHeatmap'
import { useApp } from '../context/AppContext'
import { coverageWeek, heatZones } from '../data/mockData'

const dateFilters = ['Today', '7 Days', '30 Days', 'Custom']

export function ReportsPage() {
  const { openTaskModal, showToast } = useApp()
  const navigate = useNavigate()
  const [range, setRange] = useState('7 Days')

  const recommendations = [
    {
      icon: <Flame size={16} className="text-warning" />,
      title: 'Main Entrance gets dirty most often between 12 PM and 2 PM.',
      body: 'Consider adding an afternoon cleaning to keep it presentable.',
      action: 'Schedule Cleaning',
      onAction: () => openTaskModal(),
    },
    {
      icon: <Sparkles size={16} className="text-brand" />,
      title: 'Cafeteria required 3 additional spot cleans this week.',
      body: 'A short daily spot clean may reduce repeat requests.',
      action: 'Review Area',
      onAction: () => showToast('info', 'Area review', 'Showing Cafeteria cleaning history.'),
    },
    {
      icon: <MapPin size={16} className="text-danger" />,
      title: 'Level 2 Lobby was missed twice this week.',
      body: 'Check the schedule so this area is cleaned every weekday.',
      action: 'View Cleaning History',
      onAction: () => navigate('/cleaning'),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="See cleaning results and areas that may need more attention"
      >
        <div className="flex gap-2">
          {dateFilters.map((d) => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                range === d
                  ? 'bg-ink text-white'
                  : 'bg-white text-ink-secondary ring-1 ring-line hover:bg-idle-pale'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="relative">
          <CalendarDays
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary"
          />
          <select
            defaultValue="All Robots"
            className="h-10 appearance-none rounded-[10px] border border-line bg-white pl-8 pr-7 text-[13px] font-medium text-ink shadow-card focus:border-brand focus:outline-none"
          >
            <option>All Robots</option>
            <option>CleanBot 01</option>
            <option>CleanBot 02</option>
            <option>CleanBot 03</option>
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
        </div>
      </PageHeader>

      {/* This week summary */}
      <p className="mb-3 text-[15px] font-bold text-ink">This Week</p>
      <div className="grid grid-cols-4 gap-4">
        <ReportStat
          icon={<Target size={20} />}
          tile="bg-brand-pale text-brand"
          label="Average Coverage"
          value="94%"
        />
        <ReportStat
          icon={<MapPin size={20} />}
          tile="bg-success-pale text-success"
          label="Area Cleaned"
          value="72,480 sq.ft"
        />
        <ReportStat
          icon={<Sparkles size={20} />}
          tile="bg-brand-pale text-brand"
          label="Cleaning Jobs"
          value="46"
        />
        <ReportStat
          icon={<Flame size={20} />}
          tile="bg-danger-pale text-danger"
          label="Areas Needing Attention"
          value="4"
        />
      </div>

      {/* Heatmap + coverage chart */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Card className="col-span-2">
          <h2 className="text-[16px] font-bold text-ink">Cleaning Heatmap</h2>
          <p className="mt-0.5 text-[13px] text-ink-secondary">
            See which areas need cleaning most often.
          </p>
          <div className="mt-4">
            <CleaningHeatmap zones={heatZones} />
          </div>
        </Card>

        <Card>
          <h2 className="text-[16px] font-bold text-ink">Coverage Trend</h2>
          <p className="mt-0.5 text-[13px] text-ink-secondary">Last 7 days · {range}</p>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={coverageWeek}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="coverageFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1769E0" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#1769E0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E7ECF3" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#98A2B3' }} axisLine={false} tickLine={false} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 12, fill: '#98A2B3' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Coverage']}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #E7ECF3',
                    boxShadow: '0 4px 12px rgba(19,33,58,0.08)',
                    fontSize: 13,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="coverage"
                  stroke="#1769E0"
                  strokeWidth={2.5}
                  fill="url(#coverageFill)"
                  dot={{ r: 3.5, fill: '#FFFFFF', stroke: '#1769E0', strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-success-pale/70 px-4 py-3">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#18794E]">
              <Sparkles size={14} />
              Weekly average
            </span>
            <span className="text-[15px] font-bold text-[#18794E]">93.6%</span>
          </div>
        </Card>
      </div>

      {/* Recommended actions */}
      <div className="mt-4">
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb size={17} className="text-brand" />
          <h2 className="text-[16px] font-bold text-ink">Recommended Actions</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {recommendations.map((rec, i) => (
            <Card key={i} className="flex flex-col">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app">
                  {rec.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold leading-snug text-ink">{rec.title}</p>
                  <p className="mt-1 text-[12.5px] leading-snug text-ink-secondary">{rec.body}</p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 w-full"
                onClick={rec.onAction}
              >
                {rec.action}
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Completed report */}
      <Card className="mt-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-[17px] font-bold text-ink">Level 1 Daily Cleaning</h2>
              <StatusBadge status="completed" />
            </div>
            <p className="mt-1 text-[13px] text-ink-secondary">
              Robot: <span className="font-semibold text-ink">CleanBot 01</span> · {range} · May 20, 2025
            </p>
          </div>
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              icon={<FileDown size={15} />}
              onClick={() =>
                showToast('info', 'Report downloaded', 'report-level1-daily-clean.pdf (demo)')
              }
            >
              Download Report
            </Button>
            <Button
              variant="secondary"
              icon={<RotateCcw size={15} />}
              onClick={() => openTaskModal('CB01')}
            >
              Schedule Again
            </Button>
            <Button
              onClick={() =>
                showToast('success', 'Report opened', 'Showing the full Level 1 Daily Cleaning report.')
              }
            >
              View Details
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-6 gap-4 border-t border-line pt-5">
          <ReportFact label="Coverage" value="96%" highlight />
          <ReportFact label="Area" value="11,820 sq.ft" />
          <ReportFact label="Duration" value="1h 24m" />
          <ReportFact label="Dirt Hotspots" value="8" />
          <ReportFact label="Missed Areas" value="2" />
          <ReportFact label="Water Used" value="14 L" />
        </div>
      </Card>
    </div>
  )
}

function ReportStat({
  icon,
  tile,
  label,
  value,
}: {
  icon: ReactNode
  tile: string
  label: string
  value: string
}) {
  return (
    <Card className="flex items-center gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tile}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11.5px] font-medium leading-tight text-ink-secondary">{label}</p>
        <p className="mt-0.5 text-[18px] font-bold leading-tight text-ink">{value}</p>
      </div>
    </Card>
  )
}

function ReportFact({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-xl bg-app px-4 py-3">
      <p className="text-[11.5px] font-medium text-ink-secondary">{label}</p>
      <p className={`mt-1 text-[16px] font-bold ${highlight ? 'text-brand-dark' : 'text-ink'}`}>
        {value}
      </p>
    </div>
  )
}
