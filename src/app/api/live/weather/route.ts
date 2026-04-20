import { NextResponse } from "next/server"

export const revalidate = 900 // cache 15 minutes — weather doesn't change that fast

// Nairobi coordinates
const LAT = -1.2921
const LON = 36.8219

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Icy fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow",
  75: "Heavy snow", 80: "Rain showers", 81: "Rain showers", 82: "Violent showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail",
}

export async function GET() {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast")
    url.searchParams.set("latitude", String(LAT))
    url.searchParams.set("longitude", String(LON))
    url.searchParams.set("current", "temperature_2m,precipitation,weathercode,windspeed_10m,relativehumidity_2m")
    url.searchParams.set("daily", "precipitation_sum,temperature_2m_max,temperature_2m_min,weathercode")
    url.searchParams.set("timezone", "Africa/Nairobi")
    url.searchParams.set("forecast_days", "5")

    const res = await fetch(url.toString(), { next: { revalidate: 900 } })
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`)
    const data = await res.json()

    const cur = data.current ?? {}
    const daily = data.daily ?? {}

    return NextResponse.json({
      city: "Nairobi",
      current: {
        temp: cur.temperature_2m ?? 0,
        precip: cur.precipitation ?? 0,
        weatherCode: cur.weathercode ?? 0,
        description: WMO_DESCRIPTIONS[cur.weathercode ?? 0] ?? "Unknown",
        windspeed: cur.windspeed_10m ?? 0,
        humidity: cur.relativehumidity_2m ?? 0,
      },
      forecast: (daily.time ?? []).map((date: string, i: number) => ({
        date,
        precipSum: daily.precipitation_sum?.[i] ?? 0,
        tempMax: daily.temperature_2m_max?.[i] ?? 0,
        tempMin: daily.temperature_2m_min?.[i] ?? 0,
        weatherCode: daily.weathercode?.[i] ?? 0,
        description: WMO_DESCRIPTIONS[daily.weathercode?.[i] ?? 0] ?? "Unknown",
      })),
      updatedAt: Date.now(),
    })
  } catch (err) {
    console.error("[/api/live/weather]", err)
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 })
  }
}
