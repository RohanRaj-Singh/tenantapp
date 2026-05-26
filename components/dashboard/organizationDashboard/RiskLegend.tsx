import { Card } from "@/components/ui/card";

interface RiskLegendProps {
  isClinical?: boolean;
}

export function RiskLegend({ isClinical = false }: RiskLegendProps) {
  const risks = [
    { color: "#22c55e", label: "No Risk", range: "85-100%" },
    { color: "#84cc16", label: "Low Risk", range: "70-84%" },
    { color: "#eab308", label: "Medium Risk", range: "50-69%" },
    { color: "#ef4444", label: "High Risk", range: "<50%" },
  ];

  const clinicalRisks = [
    { color: "#22c55e", label: "No Risk", range: "0-3%" },
    { color: "#84cc16", label: "Low Risk", range: "4-6%" },
    { color: "#eab308", label: "Medium Risk", range: "7-10%" },
    { color: "#ef4444", label: "High Risk", range: ">10%" },
  ];

  const data = isClinical ? clinicalRisks : risks;

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Risk Level Legend</h3>
      <div className="space-y-2">
        {data.map((risk) => (
          <div key={risk.label} className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: risk.color }} />
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-900">{risk.label}</p>
              <p className="text-xs text-slate-500">{risk.range}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
