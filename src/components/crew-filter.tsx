import type { Group } from '@/lib/domain';

export function CrewFilter({ groups, value, showUngrouped, onChange }: {
  groups: Group[];
  value: string;
  showUngrouped: boolean;
  onChange: (value: string) => void;
}) {
  return <section className="crew-filter" aria-label="סינון לפי חבורה">
    <span className="crew-filter-label">הנתונים של</span>
    <div className="crew-filter-options">
      {groups.map(group => <button key={group.id} className={`crew-filter-option ${value === group.id ? 'selected' : ''}`} aria-pressed={value === group.id} onClick={() => onChange(group.id)}>
        <b>{group.name.trim().slice(0, 1)}</b><span>{group.name}</span>
      </button>)}
      {showUngrouped && <button className={`crew-filter-option ${value === 'ungrouped' ? 'selected' : ''}`} aria-pressed={value === 'ungrouped'} onClick={() => onChange('ungrouped')}>
        <b>א</b><span>ערבים אחרים</span>
      </button>}
      <button className={`crew-filter-option ${value === 'all' ? 'selected' : ''}`} aria-pressed={value === 'all'} onClick={() => onChange('all')}>
        <b>∞</b><span>הכול</span>
      </button>
    </div>
  </section>;
}
