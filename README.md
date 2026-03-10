# ChiMetrics

A live civic data dashboard for Chicago, built with React and powered by the [Chicago Open Data Portal](https://data.cityofchicago.org).

**Live demo:** https://chi-metrics.vercel.app

---

## What It Shows

- **Crime** — monthly trends, top crime types, breakdown by community area
- **Transit** — CTA train vs bus ridership, busiest stations ranked
- **Cameras** — red light and speed camera violations over time, worst intersections
- **311** — service request types and requests by ward

---

## Tech Stack

- React + Vite
- Recharts
- Chicago Open Data Portal (Socrata API)
- Deployed on Vercel

---

## Data Sources

All data is free and public via the Socrata API:

| Dataset | Refresh Rate |
|---|---|
| Crime Reports | Daily |
| CTA Train Ridership | Monthly |
| CTA Bus Ridership | Monthly |
| Red Light Camera Violations | Weekly |
| Speed Camera Violations | Weekly |
| 311 Service Requests | Daily |

---

## Background

This project started as a C++ program analyzing Chicago red light camera data. After building tooling to parse and query that dataset locally, the next step was turning it into a live, shareable dashboard — pulling from the same data source but now visualized in real time across crime, transit, cameras, and city service requests.

---

## Run Locally

```bash
git clone https://github.com/davina-titus/ChiMetrics.git
cd ChiMetrics
npm install
npm run dev
```

---

