export type AnalysisStatus = "pending" | "processing" | "completed" | "failed";

export interface FarmLocation {
  latitude: number;
  longitude: number;
  address?: string | null;
  geo_address?: string | null;
}

export interface FarmLandSize {
  value: number;
  unit: "acres" | "hectares";
}

export interface FarmBudget {
  amount: number;
  currency: string;
}

export interface WeatherAnalysis {
  status: AnalysisStatus;
  average_temperature: number | null;
  total_precipitation: number | null;
  average_humidity: number | null;
  average_wind_speed: number | null;
  seasonal_pattern: string | null;
  analyzed_at: string | null;
  error: string | null;
}

export interface Recommendations {
  status: AnalysisStatus;
  suggested_crops: string[];
  farming_techniques: string[];
  required_services: string[];
  report: string | null;
  generated_at: string | null;
  error: string | null;
}

export interface Farm {
  id: string;
  user_id: string;
  name: string;
  location: FarmLocation;
  land_size: FarmLandSize;
  budget: FarmBudget;
  weather_analysis: WeatherAnalysis;
  recommendations: Recommendations;
  created_at: string;
  updated_at: string;
}

export interface CreateFarmRequest {
  name: string;
  location: FarmLocation;
  land_size: FarmLandSize;
  budget: FarmBudget;
}

export interface AnalysisStatusResponse {
  farm_id: string;
  weather_analysis: WeatherAnalysis;
  recommendations: Recommendations;
}

export interface ChatMessage {
  id: string;
  farm_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ChatHistoryResponse {
  farm_id: string;
  messages: ChatMessage[];
}