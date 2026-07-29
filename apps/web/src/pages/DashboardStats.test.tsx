import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithQuery } from "../test/render-with-query";
import { api } from "../lib/api";
import { DashboardStats } from "./DashboardStats";

vi.mock("../lib/api", () => ({
  api: { get: vi.fn() },
}));

function buildDailyVolume(counts: number[] = Array(30).fill(0)) {
  return counts.map((count, i) => {
    const date = new Date("2026-07-01T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + i);
    return { date: date.toISOString().slice(0, 10), count };
  });
}

describe("DashboardStats", () => {
  afterEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("shows skeletons while the request is pending", () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    const { container } = renderWithQuery(<DashboardStats />);

    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("renders the five stat values once the request resolves", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        total: 42,
        open: 7,
        aiResolved: 30,
        aiResolvedPercent: 71.42857,
        avgResolutionMs: 5 * 60 * 60 * 1000,
        dailyVolume: buildDailyVolume(),
      },
    });

    renderWithQuery(<DashboardStats />);

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("71.4%")).toBeInTheDocument();
    expect(screen.getByText("5h")).toBeInTheDocument();
  });

  it('renders an em dash for avg resolution time when there are no resolved tickets', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        total: 0,
        open: 0,
        aiResolved: 0,
        aiResolvedPercent: 0,
        avgResolutionMs: null,
        dailyVolume: buildDailyVolume(),
      },
    });

    renderWithQuery(<DashboardStats />);

    expect(await screen.findByText("—")).toBeInTheDocument();
  });

  it("shows an error alert when the request fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("network error"));

    renderWithQuery(<DashboardStats />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch dashboard stats")).toBeInTheDocument();
    });
  });

  it("renders a bar per day with an accessible label for its count", async () => {
    const counts = Array(30).fill(0);
    counts[0] = 3;
    counts[29] = 9;

    vi.mocked(api.get).mockResolvedValue({
      data: {
        total: 12,
        open: 12,
        aiResolved: 0,
        aiResolvedPercent: 0,
        avgResolutionMs: null,
        dailyVolume: buildDailyVolume(counts),
      },
    });

    renderWithQuery(<DashboardStats />);

    expect(await screen.findByText("Tickets per day (last 30 days)")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(30);
    expect(screen.getByRole("button", { name: "3 tickets on Jul 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "9 tickets on Jul 30" })).toBeInTheDocument();
  });
});
