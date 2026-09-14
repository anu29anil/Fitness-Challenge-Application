import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { apiClient } from '@/utils/apiClient';

const labels: Record<string, string> = { running: 'Running', walking: 'Walking', cycling: 'Cycling', swimming: 'Swimming', gym: 'Gym', daily_steps: 'Daily Steps' };
const metric: Record<string, string> = { running: 'Distance (km)', walking: 'Distance (km)', cycling: 'Distance (km)', swimming: 'Duration (minutes)', gym: 'Duration (minutes)', daily_steps: 'Steps' };
const maximums: Record<string, number> = { running: 200, walking: 100, cycling: 500, swimming: 1440, gym: 1440, daily_steps: 100000 };

export const ValidatedRecordActivityPage: React.FC = () => {
  const [type, setType] = useState('running');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [valueError, setValueError] = useState('');
  const [dialog, setDialog] = useState('');
  const wholeNumber = ['swimming', 'gym', 'daily_steps'].includes(type);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setValueError('');
    if (!value.trim()) {
      setValueError(`${metric[type]} is required`);
      return;
    }
    const validFormat = wholeNumber ? /^\d+$/ : /^\d+(\.\d{1,2})?$/;
    if (!validFormat.test(value)) {
      setValueError(wholeNumber ? 'Enter a valid whole number' : 'Enter a valid number with up to 2 decimal places');
      return;
    }
    const numericValue = Number(value);
    if (numericValue <= 0) {
      setDialog('Value must be greater than 0.');
      return;
    }
    if (numericValue > maximums[type]) {
      setDialog(`The maximum allowed for ${labels[type].toLowerCase()} is ${maximums[type].toLocaleString()}.`);
      return;
    }
    setSaving(true);
    try {
      const response = await apiClient.post('/activities', { activity_type: type, value: numericValue, activity_date: `${date}T12:00:00` });
      toast.success(`${response.data.points} points awarded!`);
      setValue('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Could not log activity');
    } finally {
      setSaving(false);
    }
  };

  return <main className="min-h-screen bg-[#fffaf7] py-10">
    <form onSubmit={submit} className="max-w-xl mx-auto space-y-5 rounded-2xl bg-white p-7 shadow">
      <h1 className="text-3xl font-bold">Record activity</h1>
      <p className="text-gray-600">Choose an activity and log its matching metric.</p>
      <select className="w-full rounded-lg border p-3" value={type} onChange={(event) => { setType(event.target.value); setValue(''); setValueError(''); }}>
        {Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
      <Input label={metric[type]} type="text" inputMode="decimal" value={value} onChange={(event) => { setValue(event.target.value); setValueError(''); }} error={valueError} helperText={`Maximum: ${maximums[type].toLocaleString()}${type === 'daily_steps' ? ' steps' : ''}`} aria-required="true" />
      <Input label="Activity date" type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} required />
      <div className="flex justify-center">
        <Button type="submit" variant="secondary" size="md" className="!rounded-lg !bg-orange-500 !px-6 !py-2 !text-white hover:!bg-orange-600" isLoading={saving}>Save Activity</Button>
      </div>
    </form>
    {dialog && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="alertdialog" aria-modal="true" aria-labelledby="validation-title">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-2xl font-bold text-orange-600">!</div>
        <h2 id="validation-title" className="mt-4 text-xl font-bold text-gray-900">Check your value</h2>
        <p className="mt-2 text-gray-600">{dialog}</p>
        <Button type="button" className="mx-auto mt-5" onClick={() => setDialog('')}>OK</Button>
      </div>
    </div>}
  </main>;
};
