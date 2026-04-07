"use client";

import { useState } from "react";
import { useRecommendations } from "@/hooks/use-recommendations";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  Lightbulb,
  Target,
  PiggyBank,
  DollarSign,
} from "lucide-react";
import { Recommendation } from "@/lib/api";

export default function RecommendationsPage() {
  const {
    recommendations,
    isLoading,
    error,
    generateRecommendations,
    dismissRecommendation,
    implementRecommendation,
    snoozeRecommendation,
  } = useRecommendations();
  const [generating, setGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateRecommendations();
    } catch {
      // Error handling is done in the hook
    } finally {
      setGenerating(false);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await dismissRecommendation(id);
    } catch (error) {
      console.error("Failed to dismiss recommendation:", error);
    }
  };

  const handleImplement = async (id: string) => {
    try {
      await implementRecommendation(id);
    } catch (error) {
      console.error("Failed to implement recommendation:", error);
    }
  };

  const handleSnooze = async (id: string, days: number = 7) => {
    try {
      await snoozeRecommendation(id, days);
    } catch (error) {
      console.error("Failed to snooze recommendation:", error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "budget":
        return <DollarSign className="h-4 w-4" />;
      case "goals":
        return <Target className="h-4 w-4" />;
      case "savings":
        return <PiggyBank className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case "high":
        return "text-red-600 bg-red-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      case "low":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const parseActionSteps = (jsonString?: string): string[] => {
    if (!jsonString) return [];
    try {
      return JSON.parse(jsonString);
    } catch {
      return [];
    }
  };

  // Filter recommendations by selected category
  const filteredRecommendations = selectedCategory
    ? recommendations.filter(
        (r) => r.category.toLowerCase() === selectedCategory.toLowerCase(),
      )
    : recommendations;

  // Group recommendations by impact
  const highImpact = filteredRecommendations.filter(
    (r) => r.impact.toLowerCase() === "high",
  );
  const mediumImpact = filteredRecommendations.filter(
    (r) => r.impact.toLowerCase() === "medium",
  );
  const lowImpact = filteredRecommendations.filter(
    (r) => r.impact.toLowerCase() === "low",
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recommendations</h1>
          <p className="text-gray-600 mt-1">
            Actionable insights to improve your financial health
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          {generating ? "Generating..." : "Generate New Recommendations"}
        </Button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All
        </Button>
        <Button
          variant={selectedCategory === "budget" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("budget")}
          className="flex items-center gap-2"
        >
          <DollarSign className="h-4 w-4" />
          Budget
        </Button>
        <Button
          variant={selectedCategory === "goals" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("goals")}
          className="flex items-center gap-2"
        >
          <Target className="h-4 w-4" />
          Goals
        </Button>
        <Button
          variant={selectedCategory === "savings" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory("savings")}
          className="flex items-center gap-2"
        >
          <PiggyBank className="h-4 w-4" />
          Savings
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              High Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {highImpact.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Urgent actions needed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Medium Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {mediumImpact.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Consider these soon</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Low Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {lowImpact.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Nice to have</p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations List */}
      {filteredRecommendations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              All caught up!
            </h3>
            <p className="text-gray-600 text-center max-w-md">
              You don&apos;t have any active recommendations right now. Click
              &quot;Generate New Recommendations&quot; to check for new
              insights.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRecommendations.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onDismiss={handleDismiss}
              onImplement={handleImplement}
              onSnooze={handleSnooze}
              getCategoryIcon={getCategoryIcon}
              getImpactColor={getImpactColor}
              parseActionSteps={parseActionSteps}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onDismiss: (id: string) => void;
  onImplement: (id: string) => void;
  onSnooze: (id: string, days: number) => void;
  getCategoryIcon: (category: string) => JSX.Element;
  getImpactColor: (impact: string) => string;
  parseActionSteps: (jsonString?: string) => string[];
}

function RecommendationCard({
  recommendation,
  onDismiss,
  onImplement,
  onSnooze,
  getCategoryIcon,
  getImpactColor,
  parseActionSteps,
}: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const actionSteps = parseActionSteps(recommendation.action_steps);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="flex items-center gap-1">
                {getCategoryIcon(recommendation.category)}
                {recommendation.category}
              </Badge>
              <Badge className={getImpactColor(recommendation.impact)}>
                {recommendation.impact} Impact
              </Badge>
              {recommendation.estimated_time_to_impact && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {recommendation.estimated_time_to_impact}
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl">{recommendation.title}</CardTitle>
            <CardDescription className="mt-2">
              {recommendation.description}
            </CardDescription>
            {recommendation.potential_savings && (
              <div className="flex items-center gap-2 mt-3">
                <TrendingDown className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  Potential savings: ₹
                  {recommendation.potential_savings.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Action Steps (Expandable) */}
      {actionSteps.length > 0 && (
        <CardContent className="pt-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 mb-2"
          >
            {expanded ? (
              <>
                <EyeOff className="h-4 w-4" />
                Hide action steps
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Show action steps ({actionSteps.length})
              </>
            )}
          </Button>
          {expanded && (
            <ul className="space-y-2 mt-3 ml-4">
              {actionSteps.map((step, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      )}

      {/* Actions */}
      <CardContent className="pt-0 flex gap-2">
        <Button
          size="sm"
          onClick={() => onImplement(recommendation.id)}
          className="flex items-center gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Implement
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onSnooze(recommendation.id, 7)}
          className="flex items-center gap-2"
        >
          <Clock className="h-4 w-4" />
          Snooze (7 days)
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDismiss(recommendation.id)}
          className="flex items-center gap-2 ml-auto"
        >
          <X className="h-4 w-4" />
          Dismiss
        </Button>
      </CardContent>
    </Card>
  );
}
