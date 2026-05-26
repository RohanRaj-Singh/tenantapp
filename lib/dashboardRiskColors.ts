export function getRiskColor(percentage: number): string {
  if (percentage >= 85) return "#22c55e";
  if (percentage >= 70) return "#84cc16";
  if (percentage >= 50) return "#eab308";
  return "#ef4444";
}

export function getRiskLabel(percentage: number): string {
  if (percentage >= 85) return "No Risk";
  if (percentage >= 70) return "Low Risk";
  if (percentage >= 50) return "Medium Risk";
  return "High Risk";
}

export function getRiskBgClass(percentage: number): string {
  if (percentage >= 85) return "bg-green-50";
  if (percentage >= 70) return "bg-lime-50";
  if (percentage >= 50) return "bg-yellow-50";
  return "bg-red-50";
}

export function getRiskTextClass(percentage: number): string {
  if (percentage >= 85) return "text-green-700";
  if (percentage >= 70) return "text-lime-700";
  if (percentage >= 50) return "text-yellow-700";
  return "text-red-700";
}
