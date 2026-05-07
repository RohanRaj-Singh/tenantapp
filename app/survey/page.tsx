"use client";

import { useState, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoveLeft } from 'lucide-react';
import { RuntimeContext } from '@/runtime/context/RuntimeContext';

export default function SurveyPage() {
  const context = useContext(RuntimeContext);
  const config = context?.config ?? null;
  const router = useRouter();
  const [formData, setFormData] = useState({
    stream: '',
    location: '',
    function: '',
    department: '',
    gender: '',
    age: '',
    seniority: '',
  });

  const attributeTemplate = config?.attributeTemplate;
  const primaryColor = config?.branding?.primaryColor || '#f58220';
  const tenantName = config?.tenant?.name || 'RemedyGCC';

  const streams = attributeTemplate?.streams || [];
  const locations = attributeTemplate?.locations || [];
  const functions = attributeTemplate?.functions || [];
  const departments = attributeTemplate?.departments || [];
  const genders = attributeTemplate?.genders || [];
  const ageGroups = attributeTemplate?.ageGroups || [];
  const seniorityLevels = attributeTemplate?.seniorityLevels || [];

  const selectedStream = streams.find((s) => s.value === formData.stream);
  const selectedFunction = functions.find((f) => f.value === formData.function);
  const availableFunctions = selectedStream
    ? functions.filter((f) => f.streamId === selectedStream.id).map((f) => ({ label: f.label, value: f.value }))
    : [];

  const availableDepartments = selectedStream && selectedFunction
    ? departments.filter((d) => d.streamId === selectedStream.id && d.functionId === selectedFunction.id).map((d) => ({ label: d.label, value: d.value }))
    : [];

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const newState = { ...prev, [field]: value };
      if (field === 'stream') {
        newState.location = '';
        newState.function = '';
        newState.department = '';
      }
      if (field === 'location') {
        newState.function = '';
        newState.department = '';
      }
      if (field === 'function') {
        newState.department = '';
      }
      return newState;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(formData).every((v) => v)) {
      router.push('/survey-questions');
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 pt-20">
      <div className="mb-6 flex w-full items-center justify-between">
        <Link href="/" className="z-10 flex items-center justify-center text-gray-700">
          <MoveLeft className="mx-2 h-4 w-4" />
          Back to Home
        </Link>
      </div>

      <form className="my-4 w-full max-w-2xl space-y-6 rounded-xl bg-white p-6 shadow-lg" onSubmit={handleSubmit}>
        <h1 className="text-2xl font-bold text-gray-800">{tenantName} Wellbeing Survey</h1>

        {/* Step 1: Stream - Always visible */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Stream *</label>
          <select
            value={formData.stream}
            onChange={(e) => handleInputChange('stream', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
            required
          >
            <option value="">Select your stream</option>
            {streams.map((s) => (
              <option key={s.id} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: Location - Visible after stream selected */}
        {formData.stream && (
          <div className="animate-fadeIn">
            <label className="mb-2 block text-sm font-medium text-gray-700">Location *</label>
            <select
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
              required
            >
              <option value="">Select your location</option>
              {locations.map((l) => (
                <option key={l.id} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Step 3: Function - Visible after location selected */}
        {formData.location && (
          <div className="animate-fadeIn">
            <label className="mb-2 block text-sm font-medium text-gray-700">Function *</label>
            <select
              value={formData.function}
              onChange={(e) => handleInputChange('function', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
              required
            >
              <option value="">Select your function</option>
              {availableFunctions.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Step 4: Department - Visible after function selected */}
        {formData.function && (
          <div className="animate-fadeIn">
            <label className="mb-2 block text-sm font-medium text-gray-700">Department *</label>
            <select
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-teal-500 focus:outline-none"
              required
            >
              <option value="">Select your department</option>
              {availableDepartments.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Demographics - Static (always visible) */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Gender *</label>
          <div className="flex flex-wrap gap-2">
            {genders.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => handleInputChange('gender', g)}
                className={`rounded-lg border px-4 py-2 text-center capitalize ${
                  formData.gender === g ? 'border-teal-500 bg-teal-50' : 'border-gray-300'
                }`}
              >
                {g.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Age Group *</label>
          <div className="flex flex-wrap gap-2">
            {ageGroups.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => handleInputChange('age', a)}
                className={`rounded-lg border px-4 py-2 ${
                  formData.age === a ? 'border-teal-500 bg-teal-50' : 'border-gray-300'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Seniority Level *</label>
          <div className="flex flex-wrap gap-2">
            {seniorityLevels.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleInputChange('seniority', s)}
                className={`rounded-lg border px-4 py-2 capitalize ${
                  formData.seniority === s ? 'border-teal-500 bg-teal-50' : 'border-gray-300'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!Object.values(formData).every((v) => v)}
            className="rounded-full px-6 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            Start Survey
          </button>
        </div>
      </form>
    </div>
  );
}